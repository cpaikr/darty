#!/usr/bin/env node

import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const fixtureRoot = join(repoRoot, "fixtures/dart/vertical-v1");
const manifest = JSON.parse(readFileSync(join(fixtureRoot, "manifest.json"), "utf8"));
const readyPath = process.argv[2];
const faultId = process.env.DARTY_FIXTURE_FAULT;
const faultPhase = process.env.DARTY_FIXTURE_FAULT_PHASE;
const faultDelayScale = Number.parseFloat(process.env.DARTY_FIXTURE_FAULT_DELAY_SCALE ?? "1");
const faultFast = process.env.DARTY_FIXTURE_FAULT_FAST === "1";
const responseDelay = Number.parseInt(process.env.DARTY_FIXTURE_DELAY_MS ?? "0", 10);
const firstResponseDelay = Number.parseInt(
  process.env.DARTY_FIXTURE_DELAY_FIRST_MS ?? "0",
  10,
);
const requestMarkerPath = process.env.DARTY_FIXTURE_REQUEST_MARKER;
let requestCount = 0;

if (readyPath === undefined) {
  throw new Error("Expected a ready-file path.");
}

const enabledCases = new Set([
  "company-populated",
  "reports-populated",
  "report-shell-toc",
  "report-content-utf8",
]);
const cases = manifest.cases.filter((fixtureCase) => enabledCases.has(fixtureCase.id));
const faults = new Map((manifest.faults ?? []).map((fault) => [fault.id, fault]));

if (faultId !== undefined && !faults.has(faultId)) {
  throw new Error(`Unknown fixture fault ${faultId}.`);
}
if (!Number.isFinite(faultDelayScale) || faultDelayScale <= 0) {
  throw new Error("DARTY_FIXTURE_FAULT_DELAY_SCALE must be a positive number.");
}

const entriesToObject = (entries) => {
  const result = {};
  for (const [key, value] of entries) {
    const previous = result[key];
    if (previous === undefined) result[key] = value;
    else if (Array.isArray(previous)) previous.push(value);
    else result[key] = [previous, value];
  }
  return result;
};

const transmittedFields = (fields) =>
  Object.fromEntries(
    Object.entries(fields).filter(([, value]) => !Array.isArray(value) || value.length > 0),
  );

const matches = (fixtureCase, request, body) => {
  const expected = fixtureCase.request;
  if (request.method !== expected.method) return false;
  const url = new URL(request.url, "http://127.0.0.1");
  if (url.pathname !== expected.path) return false;
  if (
    !isDeepStrictEqual(
      entriesToObject(url.searchParams),
      transmittedFields(expected.query ?? {}),
    )
  ) {
    return false;
  }
  if (
    !isDeepStrictEqual(
      entriesToObject(new URLSearchParams(body)),
      transmittedFields(expected.form ?? {}),
    )
  ) {
    return false;
  }
  if (expected.form !== undefined) {
    if (request.headers["content-type"] !== expected.headers["content-type"]) return false;
    if (request.headers.referer !== expected.headers.referer) return false;
  }
  return (
    typeof request.headers["user-agent"] === "string" &&
    request.headers["user-agent"].length > 0
  );
};

const bytesForRecipe = (recipe) => {
  if (recipe.seedPath === undefined) {
    return Buffer.alloc(recipe.bodyBytes ?? 0, 0x78);
  }

  const seed = readFileSync(join(fixtureRoot, recipe.seedPath));
  const target = recipe.repeatToBytes;
  if (!Number.isInteger(target) || target < 0) {
    throw new Error("Fixture seed recipe must declare a non-negative repeatToBytes.");
  }
  const body = Buffer.allocUnsafe(target);
  for (let offset = 0; offset < target; offset += seed.length) {
    seed.copy(body, offset, 0, Math.min(seed.length, target - offset));
  }
  return body;
};

const faultAppliesToRequest = (request, fixtureCase) => {
  if (faultId === undefined) return false;
  const fault = faults.get(faultId);
  if (fault === undefined || !fault.operationIds.includes(fixtureCase.operationId)) return false;
  if (faultPhase === "shell") return request.url?.startsWith("/dsaf001/main.do") === true;
  if (faultPhase === "content") return request.url?.startsWith("/report/viewer.do") === true;
  return true;
};

const writeFaultResponse = (request, response, fault) => {
  const recipe = fault.recipe;
  if (response.destroyed) return undefined;
  const delay = (milliseconds) =>
    Math.max(1, Math.round(milliseconds * faultDelayScale));
  if (recipe.stallDuringConnectMilliseconds !== undefined) {
    // Node's HTTP server accepts the loopback connection immediately. Keep
    // the manifest recipe's delayed-header shape as a bounded transport
    // failure equivalent; this path does not prove a deadline duration.
    return setTimeout(
      () => {
        if (faultFast) response.destroy();
        else {
          writeFaultResponse(request, response, {
            ...fault,
            recipe: { ...recipe, stallDuringConnectMilliseconds: undefined },
          });
        }
      },
      delay(recipe.stallDuringConnectMilliseconds),
    );
  }
  if (recipe.stallAfterRequestMilliseconds !== undefined) {
    return setTimeout(
      () => {
        if (faultFast) response.destroy();
        else {
          writeFaultResponse(request, response, {
            ...fault,
            recipe: { ...recipe, stallAfterRequestMilliseconds: undefined },
          });
        }
      },
      delay(recipe.stallAfterRequestMilliseconds),
    );
  }

  const status = recipe.status ?? 200;
  const body = bytesForRecipe(recipe);
  const headers = { "content-type": recipe.contentType ?? "text/html; charset=UTF-8" };
  if (recipe.location !== undefined) headers.location = recipe.location;

  if (recipe.initialBodyBytes !== undefined) {
    const initial = Math.min(recipe.initialBodyBytes, body.length || recipe.initialBodyBytes);
    const prefix = body.length > 0 ? body.subarray(0, initial) : Buffer.alloc(initial, 0x78);
    const stalledLength = Math.max(prefix.length + 1, body.length);
    headers["content-length"] = String(stalledLength);
    response.writeHead(status, headers);
    response.write(prefix);
    return setTimeout(() => response.destroy(), delay(recipe.stallAfterBodyMilliseconds ?? 0));
  }
  response.writeHead(status, headers);
  response.end(body);
  return undefined;
};

const server = createServer((request, response) => {
  const chunks = [];
  request.on("data", (chunk) => chunks.push(chunk));
  request.on("end", () => {
    requestCount += 1;
    if (requestMarkerPath !== undefined) {
      writeFileSync(requestMarkerPath, `${requestCount}\n`, "utf8");
    }
    const body = Buffer.concat(chunks).toString("utf8");
    const fixtureCase = cases.find((candidate) => matches(candidate, request, body));
    if (fixtureCase === undefined) {
      response.writeHead(404, { "content-type": "text/plain; charset=UTF-8" });
      response.end(`No fixture matched ${request.method} ${request.url}`);
      return;
    }

    const fault = faultId === undefined ? undefined : faults.get(faultId);
    if (fault !== undefined && faultAppliesToRequest(request, fixtureCase)) {
      // Fast reset is only a bounded transport-failure equivalent. Deadline
      // timing is covered by the Rust fixture-origin integration tests.
      writeFaultResponse(request, response, fault);
      return;
    }

    const send = () => {
      const fixtureBody = readFileSync(join(fixtureRoot, fixtureCase.response.bodyPath));
      response.writeHead(fixtureCase.response.status, {
        "content-type": fixtureCase.response.contentType,
      });
      response.end(fixtureBody);
    };
    const delay = requestCount === 1 ? firstResponseDelay : responseDelay;
    if (delay > 0) setTimeout(send, delay);
    else send();
  });
});

server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  if (typeof address === "object" && address !== null) {
    writeFileSync(readyPath, `http://127.0.0.1:${address.port}/`, "utf8");
  }
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
