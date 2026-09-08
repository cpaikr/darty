// Comparison-baseline test seam. This file is never part of a shipped artifact.
const origin = process.env.DARTY_FIXTURE_ORIGIN;
if (!origin || !/^http:\/\/127\.0\.0\.1:\d+\/?$/.test(origin)) {
  throw new Error("The TypeScript comparison baseline requires a loopback fixture origin.");
}
const fetchFixture = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const request = new Request(input, init);
  const url = new URL(request.url);
  if (url.origin !== "https://dart.fss.or.kr") throw new Error("Unexpected baseline source origin.");
  const target = new URL(url.pathname + url.search, origin);
  return fetchFixture(new Request(target, request), { redirect: "manual" });
};
const OriginalDate = globalThis.Date;
const timestamp = Date.parse(process.env.DARTY_FIXTURE_FETCHED_AT);
if (!Number.isFinite(timestamp)) throw new Error("Missing fixture timestamp.");
globalThis.Date = class extends OriginalDate {
  constructor(...args) { super(...(args.length === 0 ? [timestamp] : args)); }
  static now() { return timestamp; }
};
