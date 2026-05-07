import type { SourceCompanyReplayInput } from "./replay-schema.ts";

export const buildCompanySearchForm = (
  input: SourceCompanyReplayInput,
): URLSearchParams => {
  const params = new URLSearchParams();

  params.set("currentPage", String(input.currentPage));
  params.set("maxResults", String(input.maxResults));
  params.set("maxLinks", "10");
  params.set("sort", "");
  params.set("series", "");
  params.set("gubun", "");
  params.set("selectKey", "");
  params.set("searchIndex", "");
  params.set("textCrpCik", "");
  params.set("autoSearch", "true");
  params.set("businessCode", "all");
  params.set("bsnRgsNo", "");
  params.set("corpTypeAll", "all");
  params.set("autoSearchCorp", "Y");
  params.set("searchType", input.searchType);
  params.set("textCrpNm", input.textCrpNm);
  params.set("bsnRgsNo_1", "");
  params.set("bsnRgsNo_2", "");
  params.set("bsnRgsNo_3", "");
  params.set("crpRgsNo", "");
  params.append("corpType", "P");
  params.append("corpType", "A");
  params.append("corpType", "X");
  params.append("corpType", "E");

  return params;
};
