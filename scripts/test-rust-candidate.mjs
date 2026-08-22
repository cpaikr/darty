#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { request as httpRequest } from "node:http";
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const temporaryRoot = mkdtempSync(join(tmpdir(), "darty-rust-candidate-"));
const fixtureChildren = new Set();

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    env: options.env ?? process.env,
    timeout: options.timeout ?? 30_000,
    shell: false,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.signal, null, `unexpected signal ${result.signal}`);
  assert.equal(
    result.status,
    options.exitCode ?? 0,
    `unexpected exit ${result.status}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  return result;
};

const waitForFile = async (path) => {
  const deadline = Date.now() + 5_000;
  while (!existsSync(path) && Date.now() < deadline) {
    await new Promise((resolveWait) => setTimeout(resolveWait, 10));
  }
  assert.ok(existsSync(path), `fixture server did not create ${path}`);
};

const startFixture = async (name, delay = 0) => {
  const readyPath = join(temporaryRoot, `${name}-origin`);
  const child = spawn(process.execPath, [join(scriptDir, "serve-dart-fixture.mjs"), readyPath], {
    cwd: repoRoot,
    stdio: "ignore",
    env: { ...process.env, DARTY_FIXTURE_DELAY_MS: String(delay) },
  });
  fixtureChildren.add(child);
  await waitForFile(readyPath);
  return { child, origin: readFileSync(readyPath, "utf8") };
};

const stopFixture = async (child) => {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((resolveExit) => child.once("exit", resolveExit));
  fixtureChildren.delete(child);
};

const fixtureForm = (fields) => {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      for (const item of value) form.append(key, item);
    } else {
      form.append(key, value);
    }
  }
  return form;
};

const rawRequestStatus = (url, body) =>
  new Promise((resolveStatus, rejectRequest) => {
    const request = httpRequest(
      url,
      {
        method: "GET",
        headers: {
          "content-length": Buffer.byteLength(body),
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "user-agent": "darty-candidate-acceptance",
        },
      },
      (response) => {
        response.resume();
        response.once("end", () => resolveStatus(response.statusCode));
      },
    );
    request.once("error", rejectRequest);
    request.end(body);
  });

try {
  const cliArtifact = join(repoRoot, "target/release/darty");
  const addonArtifact = join(repoRoot, "target/release/libdarty_node.dylib");
  assert.ok(existsSync(cliArtifact), "build the release darty CLI first");
  assert.ok(existsSync(addonArtifact), "build the release darty-node addon first");

  const generatedFacade = join(temporaryRoot, "generated-facade");
  run(
    join(repoRoot, "node_modules/.bin/tsc"),
    ["-p", join(repoRoot, "candidate/npm/darty/tsconfig.json"), "--outDir", generatedFacade],
  );
  for (const generatedFile of ["index.js", "index.d.ts"]) {
    assert.equal(
      readFileSync(join(repoRoot, "candidate/npm/darty", generatedFile), "utf8"),
      readFileSync(join(generatedFacade, generatedFile), "utf8"),
      `${generatedFile} must be fresh from the typed facade source`,
    );
  }

  const stageRoot = join(temporaryRoot, "stage");
  const rootPackage = join(stageRoot, "darty");
  const nativePackage = join(stageRoot, "darty-darwin-arm64");
  cpSync(join(repoRoot, "candidate/npm/darty"), rootPackage, { recursive: true });
  cpSync(join(repoRoot, "candidate/npm/darty-darwin-arm64"), nativePackage, {
    recursive: true,
  });
  copyFileSync(cliArtifact, join(nativePackage, "darty"));
  chmodSync(join(nativePackage, "darty"), 0o755);
  copyFileSync(addonArtifact, join(nativePackage, "darty.node"));

  const tarballs = join(temporaryRoot, "tarballs");
  mkdirSync(tarballs);
  const nativePack = JSON.parse(
    run("npm", ["pack", nativePackage, "--json", "--pack-destination", tarballs]).stdout,
  )[0];
  const rootPack = JSON.parse(
    run("npm", ["pack", rootPackage, "--json", "--pack-destination", tarballs]).stdout,
  )[0];
  const nativeFiles = nativePack.files.map(({ path }) => path).sort();
  assert.deepEqual(nativeFiles, ["LICENSE.md", "darty", "darty.node", "package.json"]);
  const rootFiles = rootPack.files.map(({ path }) => path).sort();
  assert.deepEqual(rootFiles, [
    "LICENSE.md",
    "bin/darty.js",
    "index.d.ts",
    "index.js",
    "native.js",
    "package.json",
  ]);

  const consumer = join(temporaryRoot, "consumer");
  mkdirSync(consumer);
  writeFileSync(
    join(temporaryRoot, "consumer-package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  cpSync(join(temporaryRoot, "consumer-package.json"), join(consumer, "package.json"));
  run(
    "npm",
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      join(tarballs, nativePack.filename),
      join(tarballs, rootPack.filename),
    ],
    { cwd: consumer },
  );

  const packageRoot = join(consumer, "node_modules/@sjunepark/darty");
  const sdk = await import(pathToFileURL(join(packageRoot, "index.js")));
  assert.deepEqual(Object.keys(sdk).sort(), ["DartyClient", "DartyError"]);
  assert.deepEqual(Object.getOwnPropertyNames(sdk.DartyClient.prototype).sort(), [
    "constructor",
    "searchCompany",
    "searchCompanyReports",
    "viewReport",
  ]);

  const declarations = readFileSync(join(packageRoot, "index.d.ts"), "utf8");
  const declaredMethods = [
    ...declarations.matchAll(/^\s+(searchCompany(?:Reports)?|viewReport)\(/gm),
  ]
    .map((match) => match[1])
    .sort();
  assert.deepEqual(declaredMethods, ["searchCompany", "searchCompanyReports", "viewReport"]);
  writeFileSync(
    join(consumer, "consumer.ts"),
    `import { DartyClient, DartyError } from "@sjunepark/darty";\nconst client = new DartyClient();\nconst typedError = new DartyError({ code: "invalid_request", message: "invalid", retryable: false, parameter: "companyName" });\nconst companyCode: Promise<string> = client.searchCompany({ companyName: "가람" }).then((response) => response.result.items[0]!.companyCode);\nconst reports = client.searchCompanyReports({ companyCode: "00000001", startDate: "20250101", endDate: "20260101" });\nconst report = client.viewReport({ receipt: "20260101000001", sectionId: "section:1.1" }, { signal: new AbortController().signal });\nvoid [companyCode, reports, report, typedError];\n`,
  );
  run(
    join(repoRoot, "node_modules/.bin/tsc"),
    [
      "--noEmit",
      "--strict",
      "--target",
      "ES2022",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      "consumer.ts",
    ],
    { cwd: consumer },
  );

  const fixture = await startFixture("normal");
  const fixtureManifest = JSON.parse(
    readFileSync(join(repoRoot, "fixtures/dart/vertical-v1/manifest.json"), "utf8"),
  );
  const companyFixture = fixtureManifest.cases.find(({ id }) => id === "company-populated");
  const unexpectedQueryUrl = new URL(companyFixture.request.path, fixture.origin);
  unexpectedQueryUrl.searchParams.set("unexpected", "1");
  const unexpectedQueryResponse = await fetch(unexpectedQueryUrl, {
    method: companyFixture.request.method,
    headers: companyFixture.request.headers,
    body: fixtureForm(companyFixture.request.form),
  });
  assert.equal(
    unexpectedQueryResponse.status,
    404,
    "form fixtures must reject unexpected query parameters",
  );
  assert.equal(
    await rawRequestStatus(
      new URL("/dsaf001/main.do?rcpNo=20260101000001", fixture.origin),
      "unexpected=1",
    ),
    404,
    "query fixtures must reject unexpected request bodies",
  );
  process.env.DARTY_FIXTURE_ORIGIN = fixture.origin;
  process.env.DARTY_FIXTURE_FETCHED_AT = "2026-08-22T00:00:00.000Z";
  const client = new sdk.DartyClient();
  const pending = client.searchCompany({ companyName: "가람" });
  assert.ok(pending instanceof Promise, "Node SDK operation must return a Promise");
  const companies = await pending;
  assert.equal(companies.result.items[0].companyCode, "00000001");
  const reports = await client.searchCompanyReports({
    companyCode: "00000001",
    startDate: "20250101",
    endDate: "20260101",
  });
  assert.equal(reports.result.company.companyCode, "00000001");
  assert.equal(reports.result.items[0].filing.receiptNumber, "20260101000001");
  assert.equal(reports.result.items[0].filing.reportTitle, "[기재정정] 사업보고서");
  const section = await client.viewReport({
    receipt: "20260101000001",
    sectionId: "section:1.1",
  });
  assert.equal(section.result.receipt.receiptNumber, "20260101000001");
  assert.equal(section.result.content.section.id, "section:1.1");
  assert.equal(section.result.content.format, "markdown");
  assert.match(section.result.content.body, /CP949 확장 음절 갂/);
  const pacedClient = new sdk.DartyClient();
  const pacedAt = Date.now();
  await Promise.all([
    pacedClient.searchCompany({ companyName: "가람" }),
    pacedClient.searchCompany({ companyName: "가람" }),
  ]);
  assert.ok(
    Date.now() - pacedAt >= 220,
    "one Node client must retain the Rust SDK's shared request gate",
  );
  await assert.rejects(
    client.searchCompany({ companyName: "x" }),
    (error) =>
      error instanceof sdk.DartyError &&
      error.code === "invalid_request" &&
      error.parameter === "companyName" &&
      error.retryable === false,
  );

  const launcher = join(consumer, "node_modules/.bin/darty");
  const launched = run(
    launcher,
    ["search-company", "--company-name", "가람", "--agent"],
    {
      cwd: consumer,
      env: {
        ...process.env,
        DARTY_FIXTURE_ORIGIN: fixture.origin,
        DARTY_FIXTURE_FETCHED_AT: "2026-08-22T00:00:00.000Z",
      },
    },
  );
  assert.equal(launched.stderr, "");
  assert.ok(launched.stdout.endsWith("\n") && !launched.stdout.endsWith("\n\n"));
  assert.equal(JSON.parse(launched.stdout).metadata.output, "agent");
  await stopFixture(fixture.child);

  const delayedFixture = await startFixture("delayed", 5_000);
  process.env.DARTY_FIXTURE_ORIGIN = delayedFixture.origin;
  const delayedClient = new sdk.DartyClient();
  const controller = new AbortController();
  const startedAt = Date.now();
  const cancelled = delayedClient.searchCompany(
    { companyName: "가람" },
    { signal: controller.signal },
  );
  controller.abort();
  await assert.rejects(
    cancelled,
    (error) => error.name === "AbortError" && error.code === "ABORT_ERR",
  );
  assert.ok(Date.now() - startedAt < 1_000, "cancellation must promptly drop native work");
  await stopFixture(delayedFixture.child);

  const installedNative = join(
    consumer,
    "node_modules/@sjunepark/darty-darwin-arm64/darty",
  );
  const forwardedPath = join(temporaryRoot, "forwarded-argv.json");
  writeFileSync(
    installedNative,
    `#!/bin/sh\nnode -e 'require("node:fs").writeFileSync(process.env.FORWARDED_PATH, JSON.stringify(process.argv.slice(1)))' -- "$@"\nprintf 'forwarded stdout\\n'\nprintf 'forwarded stderr\\n' >&2\nexit 7\n`,
  );
  chmodSync(installedNative, 0o755);
  const forwarded = run(launcher, ["--literal", "a b", "한글", "--flag=value"], {
    cwd: consumer,
    env: { ...process.env, FORWARDED_PATH: forwardedPath },
    exitCode: 7,
  });
  assert.equal(forwarded.stdout, "forwarded stdout\n");
  assert.equal(forwarded.stderr, "forwarded stderr\n");
  assert.deepEqual(JSON.parse(readFileSync(forwardedPath, "utf8")), [
    "--literal",
    "a b",
    "한글",
    "--flag=value",
  ]);

  console.log("Rust candidate packaged-consumer validation passed.");
} finally {
  for (const child of fixtureChildren) child.kill("SIGKILL");
  rmSync(temporaryRoot, { recursive: true, force: true });
}
