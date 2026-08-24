import { describe, expect, test } from "bun:test";

import {
  completeGitHubRelease,
  verifyRelease,
} from "../../scripts/complete-github-release.mjs";

const input = {
  repository: "cpaikr/darty",
  sourceTag: "v0.6.0",
  sourceSha: "a".repeat(40),
};

const release = {
  tagName: input.sourceTag,
  targetCommitish: input.sourceSha,
  isDraft: false,
  isPrerelease: false,
  name: input.sourceTag,
  body: "## What's Changed\n\n* Retire the old release path.",
  url: `https://github.com/cpaikr/darty/releases/tag/${input.sourceTag}`,
};

const success = (stdout = "") => ({ status: 0, stdout, stderr: "" });
const failure = (stderr: string) => ({ status: 1, stdout: "", stderr });

describe("completeGitHubRelease", () => {
  test("verifies an existing matching release without changing it", () => {
    const calls: string[][] = [];
    const result = completeGitHubRelease(input, (args) => {
      calls.push(args);
      return success(JSON.stringify(release));
    });

    expect(result.disposition).toBe("verified");
    expect(calls).toHaveLength(1);
    expect(calls[0]?.slice(0, 3)).toEqual(["release", "view", input.sourceTag]);
  });

  test("creates a missing release with generated notes and then verifies it", () => {
    const responses = [
      failure("release not found (HTTP 404)"),
      success(),
      success(JSON.stringify(release)),
    ];
    const calls: string[][] = [];
    const result = completeGitHubRelease(input, (args) => {
      calls.push(args);
      return responses.shift()!;
    });

    expect(result.disposition).toBe("created");
    expect(calls[1]).toEqual([
      "release",
      "create",
      input.sourceTag,
      "--repo",
      input.repository,
      "--target",
      input.sourceSha,
      "--verify-tag",
      "--generate-notes",
    ]);
  });

  test("accepts a valid release created by a concurrent run", () => {
    const responses = [
      failure("release not found (HTTP 404)"),
      failure("already_exists"),
      success(JSON.stringify(release)),
    ];
    const result = completeGitHubRelease(input, () => responses.shift()!);

    expect(result.disposition).toBe("verified-after-race");
  });

  test("fails closed when inspection fails for a reason other than absence", () => {
    let calls = 0;
    expect(() =>
      completeGitHubRelease(input, () => {
        calls += 1;
        return failure("authentication failed (HTTP 401)");
      }),
    ).toThrow("Could not inspect GitHub Release");
    expect(calls).toBe(1);
  });

  test("fails closed when creation does not yield a verifiable release", () => {
    const responses = [
      failure("release not found (HTTP 404)"),
      failure("creation failed"),
      failure("release not found (HTTP 404)"),
    ];
    expect(() =>
      completeGitHubRelease(input, () => responses.shift()!),
    ).toThrow("could not be verified");
  });
});

describe("verifyRelease", () => {
  test.each([
    [{ ...release, targetCommitish: "b".repeat(40) }, "does not match"],
    [{ ...release, isDraft: true }, "must be published"],
    [{ ...release, isPrerelease: true }, "must not be a prerelease"],
    [{ ...release, name: "" }, "has no title"],
    [{ ...release, body: "" }, "has no release notes"],
    [{ ...release, url: "" }, "has no public URL"],
  ])("rejects mismatched release identity or state", (candidate, message) => {
    expect(() => verifyRelease(candidate, input)).toThrow(message);
  });
});
