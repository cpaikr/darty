import type { SourceCompanyReportsReplayInput } from "./replay-schema.ts";

export const buildCompanyReportsSearchForm = (
  input: SourceCompanyReportsReplayInput,
): URLSearchParams => {
  const params = new URLSearchParams();

  params.set("currentPage", String(input.currentPage));
  params.set("maxResults", String(input.maxResults));
  params.set("maxLinks", String(input.maxLinks));
  params.set("sort", input.sort);
  params.set("series", input.series);
  params.set("option", input.option);
  params.set("textCrpNm", "");
  params.set("textCrpNm2", "");
  params.set("textCrpCik", input.textCrpCik);
  params.set("startDate", input.startDate);
  params.set("endDate", input.endDate);
  params.set("finalReport", input.finalReportOnly ? "recent" : "");
  params.set("businessCode", "all");
  params.set("businessNm", "전체");
  params.set("corporationType", "all");
  params.set("closingAccountsMonth", "all");
  params.set("autoSearch", "N");
  params.set("autoSearchCorp", "Y");

  return params;
};
