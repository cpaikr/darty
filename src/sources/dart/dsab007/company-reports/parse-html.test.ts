import { describe, expect, test } from "bun:test";
import { Effect } from "effect";

import { parseCompanyReportsSearchHtml } from "./parse-html.ts";

const populatedHtml = `
<div class="tbListInner">
<table class="tbList">
  <tbody id="tbody">
    <tr>
      <td>1</td>
      <td class="tL">
        <span class="innerWrap">
          <span class="tagCom_kospi" title="유가증권시장">유</span>
          <a href="javascript:openCorpInfoNew('00190321', 'winCorpInfo', '/dsae001/selectPopup.ax');" title="케이티 기업개황 새창">케이티</a>
        </span>
      </td>
      <td class="tL">
        <a href="/dsaf001/main.do?rcpNo=20260504800404" id="r_20260504800404" onclick="openReportViewer('20260504800404',''); return false;" title="기업설명회(IR)개최(안내공시) 공시뷰어 새창">기업설명회(IR)개최(안내공시)</a>
      </td>
      <td class="tL ellipsis" title="케이티">케이티</td>
      <td>2026.05.04</td>
      <td><span class="tagCom_kospi_other" title="본 공시사항은 한국거래소 유가증권시장본부 소관임">유</span></td>
    </tr>
    <tr>
      <td>2</td>
      <td class="tL">
        <span class="innerWrap">
          <span class="tagCom_kospi" title="유가증권시장">유</span>
          <a href="javascript:openCorpInfoNew('00190321', 'winCorpInfo', '/dsae001/selectPopup.ax');">케이티</a>
        </span>
      </td>
      <td class="tL">
        <a href="/dsaf001/main.do?rcpNo=20260415000003" id="r_20260415000003" onclick="openReportViewer('20260415000003',''); return false;">
          <span title="본 보고서명으로 이미 제출된 보고서의 기재내용이 변경되어 제출된 것임" class="txtCB">[기재정정]</span>주요사항보고서(자기주식처분결정)
        </a>
      </td>
      <td class="tL ellipsis" title="케이티">케이티</td>
      <td>2026.04.15</td>
      <td></td>
    </tr>
  </tbody>
</table>
</div>
<div class="psWrap" id="psWrap">
  <div class="pageInfo">[1/12] [총 169건]</div>
</div>
`;

const noResultsHtml = `
<div class="tbListInner">
<table class="tbList">
  <tbody id="tbody">
    <tr><td class="no_data end" colspan="6" align="center">조회 결과가 없습니다.</td></tr>
  </tbody>
</table>
</div>
`;

const request = {
  option: "corp",
  currentPage: 1,
  maxResults: 15,
  maxLinks: 10,
  sort: "date",
  series: "desc",
  textCrpCik: "00190321",
  startDate: "20250507",
  endDate: "20260507",
  finalReportOnly: true,
} as const;

describe("parseCompanyReportsSearchHtml", () => {
  test("parses company-report rows and pagination", async () => {
    const result = await Effect.runPromise(
      parseCompanyReportsSearchHtml(
        populatedHtml,
        request,
        "https://dart.fss.or.kr/dsab007/detailSearch.ax",
      ),
    );

    expect(result.company).toEqual({
      companyCode: "00190321",
      name: "케이티",
      marketLabel: "유가증권시장",
    });
    expect(result.pagination).toMatchObject({
      currentPage: 1,
      totalPages: 12,
      totalCount: 169,
      returnedCount: 2,
    });
    expect(result.rows[0]).toMatchObject({
      companyCode: "00190321",
      companyName: "케이티",
      reportTitle: "기업설명회(IR)개최(안내공시)",
      rcpNo: "20260504800404",
      presenterName: "케이티",
      receiptDate: "2026-05-04",
      viewerPath: "/dsaf001/main.do?rcpNo=20260504800404",
      viewerUrl:
        "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260504800404",
      remarks: [
        {
          text: "유",
          title: "본 공시사항은 한국거래소 유가증권시장본부 소관임",
        },
      ],
    });
    expect(result.rows[1]?.reportTitle).toBe(
      "[기재정정]주요사항보고서(자기주식처분결정)",
    );
  });

  test("parses no-result tables as successful empty searches", async () => {
    const result = await Effect.runPromise(
      parseCompanyReportsSearchHtml(
        noResultsHtml,
        request,
        "https://dart.fss.or.kr/dsab007/detailSearch.ax",
      ),
    );

    expect(result.company).toEqual({ companyCode: "00190321" });
    expect(result.pagination).toEqual({
      currentPage: 1,
      totalPages: 0,
      totalCount: 0,
      returnedCount: 0,
    });
    expect(result.rows).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});
