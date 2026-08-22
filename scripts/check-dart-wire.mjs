#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";

import SwaggerParser from "@apidevtools/swagger-parser";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const openapiPath = resolve(repoRoot, "docs/specs/dart-wire-v1.openapi.yaml");
const companionPath = resolve(repoRoot, "docs/specs/dart-html-viewer-v1.md");
const qualificationPath = resolve(
  repoRoot,
  "docs/research/dart-provider-qualification.md",
);
const fixtureRoot = resolve(repoRoot, "fixtures/dart/vertical-v1");
const manifestPath = resolve(fixtureRoot, "manifest.json");
const lockPath = resolve(repoRoot, "docs/specs/dart-wire-v1.lock.json");

const expectedOperations = new Map([
  ["searchCompanyFragment", { method: "POST", path: "/dsae001/search.ax" }],
  [
    "searchCompanyReportsFragment",
    { method: "POST", path: "/dsab007/detailSearch.ax" },
  ],
  ["fetchReportShell", { method: "GET", path: "/dsaf001/main.do" }],
  ["fetchReportContent", { method: "GET", path: "/report/viewer.do" }],
]);
const expectedCaseIds = [
  "company-populated",
  "company-empty",
  "company-partial",
  "company-changed",
  "reports-populated",
  "reports-advanced-filters",
  "reports-empty",
  "reports-partial",
  "reports-changed",
  "report-shell-toc",
  "report-shell-attachment",
  "report-shell-no-toc",
  "report-shell-no-selected",
  "report-shell-changed",
  "report-content-utf8",
  "report-content-ms949",
  "report-content-malformed",
];
const expectedFaults = [
  {
    id: "source-http-503",
    operationIds: [...expectedOperations.keys()],
    recipe: { status: 503, contentType: "text/html; charset=UTF-8", bodyBytes: 0 },
    rule: "WIRE-STATUS-1",
    classification: "source_unavailable",
    retryable: true,
  },
  {
    id: "source-redirect",
    operationIds: [...expectedOperations.keys()],
    recipe: {
      status: 302,
      location: "https://example.invalid/outside-dart",
      bodyBytes: 0,
      followRedirects: false,
    },
    rule: "WIRE-REDIRECT-1",
    classification: "source_unavailable",
    retryable: true,
  },
  {
    id: "source-connect-timeout",
    operationIds: [...expectedOperations.keys()],
    recipe: { stallDuringConnectMilliseconds: 5001, timeoutMilliseconds: 5000 },
    rule: "WIRE-TIMEOUT-1",
    classification: "source_unavailable",
    retryable: true,
  },
  {
    id: "source-idle-read-timeout",
    operationIds: [...expectedOperations.keys()],
    recipe: {
      status: 200,
      contentType: "text/html; charset=UTF-8",
      initialBodyBytes: 1,
      stallAfterBodyMilliseconds: 10001,
      timeoutMilliseconds: 10000,
    },
    rule: "WIRE-TIMEOUT-1",
    classification: "source_unavailable",
    retryable: true,
  },
  {
    id: "source-total-timeout",
    operationIds: [...expectedOperations.keys()],
    recipe: { stallAfterRequestMilliseconds: 30001, timeoutMilliseconds: 30000 },
    rule: "WIRE-TIMEOUT-1",
    classification: "source_unavailable",
    retryable: true,
  },
  {
    id: "source-wrong-media-type",
    operationIds: [...expectedOperations.keys()],
    recipe: {
      status: 200,
      contentType: "application/json; charset=UTF-8",
      bodyBytes: 2,
    },
    rule: "WIRE-CONTENT-TYPE-1",
    classification: "source_parse_failure",
    retryable: false,
  },
  {
    id: "source-unsupported-charset",
    operationIds: [...expectedOperations.keys()],
    recipe: { status: 200, contentType: "text/html; charset=shift_jis", bodyBytes: 0 },
    rule: "DECODE-CHARSET-2",
    classification: "source_parse_failure",
    retryable: false,
  },
  {
    id: "source-oversized-search",
    operationIds: ["searchCompanyFragment", "searchCompanyReportsFragment"],
    repeatToBytes: 8 * 1024 * 1024 + 1,
  },
  {
    id: "source-oversized-shell",
    operationIds: ["fetchReportShell"],
    repeatToBytes: 16 * 1024 * 1024 + 1,
  },
  {
    id: "source-oversized-content",
    operationIds: ["fetchReportContent"],
    repeatToBytes: 64 * 1024 * 1024 + 1,
  },
];
const expectedLockPaths = [
  "docs/specs/dart-wire-v1.openapi.yaml",
  "docs/specs/dart-html-viewer-v1.md",
  "docs/research/dart-provider-qualification.md",
  "fixtures/dart/vertical-v1/manifest.json",
  "scripts/check-dart-wire.mjs",
  "scripts/check-dart-fixture-conformance.ts",
];

const fail = (message) => {
  throw new Error(`DART wire contract check failed: ${message}`);
};

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sha256File = async (path) => sha256(await readFile(path));
const sorted = (values) => [...values].sort();
const sameSet = (left, right) =>
  JSON.stringify(sorted(left)) === JSON.stringify(sorted(right));

const resolveSchema = (schema) => {
  if (schema?.$ref === undefined) return schema;
  const name = schema.$ref.match(/^#\/components\/schemas\/([^/]+)$/)?.[1];
  if (name === undefined || api.components?.schemas?.[name] === undefined) {
    fail(`unsupported schema reference ${schema.$ref}`);
  }
  return resolveSchema(api.components.schemas[name]);
};

const resolveResponse = (response) => {
  if (response?.$ref === undefined) return response;
  const name = response.$ref.match(/^#\/components\/responses\/([^/]+)$/)?.[1];
  if (name === undefined || api.components?.responses?.[name] === undefined) {
    fail(`unsupported response reference ${response.$ref}`);
  }
  return api.components.responses[name];
};

const validateScalar = (rawValue, rawSchema, field) => {
  const schema = resolveSchema(rawSchema);
  let value = rawValue;
  if (schema.type === "integer") {
    if (!/^-?\d+$/.test(String(rawValue))) fail(`${field} must serialize an integer`);
    value = Number(rawValue);
    if (!Number.isSafeInteger(value)) fail(`${field} integer is not safe`);
  } else if (schema.type === "string" && typeof rawValue !== "string") {
    fail(`${field} must serialize a string`);
  }
  if (schema.enum !== undefined && !schema.enum.includes(value)) {
    fail(`${field} is outside its enum`);
  }
  if (schema.minimum !== undefined && value < schema.minimum) fail(`${field} is too small`);
  if (schema.maximum !== undefined && value > schema.maximum) fail(`${field} is too large`);
  if (schema.minLength !== undefined && value.length < schema.minLength) fail(`${field} is too short`);
  if (schema.maxLength !== undefined && value.length > schema.maxLength) fail(`${field} is too long`);
  if (schema.pattern !== undefined && !new RegExp(schema.pattern).test(value)) {
    fail(`${field} does not match ${schema.pattern}`);
  }
};

const validateSerializedObject = (instance, rawSchema, label) => {
  const schema = resolveSchema(rawSchema);
  if (!sameSet(Object.keys(instance), Object.keys(schema.properties ?? {}))) {
    fail(`${label} fields do not exactly match its schema`);
  }
  for (const required of schema.required ?? []) {
    if (!(required in instance)) fail(`${label}.${required} is required`);
  }
  for (const [name, rawProperty] of Object.entries(schema.properties ?? {})) {
    const property = resolveSchema(rawProperty);
    const value = instance[name];
    if (property.type === "array") {
      if (!Array.isArray(value)) fail(`${label}.${name} must be an array`);
      if (property.minItems !== undefined && value.length < property.minItems) fail(`${label}.${name} has too few items`);
      if (property.maxItems !== undefined && value.length > property.maxItems) fail(`${label}.${name} has too many items`);
      if (property.uniqueItems === true && new Set(value).size !== value.length) fail(`${label}.${name} must be unique`);
      value.forEach((item, index) => validateScalar(item, property.items, `${label}.${name}[${index}]`));
    } else {
      validateScalar(value, property, `${label}.${name}`);
    }
  }
  for (const [left, right] of schema["x-darty-equal-fields"] ?? []) {
    if (instance[left] !== instance[right]) fail(`${label}.${left} must equal ${right}`);
  }
  for (const condition of schema["x-darty-conditional-fields"] ?? []) {
    const branch = instance[condition.when.field] === condition.when.equals
      ? condition.then
      : condition.otherwise;
    if (instance[branch.field] !== branch.equals) fail(`${label}.${branch.field} violates its coupled serialization`);
  }
};

const decoderLabelFor = (charset) => {
  if (charset === undefined || ["utf-8", "utf8"].includes(charset)) return "utf-8";
  if (["ms949", "euc-kr", "ks_c_5601-1987"].includes(charset)) return "euc-kr";
  return undefined;
};

const resolveFixturePath = (fixturePath) => {
  const absolute = resolve(fixtureRoot, fixturePath);
  const fromRoot = relative(fixtureRoot, absolute);
  if (fromRoot.startsWith("..") || fromRoot === "") {
    fail(`fixture path escapes its root: ${fixturePath}`);
  }
  return absolute;
};

const api = await SwaggerParser.parse(openapiPath);
await SwaggerParser.validate(openapiPath, {
  resolve: { external: false },
  validate: { schema: true, spec: true },
});

if (api.info?.["x-darty-authority-version"] !== "dart-wire-v1") {
  fail("OpenAPI authority version must be dart-wire-v1");
}
if (
  api.servers?.length !== 1 ||
  api.servers[0]?.url !== "https://dart.fss.or.kr"
) {
  fail("OpenAPI must declare only the approved DART origin");
}

const actualPaths = Object.keys(api.paths ?? {});
const expectedPaths = [...expectedOperations.values()].map(({ path }) => path);
if (!sameSet(actualPaths, expectedPaths)) {
  fail(`OpenAPI paths must be exactly ${expectedPaths.join(", ")}`);
}

const httpMethods = new Set(["get", "put", "post", "delete", "options", "head", "patch", "trace"]);
const actualOperations = [];
for (const [path, pathItem] of Object.entries(api.paths ?? {})) {
  for (const [method, operation] of Object.entries(pathItem)) {
    if (httpMethods.has(method)) actualOperations.push(`${method.toUpperCase()} ${path} ${operation.operationId ?? ""}`);
  }
}
const allowedOperations = [...expectedOperations].map(
  ([operationId, { method, path }]) => `${method} ${path} ${operationId}`,
);
if (!sameSet(actualOperations, allowedOperations)) fail("OpenAPI operation triples drifted");

const operationSchemas = new Map([
  ["searchCompanyFragment", "CompanySearchForm"],
  ["searchCompanyReportsFragment", "CompanyReportsSearchForm"],
]);

for (const [operationId, expected] of expectedOperations) {
  const operation = api.paths?.[expected.path]?.[expected.method.toLowerCase()];
  if (operation?.operationId !== operationId) {
    fail(`${expected.method} ${expected.path} must have operationId ${operationId}`);
  }
  const successResponse = resolveResponse(operation.responses?.["200"]);
  if (successResponse?.content?.["text/html"] === undefined) {
    fail(`${operationId} must declare a text/html 200 response`);
  }
  if (operation.responses?.default === undefined) {
    fail(`${operationId} must declare unexpected source responses`);
  }
}

for (const [operationId, schemaName] of operationSchemas) {
  const { method, path } = expectedOperations.get(operationId);
  const media = api.paths[path][method.toLowerCase()].requestBody?.content?.[
    "application/x-www-form-urlencoded"
  ];
  if (media === undefined) {
    fail(`${operationId} must use application/x-www-form-urlencoded`);
  }
  if (
    media["x-darty-content-type"] !==
    "application/x-www-form-urlencoded; charset=UTF-8"
  ) {
    fail(`${operationId} must own the exact serialized form content type`);
  }
  const arrayField = operationId === "searchCompanyFragment" ? "corpType" : "publicType";
  const encoding = media.encoding?.[arrayField];
  if (encoding?.style !== "form" || encoding.explode !== true) {
    fail(`${operationId}.${arrayField} must use repeated exploded form fields`);
  }
  if (media.schema?.$ref !== `#/components/schemas/${schemaName}`) {
    fail(`${operationId} must reference ${schemaName}`);
  }
  if (api.components?.schemas?.[schemaName] === undefined) {
    fail(`missing OpenAPI schema ${schemaName}`);
  }
  const schema = resolveSchema(media.schema);
  const optionalProperties = operationId === "searchCompanyReportsFragment" ? ["publicType"] : [];
  const expectedRequired = Object.keys(schema.properties).filter(
    (name) => !optionalProperties.includes(name),
  );
  if (!sameSet(schema.required ?? [], expectedRequired)) {
    fail(`${schemaName} required fields drifted`);
  }
}

const companion = await readFile(companionPath, "utf8");
const ruleIds = new Set(
  [...companion.matchAll(/^- `([A-Z][A-Z0-9-]+)`/gm)].map((match) => match[1]),
);
if (ruleIds.size < 20) fail("companion contract has too few stable rule IDs");

const qualification = await readFile(qualificationPath, "utf8");
const normalizedQualification = qualification.replace(/\s+/g, " ");
for (const heading of [
  "## Qualification decision",
  "## Evidence register",
  "## Access",
  "## Pacing",
  "## Retries, timeout, and cancellation",
  "## Retention",
  "## Monitoring",
  "## Withdrawal and requalification",
]) {
  if (!qualification.includes(heading)) fail(`qualification is missing ${heading}`);
}
for (const disclaimer of [
  "not protocol authority",
  "not protocol authority, a public capability contract",
  "release authorization",
]) {
  if (!normalizedQualification.includes(disclaimer)) {
    fail(`qualification is missing disclaimer text: ${disclaimer}`);
  }
}

const manifest = await readJson(manifestPath);
if (manifest.schemaVersion !== 1 || manifest.authorityVersion !== "dart-wire-v1") {
  fail("fixture manifest version does not match dart-wire-v1");
}
if (!Array.isArray(manifest.cases) || manifest.cases.length < 10) {
  fail("fixture manifest must contain the vertical success/empty/drift corpus");
}

const casesById = new Map();
for (const fixtureCase of manifest.cases) {
  if (casesById.has(fixtureCase.id)) fail(`duplicate fixture id ${fixtureCase.id}`);
  casesById.set(fixtureCase.id, fixtureCase);
}
if (!sameSet(casesById.keys(), expectedCaseIds)) {
  fail("fixture case allowlist drifted");
}

const resolvedRequests = new Map();
const resolveRequest = (fixtureCase, stack = []) => {
  if (resolvedRequests.has(fixtureCase.id)) return resolvedRequests.get(fixtureCase.id);
  const request = fixtureCase.request;
  if (request === undefined) fail(`${fixtureCase.id} has no request`);
  if (request.matchRequestFrom === undefined) {
    const copy = structuredClone(request);
    resolvedRequests.set(fixtureCase.id, copy);
    return copy;
  }
  if (stack.includes(fixtureCase.id)) fail(`fixture inheritance cycle at ${fixtureCase.id}`);
  const base = casesById.get(request.matchRequestFrom);
  if (base === undefined) {
    fail(`${fixtureCase.id} inherits missing request ${request.matchRequestFrom}`);
  }
  const resolved = structuredClone(resolveRequest(base, [...stack, fixtureCase.id]));
  resolved.form = { ...(resolved.form ?? {}), ...(request.formOverrides ?? {}) };
  resolved.query = { ...(resolved.query ?? {}), ...(request.queryOverrides ?? {}) };
  resolvedRequests.set(fixtureCase.id, resolved);
  return resolved;
};

const seenOperations = new Set();
for (const fixtureCase of manifest.cases) {
  const expected = expectedOperations.get(fixtureCase.operationId);
  if (expected === undefined) fail(`${fixtureCase.id} uses unknown operationId`);
  seenOperations.add(fixtureCase.operationId);

  if (
    fixtureCase.provenance?.kind !== "fictional" ||
    fixtureCase.provenance?.containsLiveResponseData !== false
  ) {
    fail(`${fixtureCase.id} must be explicitly fictional and contain no live body`);
  }
  for (const rule of fixtureCase.rules ?? []) {
    if (!ruleIds.has(rule)) fail(`${fixtureCase.id} uses unknown rule ${rule}`);
  }

  const request = resolveRequest(fixtureCase);
  if (request.method !== expected.method || request.path !== expected.path) {
    fail(`${fixtureCase.id} request does not match ${fixtureCase.operationId}`);
  }
  if (request.headers?.["user-agent"]?.present !== true) {
    fail(`${fixtureCase.id} must require a present user-agent`);
  }
  const expectedHeaderNames = expected.method === "POST"
    ? ["content-type", "referer", "user-agent"]
    : ["user-agent"];
  if (!sameSet(Object.keys(request.headers ?? {}), expectedHeaderNames)) {
    fail(`${fixtureCase.id} request headers drifted`);
  }

  const operation = api.paths[expected.path][expected.method.toLowerCase()];
  for (const rawParameter of operation.parameters ?? []) {
    const parameterName = rawParameter.$ref?.match(/^#\/components\/parameters\/([^/]+)$/)?.[1];
    const parameter = parameterName === undefined
      ? rawParameter
      : api.components.parameters[parameterName];
    const key = parameter.name.toLowerCase();
    if (parameter.in === "header") {
      const header = request.headers?.[key];
      if (parameter.required === true && header === undefined) fail(`${fixtureCase.id} omits ${parameter.name}`);
      if (key !== "user-agent") validateScalar(header, parameter.schema, `${fixtureCase.id}.${key}`);
    }
  }

  if (expected.method === "POST") {
    if (
      request.headers?.["content-type"] !==
      "application/x-www-form-urlencoded; charset=UTF-8"
    ) {
      fail(`${fixtureCase.id} has the wrong form content type`);
    }
    const media = operation.requestBody.content["application/x-www-form-urlencoded"];
    if (request.headers["content-type"] !== media["x-darty-content-type"]) {
      fail(`${fixtureCase.id} content type conflicts with OpenAPI`);
    }
    validateSerializedObject(request.form ?? {}, media.schema, fixtureCase.id);
  } else {
    const queryParameters = (operation.parameters ?? []).map((rawParameter) => {
      const name = rawParameter.$ref?.match(/^#\/components\/parameters\/([^/]+)$/)?.[1];
      return name === undefined ? rawParameter : api.components.parameters[name];
    }).filter(({ in: location }) => location === "query");
    const allowed = queryParameters.map(({ name }) => name);
    const required = queryParameters.filter(({ required }) => required === true).map(({ name }) => name);
    if (!Object.keys(request.query ?? {}).every((key) => allowed.includes(key))) fail(`${fixtureCase.id} has an unknown query parameter`);
    if (!required.every((key) => key in (request.query ?? {}))) fail(`${fixtureCase.id} omits a required query parameter`);
    for (const parameter of queryParameters) {
      if (parameter.name in (request.query ?? {})) validateScalar(request.query[parameter.name], parameter.schema, `${fixtureCase.id}.${parameter.name}`);
    }
  }

  const expectedResult = fixtureCase.expected;
  if (!["success", "error"].includes(expectedResult?.kind)) fail(`${fixtureCase.id} lacks a typed expectation`);
  const allowedParser = {
    searchCompanyFragment: "company-search",
    searchCompanyReportsFragment: "company-reports",
    fetchReportShell: "report-shell",
    fetchReportContent: "report-content",
  }[fixtureCase.operationId];
  if (expectedResult.parser !== allowedParser) fail(`${fixtureCase.id} expectation uses the wrong parser`);
  if (expectedResult.kind === "error" && !["source_changed", "source_parse_failure"].includes(expectedResult.classification)) {
    fail(`${fixtureCase.id} has an invalid expected error classification`);
  }

  if (fixtureCase.response?.status !== 200) fail(`${fixtureCase.id} must be HTTP 200`);
  if (!/^text\/html(?:;|$)/i.test(fixtureCase.response.contentType ?? "")) {
    fail(`${fixtureCase.id} must use text/html`);
  }
  const bodyPath = resolveFixturePath(fixtureCase.response.bodyPath);
  if ((await sha256File(bodyPath)) !== fixtureCase.response.sha256) {
    fail(`${fixtureCase.id} body hash is stale`);
  }

  if (fixtureCase.expected.parser === "report-content") {
    const sourceBytes = await readFile(bodyPath);
    const bodyBytes = fixtureCase.response.bodyEncoding === "hex"
      ? Buffer.from(sourceBytes.toString("utf8").replace(/\s+/g, ""), "hex")
      : sourceBytes;
    const aliases = fixtureCase.response.charsetAliases;
    const declaredCharset = fixtureCase.response.contentType.match(/charset=([^;]+)/i)?.[1]?.toLowerCase();
    const decoderLabel = decoderLabelFor(declaredCharset);
    if (decoderLabel === undefined) fail(`${fixtureCase.id} declares unsupported charset ${declaredCharset}`);
    if (aliases !== undefined && !sameSet(aliases.map((value) => value.toLowerCase()), ["ms949", "euc-kr", "ks_c_5601-1987"])) {
      fail(`${fixtureCase.id} charset alias set drifted`);
    }
    const decoded = new TextDecoder(decoderLabel).decode(bodyBytes);
    if (sha256(decoded) !== fixtureCase.expected.decodedSha256) fail(`${fixtureCase.id} decoded hash drifted`);
    if (!decoded.includes(fixtureCase.expected.requiredText)) fail(`${fixtureCase.id} decoded required text drifted`);
    if ([...decoded].filter((character) => character === "�").length !== fixtureCase.expected.replacementCount) fail(`${fixtureCase.id} replacement behavior drifted`);
    if (aliases !== undefined) {
      for (const alias of aliases) {
        const normalized = ["ms949", "euc-kr", "ks_c_5601-1987"].includes(alias.toLowerCase()) ? "euc-kr" : alias;
        if (new TextDecoder(normalized).decode(bodyBytes) !== decoded) fail(`${fixtureCase.id} alias ${alias} decodes differently`);
      }
    }
  }

  if (fixtureCase.response.decodedBodyPath !== undefined) {
    const raw = await readFile(bodyPath);
    if (!raw.includes(Buffer.from([0x81, 0x41]))) fail(`${fixtureCase.id} lacks its CP949-only extension byte`);
    const decoded = new TextDecoder("euc-kr").decode(raw);
    const expectedDecoded = await readFile(
      resolveFixturePath(fixtureCase.response.decodedBodyPath),
      "utf8",
    );
    if (decoded !== expectedDecoded) fail(`${fixtureCase.id} MS949 decoding drifted`);
  }
}

if (!sameSet(seenOperations, expectedOperations.keys())) {
  fail("fixture corpus must cover every supported operationId");
}

const faults = manifest.faults ?? [];
if (!sameSet(faults.map(({ id }) => id), expectedFaults.map(({ id }) => id))) {
  fail("fixture fault allowlist drifted");
}
for (const fault of faults) {
  if (!ruleIds.has(fault.rule)) fail(`${fault.id} uses unknown rule ${fault.rule}`);
  for (const operationId of fault.operationIds ?? []) {
    if (!expectedOperations.has(operationId)) fail(`${fault.id} uses unknown operationId`);
  }
  if (fault.recipe?.seedPath !== undefined) {
    const seedPath = resolveFixturePath(fault.recipe.seedPath);
    if ((await sha256File(seedPath)) !== fault.recipe.seedSha256) {
      fail(`${fault.id} seed hash is stale`);
    }
  }
  const expectedFault = expectedFaults.find(({ id }) => id === fault.id);
  if (expectedFault.repeatToBytes !== undefined) {
    if (
      !sameSet(fault.operationIds, expectedFault.operationIds) ||
      !sameSet(Object.keys(fault.recipe ?? {}), ["seedPath", "seedSha256", "repeatToBytes"]) ||
      fault.recipe.seedPath !== "bodies/oversized-seed.ascii.html" ||
      fault.recipe.seedSha256 !== "5c8ac83793eb8072733a315d138c4e93a1cb287ef4f8d3054b384b80b789cea9" ||
      fault.recipe.repeatToBytes !== expectedFault.repeatToBytes ||
      fault.rule !== "WIRE-SIZE-1" ||
      fault.classification !== "source_parse_failure" ||
      fault.retryable !== false
    ) fail(`${fault.id} oversized recipe semantics drifted`);
  } else if (
    !sameSet(fault.operationIds, expectedFault.operationIds) ||
    !isDeepStrictEqual(fault.recipe, expectedFault.recipe) ||
    fault.rule !== expectedFault.rule ||
    fault.classification !== expectedFault.classification ||
    fault.retryable !== expectedFault.retryable
  ) {
    fail(`${fault.id} recipe semantics drifted`);
  }
  if (fault.id === "source-unsupported-charset") {
    const token = fault.recipe.contentType.match(/charset=([^;]+)/i)?.[1]?.toLowerCase();
    if (decoderLabelFor(token) !== undefined) fail(`${fault.id} must exercise charset rejection`);
  }
}

const lock = await readJson(lockPath);
if (lock.authorityVersion !== "dart-wire-v1") fail("authority lock version drifted");
if (!sameSet((lock.files ?? []).map(({ path }) => path), expectedLockPaths)) {
  fail("authority lock file allowlist drifted");
}
for (const entry of lock.files ?? []) {
  const path = resolve(repoRoot, entry.path);
  if ((await sha256File(path)) !== entry.sha256) {
    fail(`authority lock is stale for ${entry.path}`);
  }
}

console.log(
  `DART wire v1 passed: ${expectedOperations.size} operations, ${ruleIds.size} companion rules, ${manifest.cases.length} fictional cases, ${manifest.faults.length} fault recipes.`,
);
