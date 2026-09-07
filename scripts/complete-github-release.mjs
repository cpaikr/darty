#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { digest, verifyBundle } from "./standalone.mjs";

const RELEASE_FIELDS = "tagName,isDraft,isPrerelease,name,body,url,assets";

export function verifyRelease(release, { sourceTag }, allowDraft = false) {
  assert.equal(release.tagName, sourceTag, "GitHub Release tag does not match validated source");
  assert.equal(release.isPrerelease, false, "GitHub Release must not be a prerelease");
  assert.equal(typeof release.isDraft, "boolean", "Invalid draft state");
  if (!allowDraft) assert.equal(release.isDraft, false, "GitHub Release must be published");
  for (const field of ["name", "body", "url"]) {
    assert.ok(typeof release[field] === "string" && release[field].trim(), `GitHub Release has no ${field}`);
  }
  assert.ok(Array.isArray(release.assets), "Release assets are missing");
  return release;
}

export function completeGitHubRelease({ repository, sourceTag, sourceSha, directory }, runGh) {
  assert.match(repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
  assert.match(sourceTag, /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  assert.match(sourceSha, /^[a-f0-9]{40}$/);
  const { manifest, files } = verifyBundle(directory, sourceSha);
  assert.equal(manifest.tag, sourceTag, "Source tag differs from release bundle");
  const expected = { sourceTag };
  const checked = (args) => {
    const result = runGh(args);
    assert.equal(result.status, 0, `gh ${args.slice(0, 2).join(" ")} failed: ${result.stderr || result.stdout}`);
    return result.stdout.trim();
  };
  const verifyTag = () => {
    // Resolve the tag itself, including annotated tags, rather than targetCommitish metadata.
    assert.equal(checked(["api", `repos/${repository}/commits/${sourceTag}`, "--jq", ".sha"]), sourceSha, "Remote tag no longer identifies the certified source");
  };
  const readRelease = () => {
    const result = runGh(["release", "view", sourceTag, "--repo", repository, "--json", RELEASE_FIELDS]);
    if (result.status !== 0 && /^release not found(?: \(HTTP 404\))?\s*$/i.test(result.stderr)) return null;
    assert.equal(result.status, 0, `Could not inspect GitHub Release: ${result.stderr || result.stdout}`);
    return verifyRelease(JSON.parse(result.stdout), expected, true);
  };
  const verifyDownloads = (release, complete) => {
    const names = release.assets.map(({ name }) => name).sort();
    assert.equal(new Set(names).size, names.length, "Duplicate release assets");
    assert.ok(names.every((name) => files.includes(name)), "Unexpected release assets");
    if (complete) assert.deepEqual(names, [...files].sort(), "Release is missing required assets");
    if (!names.length) return;
    const downloaded = mkdtempSync(join(tmpdir(), "darty-release-download-"));
    try {
      checked(["release", "download", sourceTag, "--repo", repository, "--dir", downloaded]);
      assert.deepEqual(readdirSync(downloaded).sort(), names, "Downloaded release inventory changed");
      for (const name of names) {
        assert.equal(digest(readFileSync(join(downloaded, name))), digest(readFileSync(join(directory, name))),
          `Remote ${name} differs from the certified bundle; existing assets were not changed`);
      }
    } finally {
      rmSync(downloaded, { recursive: true, force: true });
    }
  };

  verifyTag();
  let release = readRelease();
  const existed = release !== null;
  if (!release) {
    const created = runGh(["release", "create", sourceTag, "--repo", repository,
      "--target", sourceSha, "--verify-tag", "--draft", "--title", sourceTag, "--generate-notes"]);
    release = readRelease();
    assert.ok(release, `Draft could not be verified after creation: ${created.stderr || created.stdout}`);
  }
  verifyDownloads(release, !release.isDraft);
  if (release.isDraft) {
    const existing = new Set(release.assets.map(({ name }) => name));
    const missing = files.filter((name) => !existing.has(name));
    if (missing.length) {
      checked(["release", "upload", sourceTag, "--repo", repository, ...missing.map((name) => resolve(directory, name))]);
    }
    release = readRelease();
    assert.ok(release, "Draft disappeared during upload");
    verifyDownloads(release, true);
    verifyTag();
    if (release.isDraft) checked(["release", "edit", sourceTag, "--repo", repository, "--draft=false"]);
  }
  release = readRelease();
  assert.ok(release, "Release disappeared after publication");
  verifyRelease(release, expected);
  verifyDownloads(release, true);
  return { disposition: existed ? "verified-or-resumed" : "published", release };
}

function systemGh(args) {
  const result = spawnSync("gh", args, { encoding: "utf8", timeout: 300_000 });
  if (result.error) throw new Error(`Could not execute GitHub CLI: ${result.error.message}`);
  return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    const options = {};
    for (let index = 0; index < args.length; index += 2) {
      assert.ok(["--repository", "--tag", "--sha", "--directory"].includes(args[index]) && args[index + 1], "Expected --repository OWNER/REPO --tag vX.Y.Z --sha SHA --directory BUNDLE");
      options[args[index]] = args[index + 1];
    }
    const result = completeGitHubRelease({ repository: options["--repository"], sourceTag: options["--tag"], sourceSha: options["--sha"], directory: resolve(options["--directory"]) }, systemGh);
    console.log(`${result.disposition}: ${result.release.url}`);
  } catch (error) {
    console.error(`${error.message}\nRelease completion stopped. Existing tags/assets were not replaced; inspect the draft or published release before retrying.`);
    process.exitCode = 1;
  }
}
