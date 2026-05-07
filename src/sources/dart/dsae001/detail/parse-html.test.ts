import { describe, expect, test } from "bun:test";
import { Effect, Either } from "effect";

import { SourceNotFound } from "../../errors.ts";
import { parseCompanyDetailHtml } from "./parse-html.ts";

const emptyDetailHtml = `
<table id="corpDetailTable">
  <tbody>
    <tr><th><label>회사이름</label></th><td></td></tr>
    <tr><th><label>영문명</label></th><td></td></tr>
    <tr><th><label>공시회사명</label></th><td></td></tr>
  </tbody>
</table>
`;

const detailHtml = `
<table id="corpDetailTable">
  <tbody>
    <tr><th><label>회사이름</label></th><td>삼성전자(주)<button>정보 더보기</button><button>rss</button></td></tr>
    <tr><th><label>영문명</label></th><td>SAMSUNG ELECTRONICS CO,.LTD</td></tr>
    <tr><th><label>공시회사명</label></th><td>삼성전자</td></tr>
    <tr><th><label>종목코드</label></th><td>005930</td></tr>
    <tr><th><label>대표자명</label></th><td>전영현, 노태문<button>정보 더보기</button></td></tr>
    <tr><th><label>법인구분</label></th><td>유가증권시장</td></tr>
    <tr><th><label>홈페이지</label></th><td><a href="http://www.samsung.com/sec">www.samsung.com/sec</a></td></tr>
  </tbody>
</table>
`;

describe("parseCompanyDetailHtml", () => {
  test("parses the DART company detail table", async () => {
    const result = await Effect.runPromise(
      parseCompanyDetailHtml(
        detailHtml,
        "00126380",
        "https://dart.fss.or.kr/dsae001/select.ax?selectKey=00126380",
      ),
    );

    expect(result.company).toMatchObject({
      companyCode: "00126380",
      companyName: "삼성전자(주)",
      stockCode: "005930",
      representativeName: "전영현, 노태문",
      corporationKind: "유가증권시장",
      homepage: "http://www.samsung.com/sec",
    });
  });

  test("treats an empty detail table for a known label shape as not found", async () => {
    const result = await Effect.runPromise(
      Effect.either(
        parseCompanyDetailHtml(
          emptyDetailHtml,
          "99999999",
          "https://dart.fss.or.kr/dsae001/select.ax?selectKey=99999999",
        ),
      ),
    );

    expect(Either.isLeft(result)).toBe(true);

    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(SourceNotFound);
      expect(result.left.message).toContain("99999999");
    }
  });
});
