import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";

const defaultOutdir = "dist-bin";
const entrypoint = "src/cli.ts";

type BinaryTarget = {
  readonly bunTarget: string;
  readonly assetPlatform: string;
  readonly assetArch: string;
  readonly executableName: string;
  readonly archiveType: "tar.gz" | "zip";
};

const targets: readonly BinaryTarget[] = [
  {
    bunTarget: "bun-darwin-arm64",
    assetPlatform: "macos",
    assetArch: "arm64",
    executableName: "darty",
    archiveType: "tar.gz",
  },
  {
    bunTarget: "bun-darwin-x64",
    assetPlatform: "macos",
    assetArch: "x64",
    executableName: "darty",
    archiveType: "tar.gz",
  },
  {
    bunTarget: "bun-linux-x64",
    assetPlatform: "linux",
    assetArch: "x64",
    executableName: "darty",
    archiveType: "tar.gz",
  },
  {
    bunTarget: "bun-linux-arm64",
    assetPlatform: "linux",
    assetArch: "arm64",
    executableName: "darty",
    archiveType: "tar.gz",
  },
  {
    bunTarget: "bun-windows-x64",
    assetPlatform: "windows",
    assetArch: "x64",
    executableName: "darty.exe",
    archiveType: "zip",
  },
];

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  version?: string;
};

if (!packageJson.version) {
  throw new Error("package.json is missing version.");
}

const parseArgs = (argv: readonly string[]) => {
  let outdir = defaultOutdir;
  const selectedTargets: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--outdir") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --outdir.");
      }
      outdir = value;
      index += 1;
      continue;
    }

    if (arg === "--target") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("Missing value for --target.");
      }
      selectedTargets.push(...value.split(",").filter(Boolean));
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { outdir, selectedTargets };
};

const run = (cmd: string[]) => {
  const result = Bun.spawnSync({
    cmd,
    stdout: "inherit",
    stderr: "inherit",
  });

  if (result.exitCode !== 0) {
    throw new Error(`Command failed with exit code ${result.exitCode}: ${cmd.join(" ")}`);
  }
};

const checksumFile = (path: string): string => {
  const hash = createHash("sha256");
  hash.update(readFileSync(path));
  return hash.digest("hex");
};

const createArchive = (target: BinaryTarget, executablePath: string, releaseDir: string) => {
  const archiveBase = `darty-v${packageJson.version}-${target.assetPlatform}-${target.assetArch}`;
  const archiveName = `${archiveBase}.${target.archiveType}`;
  const archivePath = join(releaseDir, archiveName);

  if (target.archiveType === "zip") {
    run(["zip", "-j", "-q", archivePath, executablePath]);
  } else {
    run([
      "tar",
      "-czf",
      archivePath,
      "-C",
      dirname(executablePath),
      basename(executablePath),
    ]);
  }

  return { archiveName, archivePath };
};

const { outdir, selectedTargets } = parseArgs(Bun.argv.slice(2));
const selectedTargetSet = new Set(selectedTargets);
const buildTargets = selectedTargets.length === 0
  ? targets
  : targets.filter((target) => selectedTargetSet.has(target.bunTarget));

const unknownTargets = selectedTargets.filter(
  (selectedTarget) => !targets.some((target) => target.bunTarget === selectedTarget),
);

if (unknownTargets.length > 0) {
  throw new Error(`Unknown binary target(s): ${unknownTargets.join(", ")}`);
}

if (buildTargets.length === 0) {
  throw new Error("No binary targets selected.");
}

const workDir = join(outdir, "work");
const releaseDir = join(outdir, "release");

rmSync(outdir, { recursive: true, force: true });
mkdirSync(workDir, { recursive: true });
mkdirSync(releaseDir, { recursive: true });

const checksums: string[] = [];

for (const target of buildTargets) {
  const targetDir = join(workDir, `${target.assetPlatform}-${target.assetArch}`);
  const executablePath = join(targetDir, target.executableName);

  mkdirSync(targetDir, { recursive: true });

  run([
    "bun",
    "build",
    entrypoint,
    "--compile",
    `--target=${target.bunTarget}`,
    "--outfile",
    executablePath,
    "--no-compile-autoload-dotenv",
    "--no-compile-autoload-bunfig",
  ]);

  if (!target.executableName.endsWith(".exe")) {
    chmodSync(executablePath, 0o755);
  }

  const { archiveName, archivePath } = createArchive(target, executablePath, releaseDir);
  checksums.push(`${checksumFile(archivePath)}  ${archiveName}`);
}

writeFileSync(join(releaseDir, "checksums.txt"), `${checksums.join("\n")}\n`);

console.log(`Built ${buildTargets.length} standalone binary release asset(s) in ${releaseDir}`);
