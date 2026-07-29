import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";

import ExcelJS from "exceljs";

import { writeCrawlResultsWorkbook } from "../src/output/writeCrawlResultsWorkbook.js";

import type { ContractorRecord } from "../src/types/contractor.js";
import type { UnionCrawlResult } from "../src/types/crawl.js";

const temporaryDirectories: string[] = [];

async function createOutputPath(): Promise<string> {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "union-contractor-output-"),
  );

  temporaryDirectories.push(directory);

  return path.join(directory, "nested", "crawl-results.xlsx");
}

function getRowValues(
  worksheet: ExcelJS.Worksheet,
  rowNumber: number,
  columnCount: number,
): ExcelJS.CellValue[] {
  const row = worksheet.getRow(rowNumber);

  return Array.from(
    { length: columnCount },
    (_, index) => row.getCell(index + 1).value,
  );
}

afterEach(async () => {
  const directoriesToRemove = temporaryDirectories.splice(0);

  await Promise.all(
    directoriesToRemove.map((directory) =>
      rm(directory, {
        recursive: true,
        force: true,
      }),
    ),
  );
});

const CONTRACTOR_ONE: ContractorRecord = {
  name: "Example Mechanical",
  contactName: "Jordan Smith",
  email: "jordan@example.com",
  phone: "916-555-1234",
  website: "https://example.com/",
  address: "123 Main Street",
  cityStateZip: "Sacramento, CA 95814",
  category: "Commercial Plumbing",
  sourceLocalNumber: "447",
  sourceLocalName: "SACRAMENTO CA",
  sourceUrl: "https://union.example.org/contractors/",
};

const CONTRACTOR_TWO: ContractorRecord = {
  name: "Second Mechanical",
  contactName: null,
  email: null,
  phone: "916-555-5678",
  website: null,
  address: null,
  cityStateZip: null,
  category: null,
  sourceLocalNumber: "447",
  sourceLocalName: "SACRAMENTO CA",
  sourceUrl: "https://union.example.org/contractors/",
};

const SUCCESS_RESULT: UnionCrawlResult = {
  status: "success",
  sourceRow: 31,
  localNumber: "447",
  localName: "SACRAMENTO CA",
  targetSource: "seedUrl",
  startUrl: "https://union.example.org/",
  contractorPageUrl: "https://union.example.org/contractors/",
  extractionStrategy: "labeled_table",
  contractors: [CONTRACTOR_ONE, CONTRACTOR_TWO],
  issueCode: null,
  message: null,
};

const REVIEW_RESULT: UnionCrawlResult = {
  status: "review",
  sourceRow: 11,
  localNumber: "469",
  localName: "PHOENIX AZ",
  targetSource: "officialWebsite",
  startUrl: "https://second-union.example.org/",
  contractorPageUrl: "https://second-union.example.org/contractors/",
  extractionStrategy: "none",
  contractors: [],
  issueCode: "NO_CONTRACTORS_EXTRACTED",
  message:
    "The contractor page was found but no contractor records were extracted.",
};

const SKIPPED_RESULT: UnionCrawlResult = {
  status: "skipped",
  sourceRow: 45,
  localNumber: "123",
  localName: "EXAMPLE LOCAL",
  targetSource: null,
  startUrl: null,
  contractorPageUrl: null,
  extractionStrategy: null,
  contractors: [],
  issueCode: "NO_CRAWLABLE_URL",
  message: "No crawlable URL was available for this union local.",
};

const FAILED_RESULT: UnionCrawlResult = {
  status: "failed",
  sourceRow: 52,
  localNumber: "456",
  localName: "FAILED LOCAL",
  targetSource: "seedUrl",
  startUrl: "https://failed.example.org/",
  contractorPageUrl: null,
  extractionStrategy: null,
  contractors: [],
  issueCode: "REQUEST_FAILED",
  message: "Request timed out.",
};

describe("writeCrawlResultsWorkbook", () => {
  it("creates contractor and crawl-result worksheets", async () => {
    const outputPath = await createOutputPath();

    await writeCrawlResultsWorkbook([SUCCESS_RESULT], outputPath);

    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(outputPath);

    assert.deepEqual(
      workbook.worksheets.map((worksheet) => worksheet.name),
      ["Contractors", "Crawl Results"],
    );
  });

  it("writes one contractor row per extracted record", async () => {
    const outputPath = await createOutputPath();

    await writeCrawlResultsWorkbook(
      [SUCCESS_RESULT, REVIEW_RESULT],
      outputPath,
    );

    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(outputPath);

    const worksheet = workbook.getWorksheet("Contractors");

    assert.ok(worksheet);

    assert.deepEqual(getRowValues(worksheet, 1, 13), [
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
    ]);

    assert.deepEqual(getRowValues(worksheet, 2, 13), [
      31,
      "447",
      "SACRAMENTO CA",
      "Example Mechanical",
      "Jordan Smith",
      "jordan@example.com",
      "916-555-1234",
      "https://example.com/",
      "123 Main Street",
      "Sacramento, CA 95814",
      "Commercial Plumbing",
      "https://union.example.org/contractors/",
      "labeled_table",
    ]);

    assert.deepEqual(getRowValues(worksheet, 3, 13), [
      31,
      "447",
      "SACRAMENTO CA",
      "Second Mechanical",
      null,
      null,
      "916-555-5678",
      null,
      null,
      null,
      null,
      "https://union.example.org/contractors/",
      "labeled_table",
    ]);

    assert.equal(worksheet.rowCount, 3);
  });

  it("writes one crawl-result row for every union local", async () => {
    const outputPath = await createOutputPath();

    await writeCrawlResultsWorkbook(
      [SUCCESS_RESULT, REVIEW_RESULT, SKIPPED_RESULT, FAILED_RESULT],
      outputPath,
    );

    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(outputPath);

    const worksheet = workbook.getWorksheet("Crawl Results");

    assert.ok(worksheet);

    assert.deepEqual(getRowValues(worksheet, 1, 11), [
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
    ]);

    assert.deepEqual(getRowValues(worksheet, 2, 11), [
      31,
      "447",
      "SACRAMENTO CA",
      "success",
      "seedUrl",
      "https://union.example.org/",
      "https://union.example.org/contractors/",
      "labeled_table",
      2,
      null,
      null,
    ]);

    assert.deepEqual(getRowValues(worksheet, 3, 11), [
      11,
      "469",
      "PHOENIX AZ",
      "review",
      "officialWebsite",
      "https://second-union.example.org/",
      "https://second-union.example.org/contractors/",
      "none",
      0,
      "NO_CONTRACTORS_EXTRACTED",
      "The contractor page was found but no contractor records were extracted.",
    ]);

    assert.deepEqual(getRowValues(worksheet, 4, 11), [
      45,
      "123",
      "EXAMPLE LOCAL",
      "skipped",
      null,
      null,
      null,
      null,
      0,
      "NO_CRAWLABLE_URL",
      "No crawlable URL was available for this union local.",
    ]);

    assert.deepEqual(getRowValues(worksheet, 5, 11), [
      52,
      "456",
      "FAILED LOCAL",
      "failed",
      "seedUrl",
      "https://failed.example.org/",
      null,
      null,
      0,
      "REQUEST_FAILED",
      "Request timed out.",
    ]);

    assert.equal(worksheet.rowCount, 5);
  });

  it("creates an output directory when it does not exist", async () => {
    const outputPath = await createOutputPath();

    await writeCrawlResultsWorkbook([], outputPath);

    const workbook = new ExcelJS.Workbook();

    await workbook.xlsx.readFile(outputPath);

    assert.ok(workbook.getWorksheet("Contractors"));

    assert.ok(workbook.getWorksheet("Crawl Results"));
  });
});
