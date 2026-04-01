import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { Effect } from "effect";

import { parseContentsSearchHtml } from "./parse-html.ts";

const populatedHtml = readFileSync(
  new URL("./fixtures/contents-populated-2026-03-31.html", import.meta.url),
  "utf8",
);

const noResultsHtml = readFileSync(
  new URL("./fixtures/contents-no-results-2026-03-31.html", import.meta.url),
  "utf8",
);

const attachmentHtml = `
<div class="tbTitle">
  <h4 id="searchCnt">검색건수 : 1</h4>
</div>
<div>
  <table class="tbWideList">
    <tbody>
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
<input type="hidden" name="totalCnt" id="totalCnt" value="1">
<div class="psWrap" id="psWrap">
  <div class="pageInfo">[1/1] [총 1건]</div>
</div>
`;

describe("parseContentsSearchHtml", () => {
  test("parses a selected live populated fixture captured on 2026-03-31", async () => {
    const result = await Effect.runPromise(
      parseContentsSearchHtml(
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

    expect(result.pagination.totalCount).toBe(172171);
    expect(result.pagination.currentPage).toBe(1);
    expect(result.pagination.returnedCount).toBe(2);
    expect(result.warnings).toEqual([]);
    expect(result.droppedRowCount).toBe(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      companyName: "유일에너테크",
      companyMarketLabel: "코스닥시장",
      corpCik: "01368637",
      reportNameRaw: "정기주주총회결과",
      reportTitle: "정기주주총회결과",
      rcpNo: "20260331904807",
      dcmNo: "11216440",
      disclosureTypeLabel: "거래소공시",
      contentTypeLabel: "본문",
      presenterName: "유일에너테크",
      receiptDate: "2026-03-31",
      viewerPath:
        "/dsaf001/main.do?rcpNo=20260331904807&dcmNo=11216440&keyword=%EB%B0%B0%EB%8B%B9",
      viewerUrl:
        "https://dart.fss.or.kr/dsaf001/main.do?rcpNo=20260331904807&dcmNo=11216440&keyword=%EB%B0%B0%EB%8B%B9",
    });
    expect(result.rows[0]?.snippetText).toContain("배당");
    expect(result.rows[0]?.snippetHtml).toContain("<strong");
    expect(result.rows[1]).toMatchObject({
      companyName: "DH오토리드",
      reportNameRaw: "정기주주총회결과",
      reportTitle: "정기주주총회결과",
      rcpNo: "20260331904803",
      dcmNo: "11216422",
      disclosureTypeLabel: "거래소공시",
      contentTypeLabel: "본문",
    });
  });

  test("parses the live no-result row shape with no pagination block", async () => {
    const result = await Effect.runPromise(
      parseContentsSearchHtml(
        noResultsHtml,
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
    expect(result.warnings).toEqual([]);
    expect(result.rows).toHaveLength(0);
  });

  test("preserves attachment-style report suffixes", async () => {
    const result = await Effect.runPromise(
      parseContentsSearchHtml(
        attachmentHtml,
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

    expect(result.rows[0]).toMatchObject({
      companyName: "디엔지비",
      reportNameRaw: "사업보고서 (2025.12) 정관",
      reportTitle: "사업보고서",
      reportPeriod: "2025.12",
      reportNameSuffix: "정관",
      contentTypeLabel: "첨부문서",
    });
  });
});
