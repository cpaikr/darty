import { describe, expect, test } from "bun:test";
import { Effect } from "effect";

import { parseDsab007ContentsSearchResponse } from "../src/dart/dsab007/parsers/contents.ts";

const populatedHtml = `
<div class="tbTitle">
  <h4 id="searchCnt">검색건수 : 171,709</h4>
</div>
<div>
  <table class="tbWideList">
    <tbody>
      <tr>
        <th>
          <span class="companyName">
            <span class="tagCom_kosdaq" title="코스닥시장">코</span>
            <a
              href="javascript:openCorpInfoNew('00610083', 'winCorpInfo', '/dsae001/selectPopup.ax');"
              class="company"
            >비아트론</a>
          </span>
          <a
            href="/dsaf001/main.do?rcpNo=20260331004588&dcmNo=11214655&keyword=%EB%B0%B0%EB%8B%B9"
            class="second"
          ><span class="txtCB">[기재정정]</span> 사업보고서 (2025.12)</a>
        </th>
        <td>... <strong style='color:#397fe7'>배당</strong>가능이익범위이내취득 ...</td>
        <td class="info">[정기공시] [본문] 제출인 : 비아트론</td>
        <td class="date">2026.03.31</td>
      </tr>
      <tr>
        <th>
          <span class="companyName">
            <span class="tagCom_etc" title="기타법인">기</span>
            <a
              href="javascript:openCorpInfoNew('00641001', 'winCorpInfo', '/dsae001/selectPopup.ax');"
              class="company"
            >디엔지비</a>
          </span>
          <a
            href="/dsaf001/main.do?rcpNo=20260331004638&dcmNo=11214867&keyword=%EB%B0%B0%EB%8B%B9"
            class="second"
          >사업보고서 (2025.12) 정관</a>
        </th>
        <td>... 우선주식에 대하여는 발행 시 이사회가 정한 <strong style='color:#397fe7'>배당</strong>률에 따라 우선 배당한다. ...</td>
        <td class="info">[정기공시] [첨부문서] 제출인 : 디엔지비</td>
        <td class="date">2026.03.31</td>
      </tr>
    </tbody>
  </table>
</div>
<input type="hidden" name="totalCnt" id="totalCnt" value="171,709">
<div class="psWrap" id="psWrap">
  <div class="pageInfo">[1/17171] [총 171,709건]</div>
</div>
`;

const emptyHtml = `
<div class="tbTitle">
  <h4 id="searchCnt">검색건수 : 0</h4>
</div>
<div>
  <table class="tbWideList">
    <tbody></tbody>
  </table>
</div>
<input type="hidden" name="totalCnt" id="totalCnt" value="0">
<div class="psWrap" id="psWrap">
  <div class="pageInfo">[1/0] [총 0건]</div>
</div>
`;

describe("parseDsab007ContentsSearchResponse", () => {
  test("parses a populated result set", async () => {
    const result = await Effect.runPromise(
      parseDsab007ContentsSearchResponse(
        populatedHtml,
        {
          option: "contents",
          currentPage: 1,
          maxResults: 10,
          maxLinks: 10,
          sort: "DATE",
          sortType: "desc",
          keyword: "배당",
          startDate: "20250331",
          endDate: "20260331",
        },
        "https://dart.fss.or.kr/dsab007/search.ax",
      ),
    );

    expect(result.pagination.totalCount).toBe(171709);
    expect(result.pagination.currentPage).toBe(1);
    expect(result.pagination.returnedCount).toBe(2);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      companyName: "비아트론",
      companyMarketLabel: "코스닥시장",
      corpCik: "00610083",
      reportNameRaw: "[기재정정] 사업보고서 (2025.12)",
      reportTitle: "사업보고서",
      reportPeriod: "2025.12",
      reportModifier: "기재정정",
      rcpNo: "20260331004588",
      dcmNo: "11214655",
      disclosureTypeLabel: "정기공시",
      contentTypeLabel: "본문",
      presenterName: "비아트론",
      receiptDate: "2026-03-31",
      viewerPath:
        "/dsaf001/main.do?rcpNo=20260331004588&dcmNo=11214655&keyword=%EB%B0%B0%EB%8B%B9",
      viewerUrl:
        "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331004588&dcmNo=11214655&keyword=%EB%B0%B0%EB%8B%B9",
    });
    expect(result.rows[0]?.snippetText).toContain("배당");
    expect(result.rows[0]?.snippetHtml).toContain("<strong");
    expect(result.rows[1]).toMatchObject({
      companyName: "디엔지비",
      reportNameRaw: "사업보고서 (2025.12) 정관",
      reportTitle: "사업보고서",
      reportPeriod: "2025.12",
      reportNameSuffix: "정관",
      contentTypeLabel: "첨부문서",
    });
  });

  test("parses a no-result response", async () => {
    const result = await Effect.runPromise(
      parseDsab007ContentsSearchResponse(
        emptyHtml,
        {
          option: "contents",
          currentPage: 1,
          maxResults: 10,
          maxLinks: 10,
          sort: "DATE",
          sortType: "desc",
          keyword: "unlikely-keyword",
          startDate: "20250331",
          endDate: "20260331",
        },
        "https://dart.fss.or.kr/dsab007/search.ax",
      ),
    );

    expect(result.pagination.totalCount).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
    expect(result.pagination.returnedCount).toBe(0);
    expect(result.rows).toHaveLength(0);
  });
});
