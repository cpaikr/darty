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
  params.set("textPresenterNm", input.textPresenterNm ?? "");
  params.set("reportName", input.reportName ?? "");
  params.set("reportName2", input.reportName ?? "");
  for (const publicType of input.publicTypes) {
    params.append("publicType", publicType);
  }
  params.set("startDate", input.startDate);
  params.set("endDate", input.endDate);
  params.set("finalReport", input.finalReportOnly ? "recent" : "");
  params.set("businessCode", input.businessCode);
  params.set("businessNm", input.businessCode === "all" ? "전체" : "");
  params.set("corporationType", input.corporationType);
  params.set("closingAccountsMonth", input.closingAccountsMonth);
  params.set("autoSearch", "N");
  params.set("autoSearchCorp", "Y");

  return params;
};
