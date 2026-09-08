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

const startFixture = async (name, delay = 0, options = {}) => {
  const readyPath = join(temporaryRoot, `${name}-origin`);
  const requestMarker = join(temporaryRoot, `${name}-requests`);
  const child = spawn(process.execPath, [join(scriptDir, "serve-dart-fixture.mjs"), readyPath], {
    cwd: repoRoot,
    stdio: "ignore",
    env: {
      ...process.env,
      DARTY_FIXTURE_DELAY_MS: String(delay),
      ...(options.firstDelay === undefined
        ? {}
        : { DARTY_FIXTURE_DELAY_FIRST_MS: String(options.firstDelay) }),
      DARTY_FIXTURE_REQUEST_MARKER: requestMarker,
    },
  });
  fixtureChildren.add(child);
  await waitForFile(readyPath);
  return { child, origin: readFileSync(readyPath, "utf8"), requestMarker };
};

const waitForRequest = async (path, expectedCount) => {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (existsSync(path) && Number.parseInt(readFileSync(path, "utf8"), 10) >= expectedCount) {
      return;
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 10));
  }
  assert.fail(`fixture did not observe request ${expectedCount}`);
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

const assertExactKeys = (value, expected, label) => {
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), `${label} keys`);
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

const rawFormRequestStatus = (url, body, headers = {}) =>
  new Promise((resolveStatus, rejectRequest) => {
    const request = httpRequest(
      url,
      {
        method: "POST",
        headers: {
          "content-length": Buffer.byteLength(body),
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          ...headers,
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
  const productionCliArtifact = join(repoRoot, "target/release/darty");
  const productionAddonArtifact = join(repoRoot, "target/release/libdarty_node.dylib");
  assert.ok(existsSync(productionCliArtifact), "build the release darty CLI first");
  assert.ok(
    existsSync(productionAddonArtifact),
    "build the release darty-node addon first",
  );

  const configuredFixtureTarget = process.env.DARTY_CANDIDATE_FIXTURE_TARGET;
  const fixtureTarget = configuredFixtureTarget
    ? resolve(repoRoot, configuredFixtureTarget)
    : join(temporaryRoot, "fixture-target");
  const fixtureCliArtifact = join(fixtureTarget, "release/darty");
  const fixtureAddonArtifact = join(fixtureTarget, "release/libdarty_node.dylib");
  if (configuredFixtureTarget === undefined) {
    console.log("Building isolated fixture CLI/addon target for local acceptance tests.");
    run(
      "cargo",
      [
        "build",
        "--release",
        "--locked",
        "-p",
        "darty-cli",
        "--features",
        "fixture-origin",
        "--target-dir",
        fixtureTarget,
      ],
      { timeout: 120_000 },
    );
    run(
      "cargo",
      [
        "build",
        "--release",
        "--locked",
        "-p",
        "darty-node",
        "--features",
        "test-fixture",
        "--target-dir",
        fixtureTarget,
      ],
      { timeout: 120_000 },
    );
  } else {
    console.log(`Using isolated fixture CLI/addon target: ${fixtureTarget}`);
  }
  assert.ok(existsSync(fixtureCliArtifact), "the isolated fixture darty CLI was built");
  assert.ok(existsSync(fixtureAddonArtifact), "the isolated fixture darty-node addon was built");

  const productionAddonBytes = readFileSync(productionAddonArtifact);
  const productionCliBytes = readFileSync(productionCliArtifact);
  for (const forbidden of [
    "DARTY_FIXTURE_ORIGIN",
    "DARTY_FIXTURE_FETCHED_AT",
    "DARTY_NODE_TEST_FIXTURE_ORIGIN",
    "DARTY_NODE_TEST_FIXTURE_FETCHED_AT",
  ]) {
    assert.equal(
      productionAddonBytes.includes(Buffer.from(forbidden)),
      false,
      `production addon must not contain ${forbidden}`,
    );
    assert.equal(
      productionCliBytes.includes(Buffer.from(forbidden)),
      false,
      `production CLI must not contain ${forbidden}`,
    );
  }

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
  const facadeSource = readFileSync(join(repoRoot, "candidate/npm/darty/index.ts"), "utf8");
  assert.doesNotMatch(facadeSource, /DARTY_(?:NODE_TEST_)?FIXTURE/);
  assert.doesNotMatch(facadeSource, /process\.env/);

  const stagePackage = (name, cliArtifact, addonArtifact) => {
    const stageRoot = join(temporaryRoot, `${name}-stage`);
    const rootPackage = join(stageRoot, "darty");
    const nativePackage = join(stageRoot, "darty-darwin-arm64");
    cpSync(join(repoRoot, "candidate/npm/darty"), rootPackage, { recursive: true });
    cpSync(join(repoRoot, "candidate/npm/darty-darwin-arm64"), nativePackage, {
      recursive: true,
    });
    copyFileSync(cliArtifact, join(nativePackage, "darty"));
    chmodSync(join(nativePackage, "darty"), 0o755);
    copyFileSync(addonArtifact, join(nativePackage, "darty.node"));

    const tarballs = join(temporaryRoot, `${name}-tarballs`);
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
    return { rootPack, nativePack, tarballs };
  };

  console.log("Staging production CLI/addon artifacts for the production acceptance consumer.");
  const productionPackages = stagePackage(
    "production",
    productionCliArtifact,
    productionAddonArtifact,
  );
  console.log("Staging isolated fixture CLI/addon artifacts for the fixture acceptance consumer.");
  const fixturePackages = stagePackage("fixture", fixtureCliArtifact, fixtureAddonArtifact);

  const installConsumer = (name, packages) => {
    const consumer = join(temporaryRoot, name);
    mkdirSync(consumer);
    writeFileSync(
      join(temporaryRoot, `${name}-package.json`),
      JSON.stringify({ private: true, type: "module" }),
    );
    cpSync(join(temporaryRoot, `${name}-package.json`), join(consumer, "package.json"));
    run(
      "npm",
      [
        "install",
        "--ignore-scripts",
        "--no-audit",
        "--no-fund",
        join(packages.tarballs, packages.nativePack.filename),
        join(packages.tarballs, packages.rootPack.filename),
      ],
      { cwd: consumer },
    );
    return consumer;
  };

  const productionConsumer = installConsumer("production-consumer", productionPackages);
  const fixtureConsumer = installConsumer("fixture-consumer", fixturePackages);
  const productionPackageRoot = join(
    productionConsumer,
    "node_modules/@sjunepark/darty",
  );
  const fixturePackageRoot = join(fixtureConsumer, "node_modules/@sjunepark/darty");
  const productionSdk = await import(pathToFileURL(join(productionPackageRoot, "index.js")));
  assert.deepEqual(Object.keys(productionSdk).sort(), ["DartyClient", "DartyError"]);
  assert.deepEqual(Object.getOwnPropertyNames(productionSdk.DartyClient.prototype).sort(), [
    "companyDetail",
    "companyRss",
    "constructor",
    "disclosureTypes",
    "reportGuide",
    "searchBody",
    "searchCompany",
    "searchCompanyReports",
    "viewReport",
  ]);

  const declarations = readFileSync(join(productionPackageRoot, "index.d.ts"), "utf8");
  assert.equal(
    declarations.includes("Record<string, unknown>"),
    false,
    "public response metadata must use project-owned declarations",
  );
  const declaredMethods = [
    ...declarations.matchAll(/^\s+(searchCompany(?:Reports)?|viewReport|searchBody|companyDetail|companyRss|disclosureTypes|reportGuide)\(/gm),
  ]
    .map((match) => match[1])
    .sort();
  assert.deepEqual(declaredMethods, ["companyDetail", "companyRss", "disclosureTypes", "reportGuide", "searchBody", "searchCompany", "searchCompanyReports", "viewReport"]);
  writeFileSync(
    join(productionConsumer, "consumer.ts"),
    `import { DartyClient, DartyError } from "@sjunepark/darty";\nconst client = new DartyClient();\nconst typedError = new DartyError({ code: "invalid_request", message: "invalid", retryable: false, parameter: "companyName" });\nconst company = client.searchCompany({ companyName: "가람" });\nconst companyCode: Promise<string> = company.then((response) => response.result.items[0]!.companyCode);\nconst companyPage: Promise<number> = company.then((response) => response.result.request.page);\nconst companyEndpoint: Promise<string> = company.then((response) => response.metadata.source.endpoint);\nconst reports = client.searchCompanyReports({ companyCode: "00000001", startDate: "20250101", endDate: "20260101" });\nconst reportPageSize: Promise<number> = reports.then((response) => response.result.request.pageSize);\nconst reportDetail: Promise<"concise" | "detailed" | "raw"> = reports.then((response) => response.result.request.detail);\nconst reportSource: Promise<string> = reports.then((response) => response.metadata.sourceBehavior.sortBy);\nconst report = client.viewReport({ receipt: "20260101000001", sectionId: "section:1.1" }, { signal: new AbortController().signal });\nconst viewFormat: Promise<"html" | "markdown"> = report.then((response) => response.result.request.outputFormat);\nconst viewDetail: Promise<"concise" | "detailed" | "raw"> = report.then((response) => response.result.request.detail);\nconst viewEndpoint: Promise<string> = report.then((response) => response.metadata.source.endpoints.shell);\nvoid [companyCode, companyPage, companyEndpoint, reports, reportPageSize, reportDetail, reportSource, report, viewFormat, viewDetail, viewEndpoint, typedError];\n`,
  );
  writeFileSync(join(productionConsumer, "consumer.ts"), readFileSync(join(productionConsumer, "consumer.ts"), "utf8") + `
const body = client.searchBody({ keyword: "배당", startDate: "20260101", endDate: "20260331" });
const snippet: Promise<string> = body.then(r => r.result.items[0]!.match.snippetText);
const bodyPage: Promise<number> = body.then(r => r.result.request.page);
const detailCompany: Promise<string> = client.companyDetail({ companyCode: "00000001" }).then(r => r.result.company.companyName);
const rss: Promise<string> = client.companyRss({ companyCode: "00000001", detail: "raw" }).then(r => r.result.channel.title);
const codes: Promise<string> = client.disclosureTypes({ query: "사업" }).then(r => r.result.categories[0]!.items[0]!.code);
const guide: Promise<string> = client.reportGuide().then(r => r.result.contentMarkdown);
void [snippet, bodyPage, detailCompany, rss, codes, guide];
`);
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
    { cwd: productionConsumer },
  );

  // Exercise production validation before the fixture consumer is imported.
  // Fixture isolation is proven above from the production artifacts themselves;
  // package acceptance must not send a valid request to the live DART service.
  const productionRoutingFixture = await startFixture("production-routing");
  process.env.DARTY_FIXTURE_ORIGIN = productionRoutingFixture.origin;
  process.env.DARTY_FIXTURE_FETCHED_AT = "1999-01-01T00:00:00.000Z";
  process.env.DARTY_NODE_TEST_FIXTURE_ORIGIN = productionRoutingFixture.origin;
  process.env.DARTY_NODE_TEST_FIXTURE_FETCHED_AT = "2026-08-22T00:00:00.000Z";
  const productionClient = new productionSdk.DartyClient();
  for (const [operation, input] of [
    ["searchCompany", {}],
    ["searchCompanyReports", {}],
    ["viewReport", {}],
    ["searchBody", {}],
    ["companyDetail", {}],
    ["companyRss", {}],
    ["disclosureTypes", { unexpected: true }],
    ["reportGuide", { unexpected: true }],
  ]) {
    await assert.rejects(
      productionClient[operation](input),
      (error) =>
        error instanceof productionSdk.DartyError &&
        error.code === "invalid_request" &&
        error.parameter === "input" &&
        error.retryable === false,
      `production addon ${operation} validation boundary`,
    );
  }

  assert.equal(
    existsSync(productionRoutingFixture.requestMarker),
    false,
    "production addon validation must not route to the fixture",
  );
  await stopFixture(productionRoutingFixture.child);

  const packageRoot = fixturePackageRoot;
  const consumer = fixtureConsumer;
  const sdk = await import(pathToFileURL(join(packageRoot, "index.js")));
  assert.deepEqual(Object.keys(sdk).sort(), ["DartyClient", "DartyError"]);
  assert.deepEqual(Object.getOwnPropertyNames(sdk.DartyClient.prototype).sort(), [
    "companyDetail",
    "companyRss",
    "constructor",
    "disclosureTypes",
    "reportGuide",
    "searchBody",
    "searchCompany",
    "searchCompanyReports",
    "viewReport",
  ]);

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
  const exactCompanyForm = fixtureForm(companyFixture.request.form).toString();
  const exactCompanyHeaders = {
    "content-type": companyFixture.request.headers["content-type"],
    referer: companyFixture.request.headers.referer,
  };
  assert.equal(
    await rawFormRequestStatus(
      new URL(companyFixture.request.path, fixture.origin),
      exactCompanyForm,
      exactCompanyHeaders,
    ),
    404,
    "form fixtures must reject a missing user-agent",
  );
  assert.equal(
    await rawFormRequestStatus(
      new URL(companyFixture.request.path, fixture.origin),
      exactCompanyForm,
      { ...exactCompanyHeaders, "user-agent": "" },
    ),
    404,
    "form fixtures must reject an empty user-agent",
  );
  // Deliberately provide the legacy names with an unusable origin. The
  // installed Node facade and test addon must ignore them; only the explicit
  // test-build seam below may select the deterministic fixture.
  process.env.DARTY_FIXTURE_ORIGIN = "http://127.0.0.1:1";
  process.env.DARTY_FIXTURE_FETCHED_AT = "1999-01-01T00:00:00.000Z";
  process.env.DARTY_NODE_TEST_FIXTURE_ORIGIN = fixture.origin;
  process.env.DARTY_NODE_TEST_FIXTURE_FETCHED_AT = "2026-08-22T00:00:00.000Z";
  const client = new sdk.DartyClient();
  await assert.rejects(
    client.searchCompany(),
    (error) =>
      error instanceof sdk.DartyError &&
      error.code === "invalid_request" &&
      error.retryable === false,
    "missing JS input must stay inside the typed DartyError boundary",
  );
  const cyclic = {};
  cyclic.self = cyclic;
  await assert.rejects(
    client.searchCompany(cyclic),
    (error) =>
      error instanceof sdk.DartyError &&
      error.code === "invalid_request" &&
      error.retryable === false,
    "unserializable JS input must stay inside the typed DartyError boundary",
  );
  const pending = client.searchCompany({ companyName: "가람" });
  assert.ok(pending instanceof Promise, "Node SDK operation must return a Promise");
  const companies = await pending;
  assertExactKeys(companies, ["metadata", "references", "result", "warnings"], "company response");
  assertExactKeys(
    companies.result.request,
    ["companyName", "page", "pageSize"],
    "company normalized request",
  );
  assert.deepEqual(companies.result.request, {
    companyName: "가람",
    page: 1,
    pageSize: 15,
  });
  assertExactKeys(
    companies.metadata,
    ["fetchedAt", "source", "sourceBehavior", "completeness", "droppedItemCount"],
    "company metadata",
  );
  assertExactKeys(companies.metadata.source, ["system", "surface", "endpoint"], "company source");
  assertExactKeys(
    companies.metadata.sourceBehavior,
    ["searchMode", "callerControlsPageSize", "maxObservedPageSize", "observationStatus"],
    "company source behavior",
  );
  assert.equal(companies.metadata.fetchedAt, "2026-08-22T00:00:00.000Z");
  assert.equal(companies.metadata.source.endpoint, "https://dart.fss.or.kr/dsae001/search.ax");
  assert.equal(companies.references.searchUrl, "https://dart.fss.or.kr/dsae001/search.ax");
  assert.equal(companies.result.items[0].companyCode, "00000001");
  const reports = await client.searchCompanyReports({
    companyCode: "00000001",
    startDate: "20250101",
    endDate: "20260101",
  });
  assertExactKeys(reports, ["metadata", "references", "result", "warnings"], "reports response");
  assertExactKeys(
    reports.result.request,
    [
      "companyCode",
      "startDate",
      "endDate",
      "page",
      "pageSize",
      "sortDirection",
      "disclosureTypes",
      "industryCode",
      "corporationType",
      "closingAccountsMonth",
      "includeAllReports",
      "detail",
    ],
    "reports normalized request",
  );
  assert.deepEqual(reports.result.request, {
    companyCode: "00000001",
    startDate: "20250101",
    endDate: "20260101",
    page: 1,
    pageSize: 15,
    sortDirection: "desc",
    disclosureTypes: [],
    industryCode: "all",
    corporationType: "all",
    closingAccountsMonth: "all",
    includeAllReports: false,
    detail: "concise",
  });
  assertExactKeys(
    reports.metadata,
    ["fetchedAt", "source", "sourceBehavior", "completeness", "droppedItemCount"],
    "reports metadata",
  );
  assertExactKeys(reports.metadata.source, ["system", "surface", "endpoint"], "reports source");
  assertExactKeys(
    reports.metadata.sourceBehavior,
    [
      "searchMode",
      "sortBy",
      "callerControlsPageSize",
      "pageSizeChoices",
      "finalReportDefault",
      "observationStatus",
    ],
    "reports source behavior",
  );
  assert.equal(reports.metadata.fetchedAt, "2026-08-22T00:00:00.000Z");
  assert.equal(reports.metadata.source.endpoint, "https://dart.fss.or.kr/dsab007/detailSearch.ax");
  assert.equal(reports.references.searchUrl, "https://dart.fss.or.kr/dsab007/detailSearch.ax");
  assert.equal(reports.result.company.companyCode, "00000001");
  assert.equal(reports.result.items[0].filing.receiptNumber, "20260101000001");
  assert.equal(reports.result.items[0].filing.reportTitle, "[기재정정]사업보고서");
  const section = await client.viewReport({
    receipt: "20260101000001",
    sectionId: "section:1.1",
  });
  assertExactKeys(section, ["metadata", "references", "result", "warnings"], "view response");
  assertExactKeys(
    section.result.request,
    ["receipt", "sectionId", "outputFormat", "maxBytes", "contentStartByte", "detail"],
    "view normalized request",
  );
  assert.deepEqual(section.result.request, {
    receipt: "20260101000001",
    sectionId: "section:1.1",
    outputFormat: "markdown",
    maxBytes: 50_000,
    contentStartByte: 0,
    detail: "concise",
  });
  assertExactKeys(section.metadata, ["fetchedAt", "source", "tocSource"], "view metadata");
  assertExactKeys(section.metadata.source, ["system", "surface", "endpoints"], "view source");
  assertExactKeys(
    section.metadata.source.endpoints,
    ["shell", "content"],
    "view source endpoints",
  );
  assert.equal(section.metadata.fetchedAt, "2026-08-22T00:00:00.000Z");
  assert.equal(section.metadata.source.endpoints.shell, "https://dart.fss.or.kr/dsaf001/main.do");
  assert.equal(
    section.metadata.source.endpoints.content,
    "https://dart.fss.or.kr/report/viewer.do",
  );
  assert.match(section.references.viewerUrl, /^https:\/\/dart\.fss\.or\.kr\/dsaf001\/main\.do\?/);
  assert.equal(section.result.receipt.receiptNumber, "20260101000001");
  assert.equal(section.result.content.section.id, "section:1.1");
  assert.equal(section.result.content.format, "markdown");
  assert.match(section.result.content.body, /CP949 확장 음절 갂/);
  for (const [method, input, goldenName] of [
    ["searchBody", { keyword: "배당", startDate: "20260101", endDate: "20260331", detail: "raw" }, "parity-body-verbose"],
    ["companyDetail", { companyCode: "00000001" }, "parity-detail-populated"],
    ["companyRss", { companyCode: "00000001", detail: "raw" }, "parity-rss-raw"],
    ["companyRss", { companyCode: "00000002" }, "parity-rss-empty"],
    ["disclosureTypes", { query: "I001" }, "disclosure-types-static-success"],
  ]) {
    const golden = JSON.parse(readFileSync(join(repoRoot, "test/compat/cli-v1/goldens", `${goldenName}.json`), "utf8")).value;
    delete golden.help;
    assert.deepEqual(await client[method](input), golden, `packaged Node ${method} independent result`);
  }
  assert.equal((await client.reportGuide()).result.contentMarkdown, JSON.parse(readFileSync(join(repoRoot, "crates/darty/resources/report-guide.json"), "utf8")).result.contentMarkdown);
  await assert.rejects(client.companyDetail({ companyCode: "00000002" }), error => error instanceof sdk.DartyError && error.code === "not_found" && error.retryable === false && error.recoveryHint.includes("search-company"));
  await assert.rejects(client.companyRss({ companyCode: "00000007" }), error => error instanceof sdk.DartyError && error.code === "source_parse_failure");
  for (const [method, input] of [["searchBody", { keyword: "배당", startDate: "20260101", endDate: "20260331" }], ["companyDetail", { companyCode: "00000001" }], ["companyRss", { companyCode: "00000001" }], ["disclosureTypes", {}], ["reportGuide", {}]]) {
    const aborted = new AbortController();
    aborted.abort();
    await assert.rejects(client[method](input, { signal: aborted.signal }), error => error.name === "AbortError" && error.code === "ABORT_ERR");
  }
  for (const [method, input] of [
    ["searchBody", { keyword: "배당", startDate: "20260101", endDate: "20260331", reportName: null }],
    ["searchCompanyReports", { companyCode: "00000001", startDate: "20250101", endDate: "20260101", reportName: null }],
    ["viewReport", { receipt: "20260101000001", sectionId: null }],
    ["disclosureTypes", { query: null }],
  ]) {
    await assert.rejects(client[method](input), error => error instanceof sdk.DartyError && error.code === "invalid_request");
  }
  assert.deepEqual(await client.companyDetail({ companyCode: " 00000001 " }), await client.companyDetail({ companyCode: "00000001" }));
  assert.deepEqual(await client.companyRss({ companyCode: " 00000001 " }), await client.companyRss({ companyCode: "00000001" }));
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

  const delayedFixture = await startFixture("delayed", 0, { firstDelay: 5_000 });
  process.env.DARTY_NODE_TEST_FIXTURE_ORIGIN = delayedFixture.origin;
  const delayedClient = new sdk.DartyClient();
  const controller = new AbortController();
  const cancelled = delayedClient.searchCompany(
    { companyName: "가람" },
    { signal: controller.signal },
  );
  await waitForRequest(delayedFixture.requestMarker, 1);
  const startedAt = Date.now();
  controller.abort();
  await assert.rejects(
    cancelled,
    (error) => error.name === "AbortError" && error.code === "ABORT_ERR",
  );
  assert.ok(Date.now() - startedAt < 1_000, "cancellation must promptly drop native work");
  const nextStartedAt = Date.now();
  const afterCancellation = await delayedClient.searchCompany({ companyName: "가람" });
  assert.equal(afterCancellation.result.items[0].companyCode, "00000001");
  assert.ok(
    Date.now() - nextStartedAt < 1_000,
    "an in-flight cancellation must allow the next request to progress",
  );
  await stopFixture(delayedFixture.child);

  for (const [method, input] of [
    ["searchBody", { keyword: "배당", startDate: "20260101", endDate: "20260331" }],
    ["companyDetail", { companyCode: "00000001" }],
    ["companyRss", { companyCode: "00000001" }],
  ]) {
    const delayed = await startFixture(`cancel-${method}`, 0, { firstDelay: 5_000 });
    process.env.DARTY_NODE_TEST_FIXTURE_ORIGIN = delayed.origin;
    const cancellable = new sdk.DartyClient();
    const abort = new AbortController();
    const pending = cancellable[method](input, { signal: abort.signal });
    await waitForRequest(delayed.requestMarker, 1);
    const cancellationTime = Date.now();
    abort.abort();
    await assert.rejects(pending, error => error.name === "AbortError" && error.code === "ABORT_ERR");
    assert.ok(Date.now() - cancellationTime < 1_000, `${method} native cancellation is prompt`);
    await cancellable[method](input);
    await stopFixture(delayed.child);
  }

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
