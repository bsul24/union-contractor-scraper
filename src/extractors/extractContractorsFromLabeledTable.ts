import { load } from "cheerio";

import type {
  ContractorExtractionContext,
  ContractorRecord,
} from "../types/contractor.js";

type LabeledField =
  | "contactName"
  | "alternateContact"
  | "email"
  | "alternateEmail"
  | "phone"
  | "website"
  | "address"
  | "category";

function normalizeText(value: string): string | null {
  const normalized = value.replace(/\s+/g, " ").trim();

  return normalized === "" ? null : normalized;
}

function normalizeLabel(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/:$/, "")
    .replace(/\./g, "");
}

function identifyLabel(value: string): LabeledField | null {
  const normalizedLabel = normalizeLabel(value);

  const labels: Record<string, LabeledField> = {
    contact: "contactName",
    "contact name": "contactName",
    "contact person": "contactName",

    "alt contact": "alternateContact",
    "alternate contact": "alternateContact",

    email: "email",
    "e-mail": "email",
    "email address": "email",
    "e-mail address": "email",

    "alt email": "alternateEmail",
    "alt e-mail": "alternateEmail",
    "alternate email": "alternateEmail",
    "alternate e-mail": "alternateEmail",

    phone: "phone",
    telephone: "phone",
    "phone number": "phone",

    website: "website",
    "web site": "website",

    address: "address",
    "street address": "address",

    category: "category",
    classification: "category",
    service: "category",
    services: "category",
    trade: "category",
  };

  return labels[normalizedLabel] ?? null;
}

function extractEmail(
  href: string | undefined,
  visibleText: string | null,
): string | null {
  if (!href) {
    return visibleText;
  }

  const email = href.replace(/^mailto:/i, "").split("?")[0];

  return normalizeText(email ?? "");
}

function extractPhone(
  href: string | undefined,
  visibleText: string | null,
): string | null {
  if (visibleText !== null) {
    return visibleText;
  }

  if (!href) {
    return null;
  }

  return normalizeText(href.replace(/^tel:/i, ""));
}

function extractWebsite(
  href: string | undefined,
  visibleText: string | null,
  sourceUrl: string,
): string | null {
  if (!href) {
    return visibleText;
  }

  try {
    const url = new URL(href, sourceUrl);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return visibleText;
    }

    return url.toString();
  } catch {
    return visibleText;
  }
}

function createContractorRecord(
  name: string,
  context: ContractorExtractionContext,
): ContractorRecord {
  return {
    name,
    contactName: null,
    email: null,
    phone: null,
    website: null,
    address: null,
    cityStateZip: null,
    category: null,
    sourceLocalNumber: context.localNumber,
    sourceLocalName: context.localName,
    sourceUrl: context.sourceUrl,
  };
}

export function extractContractorsFromLabeledTable(
  html: string,
  context: ContractorExtractionContext,
): ContractorRecord[] {
  const $ = load(html);
  const contractors: ContractorRecord[] = [];

  $("table").each((_, tableElement) => {
    let currentContractor: ContractorRecord | null = null;
    let currentContractorHasDetails = false;
    let previousField: LabeledField | null = null;

    function saveCurrentContractor(): void {
      if (currentContractor !== null && currentContractorHasDetails) {
        contractors.push(currentContractor);
      }

      currentContractor = null;
      currentContractorHasDetails = false;
      previousField = null;
    }

    $(tableElement)
      .find("tr")
      .each((_, rowElement) => {
        const cells = $(rowElement).children("th, td").toArray();

        if (cells.length === 0) {
          return;
        }

        const firstCell = $(cells[0]);
        const colspan = Number.parseInt(firstCell.attr("colspan") ?? "1", 10);

        const emphasizedName = normalizeText(
          firstCell.find("strong, b").first().text(),
        );

        const plainRowText = normalizeText(firstCell.text());

        const possibleName = emphasizedName ?? plainRowText;

        const containsSeparator = firstCell.find("hr").length > 0;

        const isPossibleNameRow =
          possibleName !== null &&
          !containsSeparator &&
          (cells.length === 1 || colspan >= 2) &&
          identifyLabel(possibleName) === null;

        if (isPossibleNameRow) {
          saveCurrentContractor();

          currentContractor = createContractorRecord(possibleName, context);

          return;
        }

        if (currentContractor === null) {
          return;
        }

        const contractor = currentContractor;

        const labelText = normalizeText(firstCell.text());

        const valueText = normalizeText(
          cells
            .slice(1)
            .map((cell) => $(cell).text())
            .join(" "),
        );

        if (labelText === null) {
          if (
            previousField === "address" &&
            valueText !== null &&
            contractor.cityStateZip === null
          ) {
            contractor.cityStateZip = valueText;
            currentContractorHasDetails = true;
          }

          return;
        }

        const field = identifyLabel(labelText);

        if (field === null) {
          previousField = null;
          return;
        }

        const valueCell = cells.length > 1 ? $(cells[1]) : firstCell;

        if (field === "contactName") {
          contractor.contactName = valueText;

          if (valueText !== null) {
            currentContractorHasDetails = true;
          }
        }

        if (field === "alternateContact") {
          if (contractor.contactName === null) {
            contractor.contactName = valueText;
          }

          if (valueText !== null) {
            currentContractorHasDetails = true;
          }
        }

        if (field === "email" || field === "alternateEmail") {
          const href = valueCell
            .find('a[href^="mailto:"]')
            .first()
            .attr("href");

          const email = extractEmail(href, valueText);

          if (field === "email" || contractor.email === null) {
            contractor.email = email;
          }

          if (email !== null) {
            currentContractorHasDetails = true;
          }
        }

        if (field === "phone") {
          const href = valueCell.find('a[href^="tel:"]').first().attr("href");

          contractor.phone = extractPhone(href, valueText);

          if (contractor.phone !== null) {
            currentContractorHasDetails = true;
          }
        }

        if (field === "website") {
          const href = valueCell.find("a[href]").first().attr("href");

          contractor.website = extractWebsite(
            href,
            valueText,
            context.sourceUrl,
          );

          if (contractor.website !== null) {
            currentContractorHasDetails = true;
          }
        }

        if (field === "address") {
          const addressCell = valueCell.clone();

          addressCell.find("br").replaceWith("\n");

          const addressLines = addressCell
            .text()
            .split(/\n+/)
            .map((line) => normalizeText(line))
            .filter((line): line is string => line !== null);

          const [streetAddress, ...locationLines] = addressLines;

          contractor.address = streetAddress ?? null;

          contractor.cityStateZip =
            locationLines.length > 0 ? locationLines.join(" ") : null;

          if (contractor.address !== null || contractor.cityStateZip !== null) {
            currentContractorHasDetails = true;
          }
        }

        if (field === "category") {
          contractor.category = valueText;

          if (valueText !== null) {
            currentContractorHasDetails = true;
          }
        }

        previousField = field;
      });

    saveCurrentContractor();
  });

  return contractors;
}
