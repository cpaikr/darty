import { describe, expect, test } from "bun:test";
import { Effect } from "effect";

import { parseBodySearchResponse } from "../src/dart/body-search-parser.ts";

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

describe("parseBodySearchResponse", () => {
  test("parses a populated result set", async () => {
    const result = await Effect.runPromise(
      parseBodySearchResponse(
        populatedHtml,
        {
          query: "배당",
          startDate: "20250331",
          endDate: "20260331",
          page: 1,
          sort: "date",
        },
        "https://dart.fss.or.kr/dsab007/search.ax",
      ),
    );

    expect(result.pagination.totalCount).toBe(171709);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.returnedCount).toBe(1);
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      companyName: "비아트론",
      companyMarket: "코스닥시장",
      corpId: "00610083",
      reportTitle: "사업보고서",
      reportSubtitle: "2025.12",
      reportModifier: "기재정정",
      rcpNo: "20260331004588",
      dcmNo: "11214655",
      disclosureCategory: "정기공시",
      contentScope: "본문",
      presenterName: "비아트론",
      filedAt: "2026-03-31",
      viewerUrl:
        "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331004588&dcmNo=11214655&keyword=%EB%B0%B0%EB%8B%B9",
    });
    expect(result.results[0]?.snippetText).toContain("배당");
    expect(result.results[0]?.snippetHtml).toContain("<strong");
  });

  test("parses a no-result response", async () => {
    const result = await Effect.runPromise(
      parseBodySearchResponse(
        emptyHtml,
        {
          query: "unlikely-keyword",
          startDate: "20250331",
          endDate: "20260331",
          page: 1,
          sort: "date",
        },
        "https://dart.fss.or.kr/dsab007/search.ax",
      ),
    );

    expect(result.pagination.totalCount).toBe(0);
    expect(result.pagination.pageCount).toBe(0);
    expect(result.pagination.returnedCount).toBe(0);
    expect(result.results).toHaveLength(0);
  });
});
