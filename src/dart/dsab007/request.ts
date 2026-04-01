import type { ContentsSearchInput } from "./contracts.ts";

const orEmpty = (value: string | undefined): string => value ?? "";

/**
 * Expands the public low-level request into the full form payload DART expects.
 *
 * The duplicated `b_*` fields and fixed flags are part of the observed replay
 * contract today, even though they are not all meaningful at the caller boundary.
 */
export const buildContentsSearchForm = (
  input: ContentsSearchInput,
): URLSearchParams => {
  const params = new URLSearchParams();

  params.set("currentPage", String(input.currentPage));
  params.set("maxResults", String(input.maxResults));
  params.set("maxLinks", String(input.maxLinks));
  params.set("sort", input.sort);
  params.set("sortType", input.sortType);
  params.set("textCrpCik", orEmpty(input.textCrpCik));
  params.set("lateKeyword", orEmpty(input.lateKeyword));
  params.set("flrCik", orEmpty(input.flrCik));
  params.set("dspTypeTab", orEmpty(input.dspTypeTab));
  params.set("isSort", "false");
  params.set("isTab", "false");
  params.set("tocSrch", orEmpty(input.tocSrch));
  params.set("b_textCrpCik", orEmpty(input.textCrpCik));
  params.set("b_flrCik", orEmpty(input.flrCik));
  params.set("b_keyword", input.keyword);
  params.set("b_docType", orEmpty(input.docType));
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
  params.set("decadeType", orEmpty(input.decadeType));
  params.set("docType", orEmpty(input.docType));
  params.set("reportName", orEmpty(input.reportName));

  return params;
};
