export interface LinkCandidate {
  text: string;
  href: string;
}

interface WeightedTerm {
  term: string;
  weight: number;
}

const TEXT_TERMS: WeightedTerm[] = [
  { term: "contractor directory", weight: 8 },
  { term: "contractor list", weight: 5 },
  { term: "find a contractor", weight: 6 },
  { term: "signatory employers", weight: 6 },
  { term: "signatory contractors", weight: 6 },
  { term: "contractors", weight: 4 },
  { term: "contractor", weight: 3 },
  { term: "employers", weight: 2 },
  { term: "directory", weight: 2 },
];

const HREF_TERMS: WeightedTerm[] = [
  { term: "contractor-directory", weight: 5 },
  { term: "contractor-list", weight: 5 },
  { term: "signatory-employers", weight: 5 },
  { term: "signatory-contractors", weight: 5 },
  { term: "/contractors", weight: 4 },
];

function scoreMatchingTerms(value: string, terms: WeightedTerm[]): number {
  for (const { term, weight } of terms) {
    if (value.includes(term)) {
      return weight;
    }
  }

  return 0;
}

export function scoreContractorLink(candidate: LinkCandidate): number {
  const normalizedText = candidate.text.trim().toLowerCase();

  const normalizedHref = candidate.href.trim().toLowerCase();

  const textScore = scoreMatchingTerms(normalizedText, TEXT_TERMS);

  const hrefScore = scoreMatchingTerms(normalizedHref, HREF_TERMS);

  const pdfBonus =
    normalizedHref.endsWith(".pdf") && normalizedHref.includes("contractor")
      ? 1
      : 0;

  return textScore + hrefScore + pdfBonus;
}
