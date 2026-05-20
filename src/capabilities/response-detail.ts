import { Schema } from "effect";

export const responseDetailValues = ["concise", "detailed", "raw"] as const;
export type ResponseDetail = (typeof responseDetailValues)[number];

export const ResponseDetailSchema = Schema.Literal(...responseDetailValues);

export const responseDetailFieldSpec = {
  kind: "enum",
  enumValues: responseDetailValues,
  defaultValue: "concise",
  schema: ResponseDetailSchema,
  description:
    "[기본값: concise] 응답에 포함할 부가 필드 수준입니다. 원문 조회나 본문 렌더링은 바꾸지 않습니다. concise는 후속 호출에 필요한 참조 중심으로 줄이고, detailed/raw는 원문 검증 정보(evidence)나 locator를 포함합니다. raw도 DART 원문 HTML/XML 전체를 반환하지 않습니다.",
  examples: ["concise", "detailed", "raw"],
} as const;

export const responseDetailCliDescriptions = {
  sourceEvidence:
    "[기본값: concise] 원문 검증 정보(evidence) 포함 수준입니다. evidence는 DART 결과 행 원문, snippet HTML 등 파서 확인용 필드입니다. concise는 생략하고, detailed/raw는 포함합니다. raw도 DART 원문 HTML 전체를 반환하지 않습니다. CLI에서 evidence를 보려면 --verbose도 함께 사용하세요.",
  viewReport:
    "[기본값: concise] 부가 locator 포함 수준입니다. locator는 이어 조회에 쓰는 documents/toc 식별자 목록입니다. content.body 렌더링/창은 바꾸지 않습니다. sectionId 요청에서 concise는 documents/toc를 생략하고, detailed/raw는 함께 포함합니다.",
  companyRss:
    "[기본값: concise] RSS 부가 필드 포함 수준입니다. concise는 channel title/link와 주요 item 필드만 반환하고, detailed/raw는 channel 설명/언어/발행시각과 item guid를 포함합니다. raw도 RSS XML 전체를 반환하지 않습니다.",
} as const;

export const normalizeResponseDetail = (
  detail: ResponseDetail | undefined,
): ResponseDetail => detail ?? "concise";

export const includesSourceEvidence = (
  detail: ResponseDetail | undefined,
): boolean => normalizeResponseDetail(detail) !== "concise";
