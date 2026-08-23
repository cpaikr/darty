import { describe, expect, test } from "bun:test";
import { Effect, Either } from "effect";

import { SourceChanged } from "../../errors.ts";
import { createDartSourceTextResponse } from "../../source-response.ts";
import { parseCompanySearchHtml } from "./parse-html.ts";

const sourceUrl = "https://dart.fss.or.kr/dsae001/search.ax";
const sourceResponse = (html: string) => createDartSourceTextResponse(html, sourceUrl);

const request = {
  currentPage: 1,
  maxResults: 45,
  searchType: "1" as const,
  textCrpNm: "삼성전자",
};

const populatedHtml = `
<div class="listWrapS">
  <table class="tb" id="corpTable">
    <tbody>
      <tr>
        <td class="tL ellipsis">
          <span class="nobr1">
            <span class="tagCom_kospi" title="유가증권시장">유</span>
            <a href="javascript:select('00126380');" title="삼성전자 기업개황 ">삼성전자</a>
          </span>
        </td>
        <td>005930</td>
      </tr>
      <tr>
        <td class="tL ellipsis">
          <span class="nobr1">
            <span class="tagCom_etc" title="기타법인">기</span>
            <a href="javascript:select('00366997');" title="삼성전자로지텍 기업개황 ">삼성전자로지텍</a>
          </span>
        </td>
        <td> </td>
      </tr>
    </tbody>
  </table>
</div>
<div class="psWrap">
  <div class="pageInfo">[1/1] [총 2건]</div>
</div>
`;

const noResultsHtml = `
<table id="corpTable">
  <tbody>
    <tr class="noData">
      <td class="noData" colspan="2">일치하는 회사명이 없습니다.</td>
    </tr>
  </tbody>
</table>
`;

const partiallyMalformedHtml = `
<table id="corpTable">
  <tbody>
    <tr>
      <td><a href="javascript:select('00126380');">삼성전자</a></td>
      <td>005930</td>
    </tr>
    <tr>
      <td><a href="javascript:select('00366997');">삼성전자로지텍</a></td>
      <td>not-a-stock-code</td>
    </tr>
  </tbody>
</table>
<div class="pageInfo">[1/1] [총 2건]</div>
`;

const tablelessTotalHtml = `
<div class="pageInfo">[1/1] [총 1건]</div>
`;

const mixedSentinelHtml = noResultsHtml.replace(
  "  </tbody>",
  `    <tr><td>1</td><td><a href="javascript:select('00126380');">삼성전자</a></td></tr>
  </tbody>`,
);

describe("parseCompanySearchHtml", () => {
  test("parses company rows and exposes the 8-digit DART company code", async () => {
    const result = await Effect.runPromise(
      parseCompanySearchHtml(sourceResponse(populatedHtml), request),
    );

    expect(result.pagination).toMatchObject({
      currentPage: 1,
      totalPages: 1,
      totalCount: 2,
      returnedCount: 2,
    });
    expect(result.rows[0]).toEqual({
      companyCode: "00126380",
      companyName: "삼성전자",
      stockCode: "005930",
      marketKind: "kospi",
      marketLabel: "유가증권시장",
      rawCompanyLinkHref: "javascript:select('00126380');",
      rawMarketBadgeText: "유",
    });
    expect(result.rows[1]).toMatchObject({
      companyCode: "00366997",
      companyName: "삼성전자로지텍",
      stockCode: undefined,
      marketKind: "etc",
    });
  });

  test("parses the no-result row shape", async () => {
    const result = await Effect.runPromise(
      parseCompanySearchHtml(sourceResponse(noResultsHtml), request),
    );

    expect(result.pagination).toEqual({
      currentPage: 1,
      totalPages: 0,
      totalCount: 0,
      returnedCount: 0,
    });
    expect(result.rows).toEqual([]);
  });

  test("drops malformed company rows before exposing public fields", async () => {
    const result = await Effect.runPromise(
      parseCompanySearchHtml(sourceResponse(partiallyMalformedHtml), request),
    );

    expect(result.pagination.returnedCount).toBe(1);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.stockCode).toBe("005930");
    expect(result.droppedRowCount).toBe(1);
    expect(result.warnings).toEqual([
      {
        code: "row_parse_failed",
        rowIndex: 1,
        message: "Could not parse a DART 기업개황 company-search result row.",
      },
    ]);
  });

  test("rejects a total-count page without the company result table as source changed", async () => {
    const result = await Effect.runPromise(
      Effect.either(
        parseCompanySearchHtml(sourceResponse(tablelessTotalHtml), request),
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(SourceChanged);
    }
  });

  test("rejects mixed company no-result sentinel and data rows", async () => {
    const result = await Effect.runPromise(
      Effect.either(
        parseCompanySearchHtml(sourceResponse(mixedSentinelHtml), request),
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(SourceChanged);
    }
  });
});
