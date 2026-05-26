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
} as const;
