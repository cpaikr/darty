import { formatViewReportExpectedMaxBytes } from "./view-report/constants.ts";

export type InvalidRequestForRecoveryHint = {
  readonly code: string;
  readonly parameter: string;
  readonly reason?: string | undefined;
  readonly expected?: string | undefined;
};

const companyCodeHint =
  "회사명이나 6자리 종목코드만 알고 있다면 먼저 search-company로 8자리 companyCode를 확인한 뒤 다시 호출하세요.";

const dateWindowHint =
  "날짜는 YYYYMMDD 형식의 실제 날짜여야 하며 startDate는 endDate보다 늦을 수 없습니다.";

const returnedViewReportIdHint =
  "같은 receipt로 view-report를 다시 호출해 최신 documents[].id/toc[].id를 받은 뒤 그 값을 사용하세요.";

const contentWindowHint =
  "contentStartByte는 0 이상의 정수입니다. 긴 본문을 이어 읽을 때는 이전 응답의 content.window.nextStartByte 값을 그대로 넘기세요.";

const unsupportedLimitHint =
  "limit은 지원하지 않습니다. public input이 아닙니다. search-body는 page(1~100)만 지원하고 pageSize는 조절할 수 없습니다. search-company는 page와 pageSize(1~45)를, search-company-reports는 page와 pageSize(15, 30, 50, 100)를 사용하세요. view-report 본문 길이와 이어 읽기는 maxBytes와 contentStartByte를 사용하세요.";

const rawDartViewerParameterHint =
  "raw DART viewer 값(dcmNo, eleId, offset, length 등)을 직접 넘기지 말고 view-report가 반환한 documentId/sectionId와 content.window.nextStartByte를 사용하세요.";

const rawDartViewerParameters = new Set([
  "dcmNo",
  "eleId",
  "offset",
  "length",
  "dtd",
  "tocNo",
  "atocId",
]);

const describeExpected = (expected: string | undefined): string | undefined => {
  if (expected === undefined) {
    return undefined;
  }

  const integerRangeMatch = /^integer_between_(\d+)_and_(\d+)$/.exec(expected);
  if (integerRangeMatch !== null) {
    return `${integerRangeMatch[1]} 이상 ${integerRangeMatch[2]} 이하의 정수`;
  }

  if (expected === "date_YYYYMMDD") {
    return "YYYYMMDD 형식의 실제 날짜";
  }

  if (expected === "date_range_start_lte_end") {
    return "startDate가 endDate보다 늦지 않은 YYYYMMDD 날짜 범위";
  }

  if (expected === "integer") {
    return "정수";
  }

  if (expected.startsWith("one_of:")) {
    return expected.slice("one_of:".length).split(",").join(", ");
  }

  return expected;
};

export const getInvalidRequestRecoveryHint = (
  error: InvalidRequestForRecoveryHint,
): string | undefined => {
  switch (error.parameter) {
    case "companyCode":
      return companyCodeHint;
    case "startDate":
    case "endDate":
      return dateWindowHint;
    case "page": {
      const expected = describeExpected(error.expected) ?? "1 이상의 정수";
      return `page는 ${expected}입니다. 범위를 벗어나면 더 작은 페이지 번호로 다시 호출하세요.`;
    }
    case "pageSize": {
      const expected = describeExpected(error.expected) ?? "허용된 정수";
      return `pageSize는 ${expected}만 사용할 수 있습니다.`;
    }
    case "receipt":
      return "search-body/search-company-reports 결과의 receiptNumber 또는 viewerUrl을 receipt로 넘기세요.";
    case "documentId":
    case "sectionId":
      return returnedViewReportIdHint;
    case "maxBytes":
      return `maxBytes는 ${formatViewReportExpectedMaxBytes()}입니다. 낮게 시작하고 필요한 경우에만 키우세요.`;
    case "contentStartByte":
      return contentWindowHint;
    case "limit":
      return unsupportedLimitHint;
    case "disclosureTypes":
      return "disclosureTypes에는 알려진 DART 공시유형 상세 코드(A001=사업보고서, A002=반기보고서, A003=분기보고서, I001=수시공시 등)를 배열로 넘기세요. 코드를 모르면 agent에서는 darty_list_disclosure_types, CLI에서는 darty disclosure-types --query <검색어>로 조회하고, 보고서 제목 텍스트는 reportName에 넣으세요.";
    case "industryCode":
      return 'industryCode에는 "all", DART 업종 코드(예: 612=전기 통신업), 또는 ROOTdddd 형식의 DART 업종 tree root를 넘기세요. 업종을 모르면 "all"을 사용하세요.';
    case "corporationType":
      return "corporationType은 all(전체), P(유가증권시장), A(코스닥시장), N(코넥스시장), E(기타법인) 중 하나를 사용하세요.";
    case "closingAccountsMonth":
      return "closingAccountsMonth는 all 또는 01~12 두 자리 결산월 코드를 사용하세요. 예: 1월은 01입니다.";
    default:
      return error.code === "unknown_parameter" &&
        rawDartViewerParameters.has(error.parameter)
        ? rawDartViewerParameterHint
        : undefined;
  }
};

export const getViewReportNotFoundRecoveryHint = (
  parameter: string | undefined,
): string | undefined =>
  parameter === "documentId" || parameter === "sectionId"
    ? returnedViewReportIdHint
    : undefined;

export const getCompanyNotFoundRecoveryHint = (): string => companyCodeHint;
