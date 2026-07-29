import { mkdir } from "node:fs/promises";
import path from "node:path";

import ExcelJS from "exceljs";

import type { UnionCrawlResult } from "../types/crawl.js";
import type { ImportIssue } from "../types/union.js";

const CONTRACTOR_HEADERS = [
  "Source Row",
  "Local Number",
  "Local Name",
  "Contractor Name",
  "Contact Name",
  "Email",
  "Phone",
  "Website",
  "Address",
  "City / State / ZIP",
  "Category",
  "Source URL",
  "Extraction Strategy",
];

const CRAWL_RESULT_HEADERS = [
  "Source Row",
  "Local Number",
  "Local Name",
  "Status",
  "Target Source",
  "Start URL",
  "Contractor Page URL",
  "Extraction Strategy",
  "Contractor Count",
  "Issue Code",
  "Message",
];

const IMPORT_ISSUE_HEADERS = [
  "Source Row",
  "Issue Code",
  "Message",
  "Raw Website",
];

const CONTRACTOR_COLUMN_WIDTHS = [
  12, 14, 24, 38, 24, 32, 18, 38, 36, 28, 30, 42, 22,
];

const CRAWL_RESULT_COLUMN_WIDTHS = [12, 14, 24, 14, 20, 42, 42, 22, 18, 30, 60];

const IMPORT_ISSUE_COLUMN_WIDTHS = [12, 30, 60, 42];

function formatWorksheet(
  worksheet: ExcelJS.Worksheet,
  columnWidths: number[],
): void {
  const headerRow = worksheet.getRow(1);

  headerRow.font = {
    bold: true,
    color: {
      argb: "FFFFFFFF",
    },
  };

  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "FF1F4E78",
    },
  };

  headerRow.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };

  headerRow.height = 30;

  columnWidths.forEach((width, index) => {
    worksheet.getColumn(index + 1).width = width;
  });

  worksheet.views = [
    {
      state: "frozen",
      ySplit: 1,
    },
  ];

  worksheet.eachRow(
    {
      includeEmpty: false,
    },
    (row, rowNumber) => {
      if (rowNumber === 1) {
        return;
      }

      row.alignment = {
        vertical: "top",
        wrapText: true,
      };
    },
  );

  worksheet.autoFilter = {
    from: {
      row: 1,
      column: 1,
    },
    to: {
      row: 1,
      column: columnWidths.length,
    },
  };
}

export async function writeCrawlResultsWorkbook(
  results: UnionCrawlResult[],
  outputPath: string,
  importIssues: ImportIssue[] = [],
): Promise<void> {
  await mkdir(path.dirname(outputPath), {
    recursive: true,
  });

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Union Contractor Scraper";
  workbook.created = new Date();

  const contractorsWorksheet = workbook.addWorksheet("Contractors");

  const crawlResultsWorksheet = workbook.addWorksheet("Crawl Results");

  const importIssuesWorksheet = workbook.addWorksheet("Import Issues");

  contractorsWorksheet.addRow(CONTRACTOR_HEADERS);

  for (const result of results) {
    for (const contractor of result.contractors) {
      contractorsWorksheet.addRow([
        result.sourceRow,
        result.localNumber,
        result.localName,
        contractor.name,
        contractor.contactName,
        contractor.email,
        contractor.phone,
        contractor.website,
        contractor.address,
        contractor.cityStateZip,
        contractor.category,
        contractor.sourceUrl,
        result.extractionStrategy,
      ]);
    }
  }

  crawlResultsWorksheet.addRow(CRAWL_RESULT_HEADERS);

  for (const result of results) {
    crawlResultsWorksheet.addRow([
      result.sourceRow,
      result.localNumber,
      result.localName,
      result.status,
      result.targetSource,
      result.startUrl,
      result.contractorPageUrl,
      result.extractionStrategy,
      result.contractors.length,
      result.issueCode,
      result.message,
    ]);
  }

  importIssuesWorksheet.addRow(IMPORT_ISSUE_HEADERS);

  for (const issue of importIssues) {
    importIssuesWorksheet.addRow([
      issue.sourceRow,
      issue.code,
      issue.message,
      issue.rawWebsite,
    ]);
  }

  formatWorksheet(contractorsWorksheet, CONTRACTOR_COLUMN_WIDTHS);

  formatWorksheet(crawlResultsWorksheet, CRAWL_RESULT_COLUMN_WIDTHS);

  formatWorksheet(importIssuesWorksheet, IMPORT_ISSUE_COLUMN_WIDTHS);

  await workbook.xlsx.writeFile(outputPath);
}
