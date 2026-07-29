import { crawlUnionLocal } from "./crawl/crawlUnionLocal.js";
import { createCheerioPageLoader } from "./crawl/createCheerioPageLoader.js";
import { readUnionWorkbook } from "./input/readUnionWorkbook.js";

import type { UnionLocal } from "./types/union.js";

const localNumber = process.argv[2];
const requestedLocalName = process.argv[3];

if (!localNumber) {
  throw new Error(
    'Please provide a local number. Example: npm run crawl:local -- 447 "SACRAMENTO CA"',
  );
}

const workbookPath = "data/input/ua-locals.xlsx";

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function findMatchingLocal(locals: UnionLocal[]): UnionLocal {
  const numberMatches = locals.filter(
    (local) => local.localNumber === localNumber,
  );

  const matches =
    requestedLocalName === undefined
      ? numberMatches
      : numberMatches.filter(
          (local) =>
            normalizeText(local.localName) ===
            normalizeText(requestedLocalName),
        );

  if (matches.length === 0) {
    const description =
      requestedLocalName === undefined
        ? `Local ${localNumber}`
        : `Local ${localNumber} "${requestedLocalName}"`;

    throw new Error(`${description} was not found in ${workbookPath}.`);
  }

  if (matches.length > 1) {
    const matchingNames = matches.map((local) => local.localName).join(", ");

    throw new Error(
      `Multiple entries matched Local ${localNumber}: ${matchingNames}. Provide the exact local name as the second argument.`,
    );
  }

  const local = matches[0];

  if (!local) {
    throw new Error(`Local ${localNumber} could not be selected.`);
  }

  return local;
}

const workbookImport = await readUnionWorkbook(workbookPath);

const local = findMatchingLocal(workbookImport.locals);

console.log("Selected union local:");

console.table([
  {
    sourceRow: local.sourceRow,
    localNumber: local.localNumber,
    localName: local.localName,
    contractorPage: local.contractorPage,
    officialWebsite: local.officialWebsite,
    seedUrl: local.seedUrl,
  },
]);

const loadPage = createCheerioPageLoader({
  navigationTimeoutSecs: 60,
  maxRequestRetries: 1,
});

const result = await crawlUnionLocal(local, loadPage);

console.log("Union crawl result:");

console.table([
  {
    status: result.status,
    localNumber: result.localNumber,
    localName: result.localName,
    targetSource: result.targetSource,
    startUrl: result.startUrl,
    contractorPageUrl: result.contractorPageUrl,
    extractionStrategy: result.extractionStrategy,
    contractorCount: result.contractors.length,
    issueCode: result.issueCode,
    message: result.message,
  },
]);

if (result.contractors.length > 0) {
  console.log("Sample contractors:");

  console.table(
    result.contractors.slice(0, 10).map((contractor) => ({
      name: contractor.name,
      contact: contractor.contactName,
      email: contractor.email,
      phone: contractor.phone,
      website: contractor.website,
      address: contractor.address,
      location: contractor.cityStateZip,
      category: contractor.category,
    })),
  );
}
