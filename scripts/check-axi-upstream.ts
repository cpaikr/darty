type JsonRecord = Record<string, unknown>;

type ComplianceScope = {
  summary: string;
  localEvidence: string[];
  upstreamEvidence: string[];
};

type AxiBaseline = {
  name: string;
  repository: string;
  owner: string;
  repo: string;
  branch: string;
  baselineCommit: string;
  observedAt: string;
  upstreamVersion?: Record<string, string>;
  complianceScope: ComplianceScope;
  watchedPaths: string[];
};

type CompareCommit = {
  sha: string;
  commit: {
    message: string;
    author?: {
      name?: string;
      date?: string;
    };
  };
  html_url: string;
};

type CompareFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
};

type CompareResponse = {
  html_url: string;
  status: string;
  ahead_by: number;
  behind_by: number;
  total_commits: number;
  commits: CompareCommit[];
  files?: CompareFile[];
};

type CheckResult = {
  baseline: AxiBaseline;
  latestCommit: string;
  compare?: CompareResponse;
  compareError?: string;
};

const DEFAULT_BASELINE_PATH = "docs/upstreams/axi-baseline.json";
const FULL_SHA_PATTERN = /^[a-f0-9]{40}$/;

const args = parseArgs(Bun.argv.slice(2));
const baseline = await readBaseline(args.baselinePath);
await validateLocalEvidence(baseline);
const latestCommit = await readRemoteHead(baseline);
const result: CheckResult = { baseline, latestCommit };

if (baseline.baselineCommit !== latestCommit) {
  try {
    result.compare = await readGitHubCompare(baseline, latestCommit);
  } catch (error) {
    result.compareError = error instanceof Error ? error.message : String(error);
  }
}

const report = renderReport(result);
console.log(report);

if (args.reportPath !== undefined) {
  await Bun.write(args.reportPath, report);
}

if (process.env.GITHUB_STEP_SUMMARY !== undefined) {
  await Bun.write(process.env.GITHUB_STEP_SUMMARY, `${report}\n`);
}

if (!args.allowDrift && baseline.baselineCommit !== latestCommit) {
  process.exit(1);
}

function parseArgs(argv: string[]): {
  baselinePath: string;
  reportPath?: string;
  allowDrift: boolean;
} {
  let baselinePath = DEFAULT_BASELINE_PATH;
  let reportPath: string | undefined;
  let allowDrift = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--baseline") {
      baselinePath = readRequiredValue(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--report") {
      reportPath = readRequiredValue(argv, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--allow-drift") {
      allowDrift = true;
      continue;
    }

    if (arg === "--help") {
      console.log(`Usage: bun run scripts/check-axi-upstream.ts [options]

Options:
  --baseline <path>  Baseline JSON path. Defaults to ${DEFAULT_BASELINE_PATH}
  --report <path>    Write the Markdown report to a file
  --allow-drift      Exit 0 even when upstream has advanced
`);
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return {
    baselinePath,
    ...(reportPath === undefined ? {} : { reportPath }),
    allowDrift,
  };
}

function readRequiredValue(argv: string[], index: number, flag: string): string {
  const value = argv[index + 1];

  if (value === undefined || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }

  return value;
}

async function readBaseline(path: string): Promise<AxiBaseline> {
  const parsed = await Bun.file(path).json();

  if (!isRecord(parsed)) {
    throw new Error(`${path} must contain a JSON object`);
  }

  const baseline = parseBaseline(parsed, path);
  return baseline;
}

async function validateLocalEvidence(baseline: AxiBaseline): Promise<void> {
  const missingPaths: string[] = [];

  for (const path of baseline.complianceScope.localEvidence) {
    const exists = await Bun.file(path).exists();

    if (!exists) {
      missingPaths.push(path);
    }
  }

  if (missingPaths.length > 0) {
    throw new Error(
      `AXI baseline local evidence paths are missing: ${missingPaths.join(", ")}`,
    );
  }
}

function parseBaseline(value: JsonRecord, path: string): AxiBaseline {
  const name = readString(value, "name", path);
  const repository = readString(value, "repository", path);
  const owner = readString(value, "owner", path);
  const repo = readString(value, "repo", path);
  const branch = readString(value, "branch", path);
  const baselineCommit = readString(value, "baselineCommit", path);
  const observedAt = readString(value, "observedAt", path);
  const watchedPaths = readStringArray(value, "watchedPaths", path);
  const complianceScopeValue = readRecord(value, "complianceScope", path);
  const complianceScope: ComplianceScope = {
    summary: readString(complianceScopeValue, "summary", `${path}.complianceScope`),
    localEvidence: readStringArray(
      complianceScopeValue,
      "localEvidence",
      `${path}.complianceScope`,
    ),
    upstreamEvidence: readStringArray(
      complianceScopeValue,
      "upstreamEvidence",
      `${path}.complianceScope`,
    ),
  };

  if (!FULL_SHA_PATTERN.test(baselineCommit)) {
    throw new Error(`${path}.baselineCommit must be a full 40-character SHA`);
  }

  const upstreamVersionValue = value.upstreamVersion;
  const upstreamVersion = isRecord(upstreamVersionValue)
    ? readStringRecord(upstreamVersionValue, `${path}.upstreamVersion`)
    : undefined;

  return {
    name,
    repository,
    owner,
    repo,
    branch,
    baselineCommit,
    observedAt,
    ...(upstreamVersion === undefined ? {} : { upstreamVersion }),
    complianceScope,
    watchedPaths,
  };
}

async function readRemoteHead(baseline: AxiBaseline): Promise<string> {
  const result = Bun.spawnSync({
    cmd: ["git", "ls-remote", baseline.repository, `refs/heads/${baseline.branch}`],
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = result.stdout.toString().trim();
  const stderr = result.stderr.toString().trim();

  if (result.exitCode !== 0) {
    throw new Error(`git ls-remote failed: ${stderr}`);
  }

  const [sha] = stdout.split(/\s+/);

  if (sha === undefined || !FULL_SHA_PATTERN.test(sha)) {
    throw new Error(`Could not parse ${baseline.repository} ${baseline.branch} HEAD`);
  }

  return sha;
}

async function readGitHubCompare(
  baseline: AxiBaseline,
  latestCommit: string,
): Promise<CompareResponse> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "darty-axi-upstream-check",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token === undefined || token.length === 0
      ? {}
      : { Authorization: `Bearer ${token}` }),
  };
  const response = await fetch(
    `https://api.github.com/repos/${baseline.owner}/${baseline.repo}/compare/${baseline.baselineCommit}...${latestCommit}`,
    { headers },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub compare API returned ${response.status}: ${body}`);
  }

  const parsed = await response.json();

  if (!isCompareResponse(parsed)) {
    throw new Error("GitHub compare API returned an unexpected response shape");
  }

  return parsed;
}

function renderReport(result: CheckResult): string {
  const { baseline, latestCommit } = result;
  const baselineShort = baseline.baselineCommit.slice(0, 7);
  const latestShort = latestCommit.slice(0, 7);
  const compareUrl =
    result.compare?.html_url ??
    `https://github.com/${baseline.owner}/${baseline.repo}/compare/${baseline.baselineCommit}...${latestCommit}`;

  if (baseline.baselineCommit === latestCommit) {
    return [
      "# AXI Upstream Check",
      "",
      `Darty's AXI baseline is current at \`${baselineShort}\`.`,
      "",
      `- Upstream: ${baseline.repository}`,
      `- Branch: \`${baseline.branch}\``,
      `- Observed baseline date: \`${baseline.observedAt}\``,
      `- Compliance scope: ${baseline.complianceScope.summary}`,
    ].join("\n");
  }

  const watchedFiles = result.compare?.files?.filter((file) =>
    isWatchedPath(file.filename, baseline.watchedPaths),
  );
  const otherFiles = result.compare?.files?.filter(
    (file) => !isWatchedPath(file.filename, baseline.watchedPaths),
  );

  return [
    "# AXI Upstream Drift Detected",
    "",
    `${baseline.name} has advanced from \`${baselineShort}\` to \`${latestShort}\`. Review is required before Darty should be considered current with upstream AXI.`,
    "",
    `- Upstream: ${baseline.repository}`,
    `- Branch: \`${baseline.branch}\``,
    `- Compare: ${compareUrl}`,
    `- Compliance scope: ${baseline.complianceScope.summary}`,
    ...renderCompareStats(result.compare),
    ...renderCompareError(result.compareError),
    "",
    "## Watched Path Changes",
    "",
    ...renderFiles(watchedFiles, "No watched-path changes were reported by the GitHub compare API."),
    "",
    "## Other Changed Files",
    "",
    ...renderFiles(otherFiles?.slice(0, 25), "No other changed files were reported by the GitHub compare API."),
    "",
    "## Commits",
    "",
    ...renderCommits(result.compare?.commits),
    "",
    "## Review Steps",
    "",
    "1. Review upstream AXI changes, starting with watched paths.",
    "2. Decide whether Darty's CLI contract, docs, tests, or evals need updates.",
    "3. Make required Darty changes, if any.",
    "4. Advance `docs/upstreams/axi-baseline.json` and `docs/upstreams/axi.md` after review.",
  ].join("\n");
}

function renderCompareStats(compare: CompareResponse | undefined): string[] {
  if (compare === undefined) {
    return [];
  }

  return [
    `- Compare status: \`${compare.status}\``,
    `- Commits ahead: \`${compare.ahead_by}\``,
    `- Commits behind: \`${compare.behind_by}\``,
    `- Total commits in compare: \`${compare.total_commits}\``,
  ];
}

function renderCompareError(error: string | undefined): string[] {
  if (error === undefined) {
    return [];
  }

  return ["", "GitHub compare details could not be loaded:", "", `\`${error}\``];
}

function renderFiles(files: CompareFile[] | undefined, emptyMessage: string): string[] {
  if (files === undefined || files.length === 0) {
    return [emptyMessage];
  }

  return files.map(
    (file) =>
      `- [${file.filename}](${file.blob_url}) - ${file.status}, +${file.additions}/-${file.deletions}`,
  );
}

function renderCommits(commits: CompareCommit[] | undefined): string[] {
  if (commits === undefined || commits.length === 0) {
    return ["No commit details were reported by the GitHub compare API."];
  }

  return commits.slice(0, 20).map((commit) => {
    const subject = commit.commit.message.split("\n")[0] ?? "(no subject)";
    const author = commit.commit.author?.name;
    const date = commit.commit.author?.date?.slice(0, 10);
    const suffix = [author, date].filter((value) => value !== undefined).join(", ");
    return `- [${commit.sha.slice(0, 7)}](${commit.html_url}) ${subject}${
      suffix.length === 0 ? "" : ` (${suffix})`
    }`;
  });
}

function isWatchedPath(filename: string, watchedPaths: string[]): boolean {
  return watchedPaths.some((path) => {
    const normalized = path.replace(/^\/+/, "");
    if (normalized.endsWith("/")) {
      return filename.startsWith(normalized);
    }

    return filename === normalized || filename.startsWith(`${normalized}/`);
  });
}

function readString(record: JsonRecord, key: string, source: string): string {
  const value = record[key];

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${source}.${key} must be a non-empty string`);
  }

  return value;
}

function readStringArray(record: JsonRecord, key: string, source: string): string[] {
  const value = record[key];

  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`${source}.${key} must be an array of strings`);
  }

  return value;
}

function readRecord(record: JsonRecord, key: string, source: string): JsonRecord {
  const value = record[key];

  if (!isRecord(value)) {
    throw new Error(`${source}.${key} must be an object`);
  }

  return value;
}

function readStringRecord(record: JsonRecord, source: string): Record<string, string> {
  const entries = Object.entries(record);

  if (!entries.every(([, value]) => typeof value === "string")) {
    throw new Error(`${source} must contain only string values`);
  }

  return Object.fromEntries(entries) as Record<string, string>;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCompareResponse(value: unknown): value is CompareResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.html_url === "string" &&
    typeof value.status === "string" &&
    typeof value.ahead_by === "number" &&
    typeof value.behind_by === "number" &&
    typeof value.total_commits === "number" &&
    Array.isArray(value.commits) &&
    (value.files === undefined || Array.isArray(value.files))
  );
}
