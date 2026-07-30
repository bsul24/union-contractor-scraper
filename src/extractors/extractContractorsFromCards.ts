import { load } from "cheerio";

import type {
  ContractorExtractionContext,
  ContractorRecord,
} from "../types/contractor.js";

const CARD_SELECTOR = [
  '[class*="card"]',
  '[class*="contractor"]',
  '[class*="partner"]',
  "article",
].join(", ");

const GENERIC_LINK_TEXT = new Set([
  "details",
  "home",
  "image",
  "learn more",
  "more information",
  "view profile",
  "visit site",
  "visit website",
  "website",
]);

function normalizeText(value: string): string | null {
  const normalized = value.replace(/\s+/g, " ").trim();

  return normalized === "" ? null : normalized;
}

function isContractorHeading(value: string): boolean {
  const normalized = normalizeText(value);

  if (normalized === null) {
    return false;
  }

  const lowercaseHeading = normalized.toLowerCase();

  return (
    /\bcontractors?\b/.test(lowercaseHeading) ||
    /\bsignatory employers?\b/.test(lowercaseHeading)
  );
}

function isGenericName(value: string): boolean {
  return GENERIC_LINK_TEXT.has(value.toLowerCase());
}

function extractCandidateName(
  visibleText: string,
  ariaLabel: string | undefined,
  title: string | undefined,
  imageAlt: string | undefined,
): string | null {
  const candidates = [
    visibleText,
    ariaLabel ?? "",
    title ?? "",
    imageAlt ?? "",
  ];

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeText(candidate);

    if (normalizedCandidate !== null && !isGenericName(normalizedCandidate)) {
      return normalizedCandidate;
    }
  }

  return null;
}

function extractWebsite(
  href: string | undefined,
  sourceUrl: string,
): string | null {
  if (!href) {
    return null;
  }

  const normalizedHref = href.trim();

  if (
    normalizedHref === "" ||
    normalizedHref.startsWith("#") ||
    /^mailto:/i.test(normalizedHref) ||
    /^tel:/i.test(normalizedHref) ||
    /^javascript:/i.test(normalizedHref)
  ) {
    return null;
  }

  try {
    const url = new URL(normalizedHref, sourceUrl);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function extractContractorsFromCards(
  html: string,
  context: ContractorExtractionContext,
): ContractorRecord[] {
  const $ = load(html);

  const contractors: ContractorRecord[] = [];

  const seenNames = new Set<string>();

  function addContractor(name: string | null, website: string | null): void {
    if (name === null) {
      return;
    }

    const nameKey = name.toLowerCase();

    if (seenNames.has(nameKey)) {
      return;
    }

    seenNames.add(nameKey);

    contractors.push({
      name,
      contactName: null,
      email: null,
      phone: null,
      website,
      address: null,
      cityStateZip: null,
      category: null,
      sourceLocalNumber: context.localNumber,
      sourceLocalName: context.localName,
      sourceUrl: context.sourceUrl,
    });
  }

  const headingSelector = "h1, h2, h3, h4, h5, h6";

  const documentElements = $("body *").toArray();

  $(headingSelector).each((_, headingElement) => {
    const heading = $(headingElement);

    if (heading.closest("nav, footer, header, aside").length > 0) {
      return;
    }

    if (!isContractorHeading(heading.text())) {
      return;
    }

    const headingIndex = documentElements.indexOf(headingElement);

    if (headingIndex === -1) {
      return;
    }

    let sectionEndIndex = documentElements.length;

    for (
      let index = headingIndex + 1;
      index < documentElements.length;
      index += 1
    ) {
      const element = documentElements[index];

      if (element && $(element).is(headingSelector)) {
        sectionEndIndex = index;
        break;
      }
    }

    const sectionElements = documentElements.slice(
      headingIndex + 1,
      sectionEndIndex,
    );

    for (const element of sectionElements) {
      const selection = $(element);

      if (selection.closest("nav, footer, header, aside").length > 0) {
        continue;
      }

      if (!selection.is("a[href]")) {
        continue;
      }

      const href = selection.attr("href");

      const website = extractWebsite(href, context.sourceUrl);

      if (website === null) {
        continue;
      }

      const name = extractCandidateName(
        selection.text(),
        selection.attr("aria-label"),
        selection.attr("title"),
        selection.find("img[alt]").first().attr("alt"),
      );

      addContractor(name, website);
    }

    for (const element of sectionElements) {
      const card = $(element);

      if (card.closest("nav, footer, header, aside").length > 0) {
        continue;
      }

      if (!card.is(CARD_SELECTOR)) {
        continue;
      }

      if (card.find("a[href]").length > 0) {
        continue;
      }

      if (card.find(CARD_SELECTOR).length > 0) {
        continue;
      }

      const name = extractCandidateName(
        card.text(),
        card.attr("aria-label"),
        card.attr("title"),
        card.find("img[alt]").first().attr("alt"),
      );

      addContractor(name, null);
    }
  });
  return contractors;
}
