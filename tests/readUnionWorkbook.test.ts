import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";

import ExcelJS from "exceljs";

import { readUnionWorkbook } from "../src/input/readUnionWorkbook.js";

const HEADERS = [
  "State",
  "Local",
  "Website",
  "Local Name",
  "Address",
  "City / State / ZIP",
  "Phone",
  "Official Website",
  "Contractor Page",
  "Review Status",
  "Notes",
  "UA Source",
];

type TestCellValue = string | number | null;

interface TestWorkbook {
  filePath: string;
}

const temporaryDirectories: string[] = [];

async function createTestWorkbook(
  rows: TestCellValue[][],
): Promise<TestWorkbook> {
  const directory = await mkdtemp(
    path.join(tmpdir(), "union-contractor-scraper-"),
  );

  temporaryDirectories.push(directory);

  const filePath = path.join(directory, "test-locals.xlsx");

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("UA Locals");

  worksheet.addRow(HEADERS);

  for (const row of rows) {
    worksheet.addRow(row);
  }

  await workbook.xlsx.writeFile(filePath);

  return {
    filePath,
  };
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

describe("readUnionWorkbook", () => {
  it("imports a valid union row", async () => {
    const testWorkbook = await createTestWorkbook([
      [
        "Alabama",
        52,
        "https://ualocal52.org/",
        "MONTGOMERY AL",
        "5563 WARES FERRY RD",
        "MONTGOMERY, AL 36117",
        "334-272-9500",
        null,
        null,
        "MANUAL_REVIEW",
        "Website needs verification.",
        "https://ua.org/find-a-local-union/",
      ],
    ]);

    const result = await readUnionWorkbook(testWorkbook.filePath);

    assert.equal(result.sheetName, "UA Locals");
    assert.equal(result.locals.length, 1);
    assert.equal(result.issues.length, 0);

    const local = result.locals[0];

    assert.ok(local);

    assert.equal(local.sourceRow, 2);
    assert.equal(local.listedRegion, "Alabama");
    assert.equal(local.localNumber, "52");
    assert.equal(local.seedUrl, "https://ualocal52.org/");
    assert.equal(local.localName, "MONTGOMERY AL");
    assert.equal(local.phone, "334-272-9500");
  });

  it("removes tracking parameters while preserving useful URL parameters", async () => {
    const testWorkbook = await createTestWorkbook([
      [
        "Arizona",
        469,
        "https://ualocal469.org/contractors?category=plumbing&utm_source=chatgpt.com&utm_medium=referral",
        "PHOENIX AZ",
      ],
    ]);

    const result = await readUnionWorkbook(testWorkbook.filePath);

    assert.equal(result.locals.length, 1);
    assert.equal(result.issues.length, 0);

    const local = result.locals[0];

    assert.ok(local);

    assert.equal(
      local.seedUrl,
      "https://ualocal469.org/contractors?category=plumbing",
    );
  });

  it("converts placeholder and blank URLs to null", async () => {
    const testWorkbook = await createTestWorkbook([
      ["Alabama", 548, "?", "MONTGOMERY AL"],
      ["Alabama", 760, "   ", "SHEFFIELD AL"],
    ]);

    const result = await readUnionWorkbook(testWorkbook.filePath);

    assert.equal(result.locals.length, 2);
    assert.equal(result.issues.length, 0);

    assert.equal(result.locals[0]?.seedUrl, null);
    assert.equal(result.locals[1]?.seedUrl, null);
  });

  it("reports an incomplete source row instead of silently dropping it", async () => {
    const testWorkbook = await createTestWorkbook([
      [null, null, "https://www.example-training-center.com/", null],
    ]);

    const result = await readUnionWorkbook(testWorkbook.filePath);

    assert.equal(result.locals.length, 0);
    assert.equal(result.issues.length, 1);

    assert.deepEqual(result.issues[0], {
      sourceRow: 2,
      code: "MISSING_LOCAL_IDENTITY",
      message: "The row is missing a local number or local name.",
      rawWebsite: "https://www.example-training-center.com/",
    });
  });

  it("ignores completely blank rows", async () => {
    const testWorkbook = await createTestWorkbook([
      ["Arizona", 469, "https://ualocal469.org/", "PHOENIX AZ"],
      [],
      ["California", 447, "https://ualocal447.org/", "SACRAMENTO CA"],
    ]);

    const result = await readUnionWorkbook(testWorkbook.filePath);

    assert.equal(result.locals.length, 2);
    assert.equal(result.issues.length, 0);

    assert.deepEqual(
      result.locals.map((local) => local.sourceRow),
      [2, 4],
    );
  });
});
