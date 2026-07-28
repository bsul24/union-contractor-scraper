import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createFailedUnionCrawlResult,
  createReviewUnionCrawlResult,
  createSkippedUnionCrawlResult,
  createSuccessfulUnionCrawlResult,
} from "../src/crawl/createUnionCrawlResult.js";

import type { UnionCrawlTarget } from "../src/crawl/selectUnionCrawlTarget.js";
import type { ContractorRecord } from "../src/types/contractor.js";
import type { UnionLocal } from "../src/types/union.js";

const LOCAL: UnionLocal = {
  sourceRow: 2,
  listedRegion: "CA",
  localNumber: "447",
  seedUrl: "https://original.example.org/",
  localName: "SACRAMENTO CA",
  address: null,
  cityStateZip: null,
  phone: null,
  officialWebsite: "https://official.example.org/",
  contractorPage: null,
  reviewStatus: null,
  notes: null,
  uaSource: null,
};

const HOMEPAGE_TARGET: UnionCrawlTarget = {
  kind: "homepage",
  source: "officialWebsite",
  url: "https://official.example.org/",
};

const CONTRACTOR: ContractorRecord = {
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
  sourceUrl: "https://official.example.org/contractors/",
};

describe("crawl-result constructors", () => {
  it("creates a successful crawl result", () => {
    const result = createSuccessfulUnionCrawlResult({
      local: LOCAL,
      target: HOMEPAGE_TARGET,
      contractorPageUrl: "https://official.example.org/contractors/",
      extractionStrategy: "labeled_table",
      contractors: [CONTRACTOR],
    });

    assert.deepEqual(result, {
      status: "success",
      sourceRow: 2,
      localNumber: "447",
      localName: "SACRAMENTO CA",
      targetSource: "officialWebsite",
      startUrl: "https://official.example.org/",
      contractorPageUrl: "https://official.example.org/contractors/",
      extractionStrategy: "labeled_table",
      contractors: [CONTRACTOR],
      issueCode: null,
      message: null,
    });
  });

  it("creates a review result when no contractor page is found", () => {
    const result = createReviewUnionCrawlResult({
      local: LOCAL,
      target: HOMEPAGE_TARGET,
      contractorPageUrl: null,
      extractionStrategy: null,
      contractors: [],
      issueCode: "NO_CONTRACTOR_PAGE_FOUND",
      message: "No contractor-page candidate was found.",
    });

    assert.deepEqual(result, {
      status: "review",
      sourceRow: 2,
      localNumber: "447",
      localName: "SACRAMENTO CA",
      targetSource: "officialWebsite",
      startUrl: "https://official.example.org/",
      contractorPageUrl: null,
      extractionStrategy: null,
      contractors: [],
      issueCode: "NO_CONTRACTOR_PAGE_FOUND",
      message: "No contractor-page candidate was found.",
    });
  });

  it("creates a review result when extraction returns no contractors", () => {
    const result = createReviewUnionCrawlResult({
      local: LOCAL,
      target: HOMEPAGE_TARGET,
      contractorPageUrl: "https://official.example.org/contractors/",
      extractionStrategy: "none",
      contractors: [],
      issueCode: "NO_CONTRACTORS_EXTRACTED",
      message: "The contractor page was found but no records were extracted.",
    });

    assert.equal(result.status, "review");
    assert.equal(
      result.contractorPageUrl,
      "https://official.example.org/contractors/",
    );
    assert.equal(result.extractionStrategy, "none");
    assert.deepEqual(result.contractors, []);
    assert.equal(result.issueCode, "NO_CONTRACTORS_EXTRACTED");
  });

  it("creates a skipped result", () => {
    const target: UnionCrawlTarget = {
      kind: "none",
      source: null,
      url: null,
    };

    const result = createSkippedUnionCrawlResult({
      local: LOCAL,
      target,
      message: "No crawlable URL was available.",
    });

    assert.deepEqual(result, {
      status: "skipped",
      sourceRow: 2,
      localNumber: "447",
      localName: "SACRAMENTO CA",
      targetSource: null,
      startUrl: null,
      contractorPageUrl: null,
      extractionStrategy: null,
      contractors: [],
      issueCode: "NO_CRAWLABLE_URL",
      message: "No crawlable URL was available.",
    });
  });

  it("creates a failed result", () => {
    const result = createFailedUnionCrawlResult({
      local: LOCAL,
      target: HOMEPAGE_TARGET,
      contractorPageUrl: null,
      message: "Request timed out.",
    });

    assert.deepEqual(result, {
      status: "failed",
      sourceRow: 2,
      localNumber: "447",
      localName: "SACRAMENTO CA",
      targetSource: "officialWebsite",
      startUrl: "https://official.example.org/",
      contractorPageUrl: null,
      extractionStrategy: null,
      contractors: [],
      issueCode: "REQUEST_FAILED",
      message: "Request timed out.",
    });
  });
});
