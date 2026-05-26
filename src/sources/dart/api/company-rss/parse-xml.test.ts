import { describe, expect, test } from "bun:test";
import { Effect, Either } from "effect";

import { SourceChanged } from "../../errors.ts";
import { createDartSourceTextResponse } from "../../source-response.ts";
import { parseCompanyRssXml } from "./parse-xml.ts";

const sourceUrl = "https://dart.fss.or.kr/api/companyRSS.xml?crpCd=00126380";

const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:dc="http://purl.org/dc/elements/1.1/" version="2.0">
  <channel>
    <title>DART : (유가)삼성전자의 공시</title>
    <link>https://dart.fss.or.kr</link>
    <description>DART : (유가)삼성전자의 공시 정보를 확인할 수 있습니다.</description>
    <language>ko</language>
    <dc:date>2026-05-07T06:37:52Z</dc:date>
    <item>
      <title>(유가)삼성전자 - 주식등의대량보유상황보고서(일반)</title>
      <link>https://dart.fss.or.kr/api/link.jsp?rcpNo=20260504000421</link>
      <dc:creator>삼성물산</dc:creator>
      <dc:date>2026-05-04T08:11:00Z</dc:date>
      <guid>https://dart.fss.or.kr/api/link.jsp?rcpNo=20260504000421</guid>
    </item>
  </channel>
</rss>`;

describe("parseCompanyRssXml", () => {
  test("parses RSS channel and filing items", async () => {
    const result = await Effect.runPromise(
      parseCompanyRssXml(createDartSourceTextResponse(rssXml, sourceUrl)),
    );

    expect(result.channel).toMatchObject({
      title: "DART : (유가)삼성전자의 공시",
      language: "ko",
      publishedAt: "2026-05-07T06:37:52Z",
    });
    expect(result.items[0]).toMatchObject({
      receiptNumber: "20260504000421",
      creator: "삼성물산",
      publishedAt: "2026-05-04T08:11:00Z",
    });
  });

  test("rejects RSS channels without required links", async () => {
    const malformedRssXml = rssXml.replace(
      "<link>https://dart.fss.or.kr</link>",
      "<link>   </link>",
    );

    const result = await Effect.runPromise(
      Effect.either(
        parseCompanyRssXml(
          createDartSourceTextResponse(malformedRssXml, sourceUrl, {
            httpStatus: 200,
            httpContentType: "application/xml",
            httpResponseLength: malformedRssXml.length,
          }),
        ),
      ),
    );

    expect(Either.isLeft(result)).toBe(true);

    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(SourceChanged);
      expect(result.left.diagnostics).toMatchObject({
        httpStatus: 200,
        httpContentType: "application/xml",
        httpResponseLength: malformedRssXml.length,
      });
    }
  });

  test("rejects RSS items without required title or link", async () => {
    const malformedRssXml = rssXml.replace(
      "<link>https://dart.fss.or.kr/api/link.jsp?rcpNo=20260504000421</link>",
      "<link>   </link>",
    );

    const result = await Effect.runPromise(
      Effect.either(
        parseCompanyRssXml(createDartSourceTextResponse(malformedRssXml, sourceUrl)),
      ),
    );

    expect(Either.isLeft(result)).toBe(true);

    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(SourceChanged);
    }
  });
});
