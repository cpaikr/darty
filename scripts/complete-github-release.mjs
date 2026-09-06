#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const RELEASE_FIELDS = [
  "tagName",
  "isDraft",
  "isPrerelease",
  "name",
  "body",
  "url",
].join(",");

function fail(message) {
  throw new Error(message);
}

function validateInputs({ repository, sourceTag, sourceSha }) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    fail(`Invalid GitHub repository name: ${repository}`);
  }
  if (!/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(sourceTag)) {
    fail(`Invalid stable source tag: ${sourceTag}`);
  }
  if (!/^[0-9a-f]{40}$/.test(sourceSha)) {
    fail(`Invalid source commit SHA: ${sourceSha}`);
  }
}

// The workflow verifies the tag's peeled commit before calling this helper.
// GitHub's targetCommitish metadata may be a branch; it is not tag identity.
export function verifyRelease(release, { sourceTag }) {
  if (release.tagName !== sourceTag) {
    fail(`GitHub Release tag ${release.tagName ?? "<missing>"} does not match ${sourceTag}.`);
  }
  if (release.isDraft !== false) {
    fail(`GitHub Release ${sourceTag} must be published, not draft.`);
  }
  if (release.isPrerelease !== false) {
    fail(`GitHub Release ${sourceTag} must not be a prerelease.`);
  }
  if (typeof release.name !== "string" || release.name.trim().length === 0) {
    fail(`GitHub Release ${sourceTag} has no title.`);
  }
  if (typeof release.body !== "string" || release.body.trim().length === 0) {
    fail(`GitHub Release ${sourceTag} has no release notes.`);
  }
  if (typeof release.url !== "string" || release.url.length === 0) {
    fail(`GitHub Release ${sourceTag} has no public URL.`);
  }

  return release;
}

function parseRelease(result, expected) {
  if (result.status !== 0) {
    return null;
  }

  let release;
  try {
    release = JSON.parse(result.stdout);
  } catch (error) {
    fail(`GitHub CLI returned invalid release JSON: ${error.message}`);
  }
  return verifyRelease(release, expected);
}

function isMissingRelease(result) {
  return result.status !== 0 && /release not found|HTTP 404/i.test(result.stderr);
}

function formatFailure(result) {
  return result.stderr.trim() || result.stdout.trim() || `exit status ${result.status}`;
}

export function completeGitHubRelease(
  { repository, sourceTag, sourceSha },
  runGh,
) {
  validateInputs({ repository, sourceTag, sourceSha });
  const expected = { sourceTag };
  const viewArgs = [
    "release",
    "view",
    sourceTag,
    "--repo",
    repository,
    "--json",
    RELEASE_FIELDS,
  ];

  const initialView = runGh(viewArgs);
  const existingRelease = parseRelease(initialView, expected);
  if (existingRelease) {
    return { disposition: "verified", release: existingRelease };
  }
  if (!isMissingRelease(initialView)) {
    fail(`Could not inspect GitHub Release ${sourceTag}: ${formatFailure(initialView)}`);
  }

  const createResult = runGh([
    "release",
    "create",
    sourceTag,
    "--repo",
    repository,
    "--target",
    sourceSha,
    "--verify-tag",
    "--generate-notes",
  ]);

  const finalView = runGh(viewArgs);
  const release = parseRelease(finalView, expected);
  if (!release) {
    const creationFailure =
      createResult.status === 0 ? "creation reported success" : formatFailure(createResult);
    fail(
      `GitHub Release ${sourceTag} could not be verified after ${creationFailure}: ${formatFailure(finalView)}`,
    );
  }

  return {
    disposition: createResult.status === 0 ? "created" : "verified-after-race",
    release,
  };
}

function systemGh(args) {
  const result = spawnSync("gh", args, {
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) {
    fail(`Could not execute GitHub CLI: ${result.error.message}`);
  }
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function parseArguments(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const option = argv[index];
    const value = argv[index + 1];
    if (!option?.startsWith("--") || value === undefined) {
      fail("Usage: complete-github-release.mjs --repository OWNER/REPO --tag vX.Y.Z --sha COMMIT_SHA");
    }
    values[option.slice(2)] = value;
  }
  return {
    repository: values.repository,
    sourceTag: values.tag,
    sourceSha: values.sha,
  };
}

async function main() {
  const input = parseArguments(process.argv.slice(2));
  const result = completeGitHubRelease(input, systemGh);
  console.log(
    `${result.disposition}: GitHub Release ${result.release.tagName} (${result.release.url})`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
