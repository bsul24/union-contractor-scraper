import ExcelJS from "exceljs";

import type {
  ImportIssue,
  UnionLocal,
  UnionWorkbookImport,
} from "../types/union.js";

const COLUMN_COUNT = 12;

function getCellText(row: ExcelJS.Row, columnNumber: number): string | null {
  const text = row.getCell(columnNumber).text.trim();

  if (text === "") {
    return null;
  }

  return text;
}

function normalizeUrl(value: string | null): string | null {
  if (value === null || value === "?") {
    return null;
  }

  try {
    const url = new URL(value);

    for (const parameterName of [...url.searchParams.keys()]) {
      if (parameterName.startsWith("utm_")) {
        url.searchParams.delete(parameterName);
      }
    }

    return url.toString();
  } catch {
    return value;
  }
}

function isRowEmpty(row: ExcelJS.Row): boolean {
  for (let columnNumber = 1; columnNumber <= COLUMN_COUNT; columnNumber += 1) {
    if (getCellText(row, columnNumber) !== null) {
      return false;
    }
  }

  return true;
}

function rowToUnionLocal(
  row: ExcelJS.Row,
  localNumber: string,
  localName: string,
): UnionLocal {
  return {
    sourceRow: row.number,
    listedRegion: getCellText(row, 1),
    localNumber,
    seedUrl: normalizeUrl(getCellText(row, 3)),
    localName,
    address: getCellText(row, 5),
    cityStateZip: getCellText(row, 6),
    phone: getCellText(row, 7),
    officialWebsite: normalizeUrl(getCellText(row, 8)),
    contractorPage: normalizeUrl(getCellText(row, 9)),
    reviewStatus: getCellText(row, 10),
    notes: getCellText(row, 11),
    uaSource: normalizeUrl(getCellText(row, 12)),
  };
}

export async function readUnionWorkbook(
  filePath: string,
): Promise<UnionWorkbookImport> {
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.getWorksheet("UA Locals");

  if (!worksheet) {
    throw new Error('Could not find a worksheet named "UA Locals".');
  }

  const locals: UnionLocal[] = [];
  const issues: ImportIssue[] = [];

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);

    if (isRowEmpty(row)) {
      continue;
    }

    const localNumber = getCellText(row, 2);
    const localName = getCellText(row, 4);

    if (localNumber === null || localName === null) {
      issues.push({
        sourceRow: row.number,
        code: "MISSING_LOCAL_IDENTITY",
        message: "The row is missing a local number or local name.",
        rawWebsite: getCellText(row, 3),
      });

      continue;
    }

    const union = rowToUnionLocal(row, localNumber, localName);
    locals.push(union);
  }

  return {
    sheetName: worksheet.name,
    locals,
    issues,
  };
}
