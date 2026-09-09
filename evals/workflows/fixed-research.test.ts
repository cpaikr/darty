import { expect, test } from "bun:test";
import { mkdtemp, writeFile, chmod, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("fixed comparison narrows unrelated filings and intersects TOCs with different cover titles", async () => {
  const directory = await mkdtemp(join(tmpdir(), "darty-fixed-research-"));
  const executable = join(directory, "darty");
  try {
    await writeFile(executable, `#!${process.execPath}
const argv=process.argv.slice(2), option=(key)=>argv[argv.indexOf(key)+1];
let result;
if(argv[0]==='search-company') result={items:[{companyName:'삼성전자',companyCode:'00126380'}]};
if(argv[0]==='search-company-reports') {
 const narrowed=['A001','A002','A003'].every(code=>argv.some((v,i)=>v==='--disclosure-type'&&argv[i+1]===code));
 result={request:{companyCode:'00126380',startDate:'20250331',endDate:'20260331'},items:narrowed?[
  {companyCode:'00126380',receiptNumber:'20260101000001',receiptDate:'2026-01-01',reportTitle:'사업보고서'},
  {companyCode:'00126380',receiptNumber:'20251001000002',receiptDate:'2025-10-01',reportTitle:'분기보고서'}
 ]:[{companyCode:'00126380',receiptNumber:'20260102000003',receiptDate:'2026-01-02',reportTitle:'임원보유상황보고서'}]};
}
if(argv[0]==='view-report') result={receipt:{receiptNumber:option('--receipt')},document:{id:'document:body:1'},toc:[{id:'section:1',title:option('--receipt')==='20260101000001'?'Annual cover':'Quarterly cover'},{id:'section:2',title:'I. 회사의 개요'}],...(argv.includes('--section-id')?{content:{scope:'section',section:{id:option('--section-id'),title:option('--section-id')==='section:2'?'I. 회사의 개요':'Unmatched cover'},body:'Fictional company overview.',window:{startByte:0,endByte:27,hasMore:false}}}:{})};
console.log(JSON.stringify({result}));
`);
    await chmod(executable, 0o755);
    const processRun = Bun.spawn([process.execPath, "--eval", 'import {runFixedResearchChecks} from "./evals/workflows/fixed-research.ts"; await runFixedResearchChecks(process.cwd());'], { env: { ...process.env, DARTY_CLI: executable }, stdout: "pipe", stderr: "pipe" });
    const [stdout, stderr, exit] = await Promise.all([new Response(processRun.stdout).text(), new Response(processRun.stderr).text(), processRun.exited]);
    expect(stderr).toBe("");
    expect(exit).toBe(0);
    expect(stdout).toContain("fixed exact-section-citation");
    expect(stdout).toContain("fixed related-filings-comparison");
    expect(stdout).toContain('"provenance":true,"membership":true');
    expect(stdout).toContain('"sectionId":"section:2"');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
