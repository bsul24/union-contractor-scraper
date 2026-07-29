import { load } from "cheerio";

import type {
  ContractorExtractionContext,
  ContractorRecord,
} from "../types/contractor.js";

type ContractorField =
  | "name"
  | "contactName"
  | "email"
  | "phone"
  | "website"
  | "address"
  | "cityStateZip"
  | "category";

const HEADER_ALIASES: Record<ContractorField, string[]> = {
  name: ["contractor", "contractor name", "company", "company name"],
  contactName: ["contact", "contact name", "contact person", "representative"],
  email: ["email", "email address", "e-mail", "e-mail address"],
  phone: ["phone", "phone number", "telephone", "telephone number"],
  website: ["website", "web site", "company website"],
  address: ["address", "street address"],
  cityStateZip: [
    "city / state / zip",
    "city/state/zip",
    "city, state, zip",
    "city state zip",
    "location",
  ],
  category: ["category", "trade", "classification", "type"],
};

function normalizeText(value: string): string | null {
  const normalized = value.replace(/\s+/g, " ").trim();

  return normalized === "" ? null : normalized;
}

function identifyHeader(value: string): ContractorField | null {
  const normalizedHeader = value.replace(/\s+/g, " ").trim().toLowerCase();

  const entries = Object.entries(HEADER_ALIASES) as Array<
    [ContractorField, string[]]
  >;

  for (const [field, aliases] of entries) {
    if (aliases.includes(normalizedHeader)) {
      return field;
    }
  }

  return null;
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

function extractAddressLines(
  cellSelection: ReturnType<ReturnType<typeof load>>,
): {
  address: string | null;
  cityStateZip: string | null;
} {
  const addressCell = cellSelection.clone();

  addressCell.find("br").replaceWith("\n");

  const addressLines = addressCell
    .text()
    .split(/\n+/)
    .map((line) => normalizeText(line))
    .filter((line): line is string => line !== null);

  if (addressLines.length <= 1) {
    return {
      address: addressLines[0] ?? null,
      cityStateZip: null,
    };
  }

  const cityStateZip = addressLines.at(-1) ?? null;

  const address = normalizeText(addressLines.slice(0, -1).join(" "));

  return {
    address,
    cityStateZip,
  };
}

export function extractContractorsFromTable(
  html: string,
  context: ContractorExtractionContext,
): ContractorRecord[] {
  const $ = load(html);
  const contractors: ContractorRecord[] = [];

  $("table").each((_, tableElement) => {
    const rows = $(tableElement).find("tr").toArray();

    let headerRowIndex = -1;
    let headerFields = new Map<number, ContractorField>();

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];

      if (!row) {
        continue;
      }

      const cells = $(row).children("th, td").toArray();

      const fieldsForRow = new Map<number, ContractorField>();

      cells.forEach((cell, columnIndex) => {
        const field = identifyHeader($(cell).text());

        if (field !== null) {
          fieldsForRow.set(columnIndex, field);
        }
      });

      const containsNameHeader = [...fieldsForRow.values()].includes("name");

      if (containsNameHeader) {
        headerRowIndex = rowIndex;
        headerFields = fieldsForRow;
        break;
      }
    }

    if (headerRowIndex === -1) {
      return;
    }

    const dataRows = rows.slice(headerRowIndex + 1);

    for (const row of dataRows) {
      const cells = $(row).children("th, td").toArray();

      const values: Partial<Record<ContractorField, string | null>> = {};

      for (const [columnIndex, field] of headerFields) {
        const cell = cells[columnIndex];

        if (!cell) {
          values[field] = null;
          continue;
        }

        const cellSelection = $(cell);
        const visibleText = normalizeText(cellSelection.text());

        if (field === "email") {
          const href = cellSelection
            .find('a[href^="mailto:"]')
            .first()
            .attr("href");

          values.email = extractEmail(href, visibleText);

          continue;
        }

        if (field === "phone") {
          const href = cellSelection
            .find('a[href^="tel:"]')
            .first()
            .attr("href");

          values.phone = extractPhone(href, visibleText);

          continue;
        }

        if (field === "website") {
          const href = cellSelection.find("a[href]").first().attr("href");

          values.website = extractWebsite(href, visibleText, context.sourceUrl);

          continue;
        }

        if (field === "address") {
          const extractedAddress = extractAddressLines(cellSelection);

          values.address = extractedAddress.address;

          if (
            values.cityStateZip === undefined ||
            values.cityStateZip === null
          ) {
            values.cityStateZip = extractedAddress.cityStateZip;
          }

          continue;
        }

        values[field] = visibleText;
      }

      const name = values.name ?? null;

      if (name === null) {
        continue;
      }

      contractors.push({
        name,
        contactName: values.contactName ?? null,
        email: values.email ?? null,
        phone: values.phone ?? null,
        website: values.website ?? null,
        address: values.address ?? null,
        cityStateZip: values.cityStateZip ?? null,
        category: values.category ?? null,
        sourceLocalNumber: context.localNumber,
        sourceLocalName: context.localName,
        sourceUrl: context.sourceUrl,
      });
    }
  });

  return contractors;
}
