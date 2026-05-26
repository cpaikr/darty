import type { WorkflowScenario } from "./filing-workflows.ts";

export type ResearchAnswerScenario = {
  readonly id: string;
  readonly description: string;
  readonly task: string;
  readonly trace: WorkflowScenario;
  readonly judgeFocus: string;
};

const samsungElectronics = {
  name: "삼성전자",
  companyCode: "00126380",
} as const;

const recentAnnualReportTrace = (input: {
  readonly id: string;
  readonly description: string;
  readonly task: string;
}): WorkflowScenario => ({
  id: input.id,
  description: input.description,
  task: input.task,
  companySearch: {
    companyName: samsungElectronics.name,
    expectedCompanyCode: samsungElectronics.companyCode,
  },
  companyReports: {
    companyCode: samsungElectronics.companyCode,
    startDate: "20240101",
    endDate: "20260331",
    expectedItems: "non_empty",
    requireAnnualReportFilter: true,
    requireDescendingDateOrder: true,
  },
  viewReport: {
    source: "companyReports",
  },
});

export const researchAnswerScenarios = [
  {
    id: "samsung-segment-revenue-summary",
    description: "answer a segment revenue question from Samsung Electronics annual-report evidence",
    task: "삼성전자 최근 사업보고서에서 부문별 매출액 내역을 확인해 주세요. 출처를 함께 제시해 주세요.",
    trace: recentAnnualReportTrace({
      id: "samsung-segment-revenue-summary",
      description: "find Samsung Electronics' latest annual report and inspect it for segment revenue evidence",
      task: "Find Samsung Electronics' latest annual report, inspect the report content or a relevant section, then answer the user's question about segment revenue with citations from returned DART evidence.",
    }),
    judgeFocus:
      "The answer should summarize segment or business-division revenue from retrieved Samsung Electronics annual-report evidence and cite the returned DART filing/section evidence.",
  },
  {
    id: "samsung-dividend-summary",
    description: "answer a dividend question from Samsung Electronics annual-report evidence",
    task: "삼성전자 최근 사업보고서에서 배당 관련 내용을 찾아 출처와 함께 요약해 주세요.",
    trace: recentAnnualReportTrace({
      id: "samsung-dividend-summary",
      description: "find Samsung Electronics' latest annual report and inspect it for dividend evidence",
      task: "Find Samsung Electronics' latest annual report, inspect the report content or a relevant section, then answer the user's dividend question with citations from returned DART evidence.",
    }),
    judgeFocus:
      "The answer should summarize dividend-related information from retrieved Samsung Electronics annual-report evidence and cite the returned DART filing/section evidence.",
  },
  {
    id: "insufficient-evidence-no-invention",
    description: "say when retrieved evidence does not support an unlikely requested fact",
    task: "삼성전자 최근 사업보고서에서 unlikely-darty-eval-keyword-20260404 관련 내용을 찾아 출처와 함께 요약해 주세요. 없으면 없다고 말해 주세요.",
    trace: {
      id: "insufficient-evidence-no-invention",
      description: "search an unlikely term in Samsung Electronics filings without inventing a reference",
      task: "Find Samsung Electronics' DART company code, then search its filing body text for unlikely-darty-eval-keyword-20260404 between 20250331 and 20260331. If no evidence is returned, say the evidence was not found and do not invent a filing reference.",
      companySearch: {
        companyName: samsungElectronics.name,
        expectedCompanyCode: samsungElectronics.companyCode,
      },
      bodySearch: {
        keyword: "unlikely-darty-eval-keyword-20260404",
        startDate: "20250331",
        endDate: "20260331",
        companyCode: samsungElectronics.companyCode,
        expectedItems: "empty",
      },
    },
    judgeFocus:
      "The answer should clearly state that the requested evidence was not found in the retrieved DART evidence and must not turn missing evidence into a negative factual claim beyond the search scope.",
  },
] as const satisfies readonly ResearchAnswerScenario[];
