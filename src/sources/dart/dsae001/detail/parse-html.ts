import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
import { Effect, Schema } from "effect";

import { ParseFailure, SourceChanged, SourceNotFound } from "../../errors.ts";
import { toParseFailureDiagnostics } from "../../http-diagnostics.ts";
import {
  getSourceResponseErrorContext,
  type DartSourceTextResponse,
} from "../../source-response.ts";
import { dsae001DetailMessages } from "./messages.ts";
import { SourceCompanyDetailPage } from "./source-model.ts";

const collapseWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const optionalText = (value: string): string | undefined => {
  const collapsed = collapseWhitespace(value);
  return collapsed.length === 0 ? undefined : collapsed;
};

const cleanCellText = ($: cheerio.CheerioAPI, cell: cheerio.Cheerio<AnyNode>): string => {
  const clone = cell.clone();
  clone.find("button, script, style").remove();
  return collapseWhitespace(clone.text());
};

const collectDetailFields = ($: cheerio.CheerioAPI): Map<string, string> => {
  const fields = new Map<string, string>();

  $("#corpDetailTable tbody tr").each((_, row) => {
    const element = $(row);
    const label = collapseWhitespace(element.find("th").first().text());
    const value = cleanCellText($, element.find("td").first());

    if (label.length > 0) {
      fields.set(label, value);
    }
  });

  return fields;
};

export const parseCompanyDetailHtml = (
  response: DartSourceTextResponse,
  companyCode: string,
): Effect.Effect<
  Schema.Schema.Type<typeof SourceCompanyDetailPage>,
  SourceChanged | SourceNotFound | ParseFailure
> => {
  const html = response.body;
  const sourceUrl = response.sourceUrl;

  return Effect.gen(function* () {
    const $ = cheerio.load(html);

    if ($("#corpDetailTable").length === 0) {
      return yield* Effect.fail(
        new SourceChanged({
          message: dsae001DetailMessages.missingDetailTable,
          ...getSourceResponseErrorContext(response),
        }),
      );
    }

    const fields = collectDetailFields($);
    const rawCompanyName = fields.get("회사이름");
    const companyName = optionalText(rawCompanyName ?? "");

    if (companyName === undefined) {
      const error =
        rawCompanyName === undefined
          ? new SourceChanged({
              message: dsae001DetailMessages.missingCompanyName,
              ...getSourceResponseErrorContext(response),
            })
          : new SourceNotFound({
              message: dsae001DetailMessages.companyNotFound(companyCode),
              ...getSourceResponseErrorContext(response),
            });

      return yield* Effect.fail(error);
    }

    const homepageHref = optionalText(
      $("#corpDetailTable tbody tr")
        .filter((_, row) => collapseWhitespace($(row).find("th").first().text()) === "홈페이지")
        .find("a[href]")
        .first()
        .attr("href") ?? "",
    );

    return yield* Schema.decodeUnknown(SourceCompanyDetailPage)({
      company: {
        companyCode,
        companyName,
        englishName: optionalText(fields.get("영문명") ?? ""),
        disclosureCompanyName: optionalText(fields.get("공시회사명") ?? ""),
        stockCode: optionalText(fields.get("종목코드") ?? ""),
        representativeName: optionalText(fields.get("대표자명") ?? ""),
        corporationKind: optionalText(fields.get("법인구분") ?? ""),
        corporateRegistrationNumber: optionalText(fields.get("법인등록번호") ?? ""),
        businessRegistrationNumber: optionalText(fields.get("사업자등록번호") ?? ""),
        address: optionalText(fields.get("주소") ?? ""),
        homepage: homepageHref ?? optionalText(fields.get("홈페이지") ?? ""),
        phoneNumber: optionalText(fields.get("전화번호") ?? ""),
        faxNumber: optionalText(fields.get("팩스번호") ?? ""),
        industryName: optionalText(fields.get("업종명") ?? ""),
        establishedDate: optionalText(fields.get("설립일") ?? ""),
        fiscalMonth: optionalText(fields.get("결산월") ?? ""),
      },
      fetchedAt: new Date().toISOString(),
      sourceUrl,
    });
  }).pipe(
    Effect.mapError((error) =>
      error instanceof ParseFailure ||
      error instanceof SourceChanged ||
      error instanceof SourceNotFound
        ? error
        : new ParseFailure({
            message: dsae001DetailMessages.sourceSchemaMismatch,
            sourceUrl,
            diagnostics: toParseFailureDiagnostics({
              reason: dsae001DetailMessages.sourceSchemaMismatch,
              response,
              cause: error,
            }),
          }),
    ),
  );
};
