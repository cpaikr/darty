export const searchCompanyReportsDisclosureTypePattern = /^[A-J]\d{3}$/;
export const searchCompanyReportsIndustryCodePattern = /^(all|ROOT\d{4}|\d{2,5})$/;

export const searchCompanyReportsCorporationTypeValues = [
  "all",
  "P",
  "A",
  "N",
  "E",
] as const;
export type SearchCompanyReportsCorporationType =
  (typeof searchCompanyReportsCorporationTypeValues)[number];

export const searchCompanyReportsClosingAccountsMonthValues = [
  "all",
  "12",
  "11",
  "10",
  "09",
  "08",
  "07",
  "06",
  "05",
  "04",
  "03",
  "02",
  "01",
] as const;
export type SearchCompanyReportsClosingAccountsMonth =
  (typeof searchCompanyReportsClosingAccountsMonthValues)[number];
