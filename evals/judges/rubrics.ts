export const finalAnswerJudgeRubric = {
  version: "2026-05-26",
  passingScore: 4,
  criteria: [
    "Answers the user's business question rather than only returning a filing URL.",
    "Cites source evidence returned by the Darty tool, such as receipt number, viewer URL, report title, document, section, or quoted section content.",
    "Does not make material claims unsupported by retrieved tool evidence.",
    "Distinguishes missing evidence from negative facts and states the search scope when evidence is insufficient.",
    "Does not provide investment, legal, or accounting advice.",
  ],
  scoringGuidance: [
    "Score 5 when all criteria are satisfied.",
    "Score 4 when the answer is evidence-backed and useful but has minor presentation, wording, or citation-specificity issues.",
    "Score 3 or lower only for material problems: unsupported factual claims, missing returned-evidence citation, failure to answer the question, overclaiming absent evidence, or investment/legal/accounting advice.",
    "Do not fail a harmless offer to reformat, tabulate, or compare already cited evidence unless it adds advice or unsupported claims.",
  ],
} as const;
