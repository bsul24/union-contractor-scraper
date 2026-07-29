import { crawlUnionLocal } from "./crawl/crawlUnionLocal.js";
import { crawlUnionLocals } from "./crawl/crawlUnionLocals.js";
import { createCheerioPageLoader } from "./crawl/createCheerioPageLoader.js";
import { readUnionWorkbook } from "./input/readUnionWorkbook.js";
import { writeCrawlResultsWorkbook } from "./output/writeCrawlResultsWorkbook.js";

const workbookPath = "data/input/ua-locals.xlsx";

const outputPath = "data/output/union-contractor-results.xlsx";

function parseLimit(value: string | undefined): number | null {
  if (value === undefined) {
    return null;
  }

  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(
      `The crawl limit must be a positive integer. Received: ${value}`,
    );
  }

  return parsedValue;
}

const limit = parseLimit(process.argv[2]);

const workbookImport = await readUnionWorkbook(workbookPath);

const selectedLocals =
  limit === null
    ? workbookImport.locals
    : workbookImport.locals.slice(0, limit);

console.log("Workbook imported:");

console.table([
  {
    sheetName: workbookImport.sheetName,
    validLocalCount: workbookImport.locals.length,
    importIssueCount: workbookImport.issues.length,
    selectedLocalCount: selectedLocals.length,
  },
]);

if (workbookImport.issues.length > 0) {
  console.log("Workbook import issues:");

  console.table(
    workbookImport.issues.map((issue) => ({
      sourceRow: issue.sourceRow,
      code: issue.code,
      message: issue.message,
      rawWebsite: issue.rawWebsite,
    })),
  );
}

const loadPage = createCheerioPageLoader({
  navigationTimeoutSecs: 60,
  maxRequestRetries: 1,
});

const results = await crawlUnionLocals(
  selectedLocals,

  (local) => crawlUnionLocal(local, loadPage),

  {
    onProgress({ completed, total, result }) {
      const issueDescription =
        result.issueCode === null ? "" : ` — ${result.issueCode}`;

      console.log(
        `[${completed}/${total}] ` +
          `Local ${result.localNumber} ` +
          `${result.localName}: ` +
          `${result.status}, ` +
          `${result.contractors.length} contractors` +
          issueDescription,
      );
    },
  },
);

await writeCrawlResultsWorkbook(results, outputPath);

const successfulCount = results.filter(
  (result) => result.status === "success",
).length;

const reviewCount = results.filter(
  (result) => result.status === "review",
).length;

const skippedCount = results.filter(
  (result) => result.status === "skipped",
).length;

const failedCount = results.filter(
  (result) => result.status === "failed",
).length;

const contractorCount = results.reduce(
  (total, result) => total + result.contractors.length,
  0,
);

console.log("Crawl complete:");

console.table([
  {
    localCount: results.length,
    successfulCount,
    reviewCount,
    skippedCount,
    failedCount,
    contractorCount,
    outputPath,
  },
]);
