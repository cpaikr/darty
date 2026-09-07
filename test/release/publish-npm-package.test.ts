import { describe, expect, test } from "bun:test";

import { completeNpmPublication } from "../../scripts/publish-npm-package.mjs";

const input = {
  packageName: "@sjunepark/darty",
  packageVersion: "0.6.0",
  tarball: "/verified/darty.tgz",
  integrity: "sha512-release-integrity",
};
const integrity = "sha512-release-integrity";
const success = (value: unknown = "") => ({
  status: 0,
  stdout: typeof value === "string" ? value : JSON.stringify(value),
  stderr: "",
});
const failure = (code: string, message = code) => ({
  status: 1,
  stdout: JSON.stringify({ error: { code } }),
  stderr: message,
});

describe("completeNpmPublication", () => {
  test("verifies matching immutable package bytes without publishing", () => {
    const responses = [
      success({ version: input.packageVersion, "dist.integrity": integrity }),
    ];
    const calls: string[][] = [];
    const result = completeNpmPublication(input, (args) => {
      calls.push(args);
      return responses.shift()!;
    });

    expect(result).toEqual({ disposition: "verified", integrity });
    expect(calls).toHaveLength(1);
  });

  test("refuses an existing version with different package bytes", () => {
    const responses = [
      success({ version: input.packageVersion, "dist.integrity": "sha512-different" }),
    ];

    expect(() =>
      completeNpmPublication(input, () => responses.shift()!),
    ).toThrow("different package bytes");
  });

  test("publishes only after a definite missing version and known package", () => {
    const responses = [
      failure("E404"),
      success(JSON.stringify(input.packageName)),
      success(),
      success({ version: input.packageVersion, "dist.integrity": integrity }),
    ];
    const calls: string[][] = [];
    const result = completeNpmPublication(input, (args) => {
      calls.push(args);
      return responses.shift()!;
    });

    expect(result).toEqual({ disposition: "published" });
    expect(calls[2]).toEqual(["publish", input.tarball, "--ignore-scripts", "--access", "public"]);
  });

  test.each(["E401", "E500", "EAI_AGAIN"]) (
    "fails closed on uncertain lookup error %s",
    (code) => {
      let calls = 0;
      expect(() =>
        completeNpmPublication(input, () => {
          calls += 1;
          return failure(code);
        }),
      ).toThrow(`Could not inspect ${input.packageName}@${input.packageVersion}`);
      expect(calls).toBe(1);
    },
  );

  test("does not publish when the base package cannot be verified", () => {
    const responses = [failure("E404"), failure("E401")];
    expect(() =>
      completeNpmPublication(input, () => responses.shift()!),
    ).toThrow("Could not distinguish an absent");
  });

  test("reports publication failure without claiming completion", () => {
    const responses = [
      failure("E404"),
      success(JSON.stringify(input.packageName)),
      failure("E500", "registry unavailable"),
    ];
    expect(() =>
      completeNpmPublication(input, () => responses.shift()!),
    ).toThrow("Could not publish");
  });

  test("does not complete when publication readback differs from the certified archive", () => {
    const responses = [
      failure("E404"),
      success(JSON.stringify(input.packageName)),
      success(),
      success({ version: input.packageVersion, "dist.integrity": "sha512-wrong" }),
    ];
    expect(() => completeNpmPublication(input, () => responses.shift()!)).toThrow("registry identity or integrity differs");
  });

  test("rejects prerelease and leading-zero versions before registry access", () => {
    for (const packageVersion of ["0.6.0-beta.1", "00.6.0"]) {
      let calls = 0;
      expect(() =>
        completeNpmPublication({ ...input, packageVersion }, () => {
          calls += 1;
          return success();
        }),
      ).toThrow("Invalid stable npm package version");
      expect(calls).toBe(0);
    }
  });
});
