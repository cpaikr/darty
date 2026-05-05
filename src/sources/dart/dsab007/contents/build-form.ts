import type { SourceContentsReplayInput } from "./replay-schema.ts";

const orEmpty = (value: string | undefined): string => value ?? "";

export const buildContentsSearchForm = (
  input: SourceContentsReplayInput,
): URLSearchParams => {
  const params = new URLSearchParams();

  params.set("currentPage", String(input.currentPage));
  params.set("maxResults", String(input.maxResults));
  params.set("maxLinks", String(input.maxLinks));
  params.set("sort", input.sort);
  params.set("sortType", input.sortType);
  params.set("textCrpCik", orEmpty(input.textCrpCik));
  params.set("lateKeyword", "");
  params.set("flrCik", "");
  params.set("dspTypeTab", "");
  params.set("isSort", "false");
  params.set("isTab", "false");
  params.set("tocSrch", "");
  params.set("b_textCrpCik", orEmpty(input.textCrpCik));
  params.set("b_flrCik", "");
  params.set("b_keyword", input.keyword);
  params.set("b_docType", "");
  params.set("b_textPresenterNm", orEmpty(input.textPresenterNm));
  params.set("b_reportName", orEmpty(input.reportName));
  params.set("b_startDate", input.startDate);
  params.set("b_endDate", input.endDate);
  params.set("b_dspType", "");
  params.set("b_synonym", "");
  params.set("b_reSearch", "");
  params.set("reportNamePopYn", "");
  params.set("autoSearch", "N");
  params.set("option", input.option);
  params.set("keyword", input.keyword);
  params.set("textCrpNm", orEmpty(input.textCrpNm));
  params.set("textPresenterNm", orEmpty(input.textPresenterNm));
  params.set("startDate", input.startDate);
  params.set("endDate", input.endDate);
  params.set("decadeType", "");
  params.set("docType", "");
  params.set("reportName", orEmpty(input.reportName));

  return params;
};
