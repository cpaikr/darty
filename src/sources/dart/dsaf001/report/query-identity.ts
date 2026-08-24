export type ReportQueryIdentity = {
  readonly receiptNumber: string;
  readonly dcmNo: string | undefined;
};

export const parseReportQueryIdentity = (
  query: string,
): ReportQueryIdentity | undefined => {
  try {
    const params = new URLSearchParams(query.replaceAll("&amp;", "&"));
    const receiptNumber = params.get("rcpNo")?.trim();

    if (receiptNumber === undefined || receiptNumber.length === 0) {
      return undefined;
    }

    const dcmNo = params.get("dcmNo")?.trim();
    return {
      receiptNumber,
      dcmNo: dcmNo === undefined || dcmNo.length === 0 ? undefined : dcmNo,
    };
  } catch {
    return undefined;
  }
};
