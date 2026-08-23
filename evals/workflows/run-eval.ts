import { fileURLToPath } from "node:url";

import { runFixedDartyCli } from "../surfaces/cli/fixed-cli-runner.ts";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const decoder = new TextDecoder();
const encoder = new TextEncoder();

type JsonRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getRecord = (
  value: JsonRecord | undefined,
  key: string,
): JsonRecord | undefined => {
  const child = value?.[key];
  return isRecord(child) ? child : undefined;
};

const getArray = (
  value: JsonRecord | undefined,
  key: string,
): readonly unknown[] | undefined => {
  const child = value?.[key];
  return Array.isArray(child) ? child : undefined;
};

const getString = (
  value: JsonRecord | undefined,
  key: string,
): string | undefined => {
  const child = value?.[key];
  return typeof child === "string" ? child : undefined;
};

const parseJsonObject = (text: string): JsonRecord => {
  const parsed: unknown = JSON.parse(text);

  if (!isRecord(parsed)) {
    throw new Error("Expected CLI stdout to be a JSON object.");
  }

  return parsed;
};

const formatSize = (stdout: string, envelope: JsonRecord): string => {
  const stdoutUtf8Bytes = encoder.encode(stdout).byteLength;
  const envelopeJsonCharacters = JSON.stringify(envelope).length;

  return `stdoutUtf8Bytes=${stdoutUtf8Bytes}, envelopeJsonCharacters=${envelopeJsonCharacters}`;
};

const firstRecord = (items: readonly unknown[] | undefined): JsonRecord | undefined => {
  const [first] = items ?? [];

  return isRecord(first) ? first : undefined;
};

const formatFailedStep = (
  name: string,
  exitCode: number,
  stdout: string,
  stderr: string,
): string => {
  const details = [`${name} exited with ${exitCode}.`];

  if (stdout.length > 0) {
    try {
      details.push(`stdoutJson=${JSON.stringify(parseJsonObject(stdout))}`);
    } catch {
      details.push(`stdout=${stdout}`);
    }
  } else {
    details.push("stdout=<empty>");
  }

  details.push(`stderr=${stderr || "<empty>"}`);
  return details.join(" ");
};

const runStep = (name: string, argv: readonly string[]): JsonRecord => {
  const result = runFixedDartyCli({ repoRoot, argv });
  const stdout = decoder.decode(result.stdout).trim();
  const stderr = decoder.decode(result.stderr).trim();

  if (result.exitCode !== 0) {
    throw new Error(formatFailedStep(name, result.exitCode, stdout, stderr));
  }

  const envelope = parseJsonObject(stdout);

  console.log(`✓ ${name}: ${formatSize(stdout, envelope)}`);
  return envelope;
};

const runStepOrRecordFailure = (
  name: string,
  argv: readonly string[],
  reasons: string[],
): JsonRecord | undefined => {
  try {
    return runStep(name, argv);
  } catch (error) {
    reasons.push(error instanceof Error ? error.message : String(error));
    return undefined;
  }
};

const assertHelpContains = (
  envelope: JsonRecord,
  text: string,
  reasons: string[],
): void => {
  const help = getArray(envelope, "help");

  if (
    help === undefined ||
    !help.some((entry) => typeof entry === "string" && entry.includes(text))
  ) {
    reasons.push(`missing help hint containing "${text}"`);
  }
};

const assertSectionWindow = (
  envelope: JsonRecord,
  receiptNumber: string | undefined,
  sectionId: string | undefined,
  reasons: string[],
): void => {
  const result = getRecord(envelope, "result");
  const returnedReceipt = getString(getRecord(result, "receipt"), "receiptNumber");
  if (returnedReceipt !== receiptNumber) {
    reasons.push(
      `view-report section returned receipt ${returnedReceipt ?? "<missing>"}, expected ${receiptNumber ?? "<missing>"}`,
    );
  }

  const content = getRecord(result, "content");
  const returnedSection = getRecord(content, "section");
  const returnedSectionId = getString(returnedSection, "id");
  if (returnedSectionId !== sectionId) {
    reasons.push(
      `view-report section returned section ${returnedSectionId ?? "<missing>"}, expected ${sectionId ?? "<missing>"}`,
    );
  }

  const window = getRecord(content, "window");
  const hasMore = window?.hasMore;
  if (typeof hasMore !== "boolean") {
    reasons.push("view-report section did not return content.window.hasMore");
    return;
  }

  const startByte = window?.startByte;
  const endByte = window?.endByte;
  if (
    typeof startByte !== "number" ||
    !Number.isInteger(startByte) ||
    startByte < 0 ||
    typeof endByte !== "number" ||
    !Number.isInteger(endByte) ||
    endByte < startByte
  ) {
    reasons.push("view-report section returned invalid content.window byte bounds");
  }

  const help = getArray(envelope, "help");
  const helpText = (help ?? []).filter((entry): entry is string => typeof entry === "string");
  if (hasMore) {
    const nextStartByte = window?.nextStartByte;
    if (
      typeof nextStartByte !== "number" ||
      !Number.isInteger(nextStartByte) ||
      nextStartByte < 0 ||
      (typeof endByte === "number" && nextStartByte !== endByte)
    ) {
      reasons.push(
        "truncated view-report section did not return a valid content.window.nextStartByte continuation",
      );
    }

    if (
      typeof nextStartByte === "number" &&
      !helpText.some(
        (entry) =>
          entry.includes("Continue content") &&
          entry.includes(`content-start-byte ${nextStartByte}`),
      )
    ) {
      reasons.push(
        "truncated view-report section did not expose a matching continuation command in help[]",
      );
    }
  } else if (!helpText.some((entry) => entry.includes("toc"))) {
    reasons.push("complete view-report section omitted a TOC/navigation recovery hint");
  }
};

const reasons: string[] = [];

const companyEnvelope = runStepOrRecordFailure(
  "company lookup",
  ["search-company", "--company-name", "삼성전자", "--agent"],
  reasons,
);
const companyItems = getArray(getRecord(companyEnvelope, "result"), "items");
const companyItem = firstRecord(companyItems);
const companyCode = getString(companyItem, "companyCode");

if (companyCode !== "00126380") {
  reasons.push(
    `expected Samsung Electronics companyCode 00126380, got ${companyCode ?? "<missing>"}`,
  );
}
if (companyEnvelope !== undefined) {
  assertHelpContains(companyEnvelope, "search-company-reports", reasons);
}

const filingEnvelope = runStepOrRecordFailure(
  "company filing search",
  [
    "search-company-reports",
    "--company-code",
    companyCode ?? "00126380",
    "--start-date",
    "20250331",
    "--end-date",
    "20260331",
    "--agent",
  ],
  reasons,
);
const filingItems = getArray(getRecord(filingEnvelope, "result"), "items");
const filingItem = firstRecord(filingItems);
const receiptNumber = getString(filingItem, "receiptNumber");

if (receiptNumber === undefined || !/^20\d{12}$/.test(receiptNumber)) {
  reasons.push("company filing search did not return a usable receiptNumber");
}
if (filingEnvelope !== undefined) {
  assertHelpContains(filingEnvelope, "view-report", reasons);
}

const tocEnvelope = runStepOrRecordFailure(
  "report TOC",
  [
    "view-report",
    "--receipt",
    receiptNumber ?? "20260331004166",
    "--toc-depth",
    "1",
  ],
  reasons,
);
const toc = getArray(getRecord(tocEnvelope, "result"), "toc");
const firstToc = firstRecord(toc);
const sectionId = getString(firstToc, "id");

if (sectionId === undefined) {
  reasons.push("view-report TOC did not return a first toc[].id");
}
if (tocEnvelope !== undefined) {
  assertHelpContains(tocEnvelope, "section", reasons);
}

const sectionEnvelope = runStepOrRecordFailure(
  "report section",
  [
    "view-report",
    "--receipt",
    receiptNumber ?? "20260331004166",
    "--section-id",
    sectionId ?? "section:1",
    "--max-bytes",
    "2000",
  ],
  reasons,
);
const content = getRecord(getRecord(sectionEnvelope, "result"), "content");
const body = getString(content, "body");

if (body === undefined || body.length === 0) {
  reasons.push("view-report section did not return content.body");
}
if (sectionEnvelope !== undefined) {
  assertSectionWindow(sectionEnvelope, receiptNumber, sectionId, reasons);
}

if (reasons.length > 0) {
  console.error(`\nWorkflow eval failed: ${reasons.join("; ")}`);
  process.exitCode = 1;
} else {
  console.log("\nWorkflow CLI eval passed.");
}
