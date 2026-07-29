import { crawlUnionLocal } from "./crawl/crawlUnionLocal.js";
import { crawlUnionLocals } from "./crawl/crawlUnionLocals.js";
import { createCheerioPageLoader } from "./crawl/createCheerioPageLoader.js";
import { selectUnionBatch } from "./crawl/selectUnionBatch.js";
import { readUnionWorkbook } from "./input/readUnionWorkbook.js";
import { writeCrawlResultsWorkbook } from "./output/writeCrawlResultsWorkbook.js";

const workbookPath = "data/input/ua-locals.xlsx";

const firstBatchArgument = process.argv[2];
const secondBatchArgument = process.argv[3];

const workbookImport = await readUnionWorkbook(workbookPath);

const batchSelection = selectUnionBatch(
  workbookImport.locals,
  firstBatchArgument,
  secondBatchArgument,
);

console.log("Workbook imported:");

console.table([
  {
    sheetName: workbookImport.sheetName,
    validLocalCount: workbookImport.locals.length,
    importIssueCount: workbookImport.issues.length,
    selectedLocalCount: batchSelection.locals.length,
    startPosition: batchSelection.startPosition,
    endPosition: batchSelection.endPosition,
    outputPath: batchSelection.outputPath,
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
  batchSelection.locals,

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

await writeCrawlResultsWorkbook(
  results,
  batchSelection.outputPath,
  workbookImport.issues,
);

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
    outputPath: batchSelection.outputPath,
  },
]);
