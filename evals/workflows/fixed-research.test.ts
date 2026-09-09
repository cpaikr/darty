import { expect, test } from "bun:test";
import { mkdtemp, writeFile, readFile, chmod, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

test.each([false, true])("fixed comparison deduplicates empty TOCs and fails closed on source errors (failure=%s)", async (sourceFailure) => {
  const directory = await mkdtemp(join(tmpdir(), "darty-fixed-research-"));
  const executable = join(directory, "darty");
  const visits = join(directory, "visits.jsonl");
  try {
    await writeFile(executable, `#!${process.execPath}
import {appendFileSync} from 'node:fs';
const argv=process.argv.slice(2), option=(key)=>argv[argv.indexOf(key)+1];
let result;
if(argv[0]==='search-company') result={items:[{companyName:'삼성전자',companyCode:'00126380'}]};
if(argv[0]==='search-company-reports') {
 const narrowed=['A001','A002','A003'].every(code=>argv.some((v,i)=>v==='--disclosure-type'&&argv[i+1]===code));
 const empty={companyCode:'00126380',receiptNumber:'20260102000003',receiptDate:'2026-01-02',reportTitle:'사업보고서'};
 result={request:{companyCode:'00126380',startDate:'20250331',endDate:'20260331'},items:narrowed?[
  empty,empty,
  {companyCode:'00126380',receiptNumber:'20260101000001',receiptDate:'2026-01-01',reportTitle:'사업보고서'},
  {companyCode:'00126380',receiptNumber:'20251001000002',receiptDate:'2025-10-01',reportTitle:'분기보고서'}
 ]:[{companyCode:'00126380',receiptNumber:'20260102000003',receiptDate:'2026-01-02',reportTitle:'임원보유상황보고서'}]};
}
if(argv[0]==='view-report') {
 const receipt=option('--receipt');
 appendFileSync(${JSON.stringify(visits)},JSON.stringify({receipt})+'\\n');
 if(receipt==='20260102000003'&&${sourceFailure}) {console.log(JSON.stringify({error:{code:'source_changed'}}));process.exit(1);}
 result={receipt:{receiptNumber:receipt},document:{id:'document:body:1'},toc:receipt==='20260102000003'?[]:[{id:'section:1',title:receipt==='20260101000001'?'Annual cover':'Quarterly cover'},{id:'section:2',title:'I. 회사의 개요'}],...(argv.includes('--section-id')?{content:{scope:'section',section:{id:option('--section-id'),title:option('--section-id')==='section:2'?'I. 회사의 개요':'Unmatched cover'},body:'Fictional company overview.',window:{startByte:0,endByte:27,hasMore:false}}}:{})};
}
console.log(JSON.stringify({result}));
`);
    await chmod(executable, 0o755);
    const moduleUrl = new URL("./fixed-research.ts", import.meta.url).href;
    const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
    const processRun = Bun.spawn([process.execPath, "--eval", `import {runFixedResearchChecks} from ${JSON.stringify(moduleUrl)}; await runFixedResearchChecks(${JSON.stringify(repoRoot)});`], { cwd: directory, env: { ...process.env, DARTY_CLI: executable }, stdout: "pipe", stderr: "pipe" });
    const [stdout, stderr, exit] = await Promise.all([new Response(processRun.stdout).text(), new Response(processRun.stderr).text(), processRun.exited]);
    const inspections = (await readFile(visits, "utf8")).trim().split("\n").map(line => JSON.parse(line) as { receipt: string });
    expect(inspections.filter(item => item.receipt === "20260102000003")).toHaveLength(1);
    if (sourceFailure) {
      expect(exit).not.toBe(0);
      expect(stderr).toContain("fixed research command view-report exited 1");
      expect(stdout).not.toContain("✓ fixed");
      expect(inspections).toHaveLength(1);
    } else {
      expect(stderr).toBe("");
      expect(exit).toBe(0);
      expect(stdout).toContain("fixed exact-section-citation");
      expect(stdout).toContain("fixed related-filings-comparison");
      expect(stdout).toContain('"provenance":true,"membership":true');
      expect(stdout).toContain('"sectionId":"section:2"');
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
