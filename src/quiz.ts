// The pre-subscription quiz. Question ids and option keys are stable and
// language-independent — they are what we store with the subscriber so the team
// can qualify leads regardless of the visitor's chosen language. The display
// labels live in the i18n locale files under `quiz.<id>.question` /
// `quiz.<id>.options.<optionKey>`. Keep questions short — this is a lead-gen
// flow, not a survey.
export interface QuizQuestion {
  id: string;
  options: string[];
}

export const QUIZ: QuizQuestion[] = [
  {
    id: "role",
    options: ["carrier", "forwarder", "shipper", "other"],
  },
  {
    id: "fleet_size",
    options: ["s1_10", "s11_50", "s51_200", "s200_plus"],
  },
  {
    id: "timeline",
    options: ["now", "quarter", "year", "exploring"],
  },
];
