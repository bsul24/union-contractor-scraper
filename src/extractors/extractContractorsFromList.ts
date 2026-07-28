import { load } from "cheerio";

import type {
  ContractorExtractionContext,
  ContractorRecord,
} from "../types/contractor.js";

function normalizeText(value: string): string | null {
  const normalized = value.replace(/\s+/g, " ").trim();

  return normalized === "" ? null : normalized;
}

function isContractorSectionHeading(text: string): boolean {
  const normalized = text.toLowerCase();

  const recognizedPhrases = [
    "contractor directory",
    "contractor list",
    "find a contractor",
    "signatory contractor",
    "signatory contractors",
    "signatory employer",
    "signatory employers",
  ];

  return recognizedPhrases.some((phrase) => normalized.includes(phrase));
}

function extractWebsite(
  href: string | undefined,
  sourceUrl: string,
): string | null {
  if (!href) {
    return null;
  }

  try {
    const url = new URL(href, sourceUrl);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function createContractorRecord(
  name: string,
  website: string | null,
  context: ContractorExtractionContext,
): ContractorRecord {
  return {
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
  };
}

export function extractContractorsFromList(
  html: string,
  context: ContractorExtractionContext,
): ContractorRecord[] {
  const $ = load(html);

  const contractorsByName = new Map<string, ContractorRecord>();

  let insideContractorSection = false;

  $("body *").each((_, element) => {
    const tagName = element.type === "tag" ? element.name.toLowerCase() : "";

    const currentElement = $(element);

    const isHeading = /^h[1-6]$/.test(tagName);

    if (isHeading) {
      const headingText = normalizeText(currentElement.text());

      const isExcludedHeading =
        currentElement.closest("nav, footer").length > 0;

      insideContractorSection =
        headingText !== null &&
        !isExcludedHeading &&
        isContractorSectionHeading(headingText);

      return;
    }

    if (!insideContractorSection || tagName !== "li") {
      return;
    }

    if (currentElement.closest("nav, footer").length > 0) {
      return;
    }

    const name = normalizeText(currentElement.text());

    if (name === null) {
      return;
    }

    const href = currentElement.find("a[href]").first().attr("href");

    const website = extractWebsite(href, context.sourceUrl);

    const normalizedName = name.toLowerCase();
    const existingContractor = contractorsByName.get(normalizedName);

    if (existingContractor) {
      if (existingContractor.website === null && website !== null) {
        existingContractor.website = website;
      }

      return;
    }

    contractorsByName.set(
      normalizedName,
      createContractorRecord(name, website, context),
    );
  });

  return [...contractorsByName.values()];
}
