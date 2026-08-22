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
  return typeof request.headers["user-agent"] === "string";
};

const server = createServer((request, response) => {
  const chunks = [];
  request.on("data", (chunk) => chunks.push(chunk));
  request.on("end", () => {
    const body = Buffer.concat(chunks).toString("utf8");
    const fixtureCase = cases.find((candidate) => matches(candidate, request, body));
    if (fixtureCase === undefined) {
      response.writeHead(404, { "content-type": "text/plain; charset=UTF-8" });
      response.end(`No fixture matched ${request.method} ${request.url}`);
      return;
    }

    const send = () => {
      const fixtureBody = readFileSync(join(fixtureRoot, fixtureCase.response.bodyPath));
      response.writeHead(fixtureCase.response.status, {
        "content-type": fixtureCase.response.contentType,
      });
      response.end(fixtureBody);
    };
    const delay = Number.parseInt(process.env.DARTY_FIXTURE_DELAY_MS ?? "0", 10);
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
