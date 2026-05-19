export type DisclosureTypeCode = `${DisclosureTypeCategory}${string}`;
export type DisclosureTypeCategory = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J";

export type DisclosureTypeItem = {
  readonly code: DisclosureTypeCode;
  readonly label: string;
};

export type DisclosureTypeCategoryGroup = {
  readonly category: DisclosureTypeCategory;
  readonly categoryLabel: string;
  readonly categoryDescription: string;
  readonly items: readonly DisclosureTypeItem[];
};

export const disclosureTypesSource = {
  url: "https://github.com/sjunepark/open-dart/blob/85e7a07dee1d24cd810c705c1400c4ac3bbf6add/src/docs/pblntf_detail_ty.md",
  repository: "sjunepark/open-dart",
  commit: "85e7a07dee1d24cd810c705c1400c4ac3bbf6add",
  path: "src/docs/pblntf_detail_ty.md",
} as const;

export const disclosureTypeCategoryLabelSource = {
  system: "dart-fss-docs",
  url: "https://dart-fss.readthedocs.io/en/latest/dart_types.html",
  codeSet: "pblntf_ty",
} as const;

export const disclosureTypeCategoryDescriptionProvenance = {
  status: "implementation_authored_guidance",
  basis:
    "Human-authored summaries derived from pblntf_ty category labels and pblntf_detail_ty items.",
} as const;

export const disclosureTypeCategories = [
  {
    category: "A",
    categoryLabel: "정기공시",
    categoryDescription: "사업보고서, 반기보고서, 분기보고서 등 정기 제출 보고서 계열입니다.",
    items: [
      { code: "A001", label: "사업보고서" },
      { code: "A002", label: "반기보고서" },
      { code: "A003", label: "분기보고서" },
      { code: "A004", label: "등록법인결산서류(자본시장법이전)" },
      { code: "A005", label: "소액공모법인결산서류" },
    ],
  },
  {
    category: "B",
    categoryLabel: "주요사항보고",
    categoryDescription: "일반 주요사항보고서와 자본시장법 이전 주요경영사항 신고 계열입니다.",
    items: [
      { code: "B001", label: "주요사항보고서" },
      { code: "B002", label: "주요경영사항신고(자본시장법 이전)" },
      { code: "B003", label: "최대주주등과의거래신고(자본시장법 이전)" },
    ],
  },
  {
    category: "C",
    categoryLabel: "발행공시",
    categoryDescription: "증권신고서와 소액공모 등 증권 발행 관련 공시 계열입니다.",
    items: [
      { code: "C001", label: "증권신고(지분증권)" },
      { code: "C002", label: "증권신고(채무증권)" },
      { code: "C003", label: "증권신고(파생결합증권)" },
      { code: "C004", label: "증권신고(합병등)" },
      { code: "C005", label: "증권신고(기타)" },
      { code: "C006", label: "소액공모(지분증권)" },
      { code: "C007", label: "소액공모(채무증권)" },
      { code: "C008", label: "소액공모(파생결합증권)" },
      { code: "C009", label: "소액공모(합병등)" },
      { code: "C010", label: "소액공모(기타)" },
      { code: "C011", label: "호가중개시스템을통한소액매출" },
    ],
  },
  {
    category: "D",
    categoryLabel: "지분공시",
    categoryDescription: "대량보유, 임원·주요주주 소유, 의결권대리행사, 공개매수 등 지분 관련 공시 계열입니다.",
    items: [
      { code: "D001", label: "주식등의대량보유상황보고서" },
      { code: "D002", label: "임원ㆍ주요주주특정증권등소유상황보고서" },
      { code: "D003", label: "의결권대리행사권유" },
      { code: "D004", label: "공개매수" },
      { code: "D005", label: "임원ㆍ주요주주 특정증권등 거래계획보고서" },
    ],
  },
  {
    category: "E",
    categoryLabel: "기타공시",
    categoryDescription: "자기주식, 신탁계약, 합병 종료, 주식매수선택권, 주주총회 등 기타 신고 계열입니다.",
    items: [
      { code: "E001", label: "자기주식취득/처분" },
      { code: "E002", label: "신탁계약체결/해지" },
      { code: "E003", label: "합병등종료보고서" },
      { code: "E004", label: "주식매수선택권부여에관한신고" },
      { code: "E005", label: "사외이사에관한신고" },
      { code: "E006", label: "주주총회소집보고서" },
      { code: "E007", label: "시장조성/안정조작" },
      { code: "E008", label: "합병등신고서(자본시장법 이전)" },
      { code: "E009", label: "금융위등록/취소(자본시장법 이전)" },
    ],
  },
  {
    category: "F",
    categoryLabel: "외부감사관련",
    categoryDescription: "감사보고서, 연결감사보고서, 회계법인 사업보고서 등 외부감사 관련 공시 계열입니다.",
    items: [
      { code: "F001", label: "감사보고서" },
      { code: "F002", label: "연결감사보고서" },
      { code: "F003", label: "결합감사보고서" },
      { code: "F004", label: "회계법인사업보고서" },
      { code: "F005", label: "감사전재무제표미제출신고서" },
    ],
  },
  {
    category: "G",
    categoryLabel: "펀드공시",
    categoryDescription: "집합투자증권과 펀드 관련 증권신고서 계열입니다.",
    items: [
      { code: "G001", label: "증권신고(집합투자증권-신탁형)" },
      { code: "G002", label: "증권신고(집합투자증권-회사형)" },
      { code: "G003", label: "증권신고(집합투자증권-합병)" },
    ],
  },
  {
    category: "H",
    categoryLabel: "자산유동화",
    categoryDescription: "자산유동화계획, 유동화증권, 채권유동화 등 자산유동화 관련 공시 계열입니다.",
    items: [
      { code: "H001", label: "자산유동화계획/양도등록" },
      { code: "H002", label: "사업/반기/분기보고서" },
      { code: "H003", label: "증권신고(유동화증권등)" },
      { code: "H004", label: "채권유동화계획/양도등록" },
      { code: "H005", label: "자산유동화관련중요사항발생등보고" },
      { code: "H006", label: "주요사항보고서" },
    ],
  },
  {
    category: "I",
    categoryLabel: "거래소공시",
    categoryDescription: "거래소 수시공시, 공정공시, 시장조치 안내, 채권공시 계열입니다.",
    items: [
      { code: "I001", label: "수시공시" },
      { code: "I002", label: "공정공시" },
      { code: "I003", label: "시장조치/안내" },
      { code: "I004", label: "지분공시" },
      { code: "I005", label: "증권투자회사" },
      { code: "I006", label: "채권공시" },
    ],
  },
  {
    category: "J",
    categoryLabel: "공정위공시",
    categoryDescription: "공정거래위원회와 기업집단 관련 공시 계열입니다.",
    items: [
      { code: "J001", label: "대규모내부거래관련" },
      { code: "J002", label: "대규모내부거래관련(구)" },
      { code: "J004", label: "기업집단현황공시" },
      { code: "J005", label: "비상장회사중요사항공시" },
      { code: "J006", label: "기타공정위공시" },
      { code: "J008", label: "대규모내부거래관련(공익법인용)" },
      { code: "J009", label: "하도급대금결제조건공시" },
    ],
  },
] as const satisfies readonly DisclosureTypeCategoryGroup[];

export const disclosureTypeCategoryValues = disclosureTypeCategories.map(
  (group) => group.category,
) as readonly DisclosureTypeCategory[];

export const disclosureTypeItems = disclosureTypeCategories.flatMap((group) => [
  ...group.items,
]) as readonly DisclosureTypeItem[];
