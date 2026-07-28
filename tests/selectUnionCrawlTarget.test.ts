import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { selectUnionCrawlTarget } from "../src/crawl/selectUnionCrawlTarget.js";

import type { UnionLocal } from "../src/types/union.js";

const BASE_LOCAL: UnionLocal = {
  sourceRow: 2,
  listedRegion: "CA",
  localNumber: "447",
  seedUrl: null,
  localName: "SACRAMENTO CA",
  address: null,
  cityStateZip: null,
  phone: null,
  officialWebsite: null,
  contractorPage: null,
  reviewStatus: null,
  notes: null,
  uaSource: null,
};

function createLocal(overrides: Partial<UnionLocal>): UnionLocal {
  return {
    ...BASE_LOCAL,
    ...overrides,
  };
}

describe("selectUnionCrawlTarget", () => {
  it("prefers a known contractor page", () => {
    const local = createLocal({
      contractorPage: "https://example.org/contractors",
      officialWebsite: "https://example.org/",
      seedUrl: "https://original.example.org/",
    });

    assert.deepEqual(selectUnionCrawlTarget(local), {
      kind: "contractor_page",
      source: "contractorPage",
      url: "https://example.org/contractors",
    });
  });

  it("uses the official website when no contractor page is known", () => {
    const local = createLocal({
      officialWebsite: "https://official.example.org/",
      seedUrl: "https://original.example.org/",
    });

    assert.deepEqual(selectUnionCrawlTarget(local), {
      kind: "homepage",
      source: "officialWebsite",
      url: "https://official.example.org/",
    });
  });

  it("falls back to the original seed URL", () => {
    const local = createLocal({
      seedUrl: "https://original.example.org/",
    });

    assert.deepEqual(selectUnionCrawlTarget(local), {
      kind: "homepage",
      source: "seedUrl",
      url: "https://original.example.org/",
    });
  });

  it("skips an invalid contractor page and uses the official website", () => {
    const local = createLocal({
      contractorPage: "not a valid url",
      officialWebsite: "https://official.example.org/",
    });

    assert.deepEqual(selectUnionCrawlTarget(local), {
      kind: "homepage",
      source: "officialWebsite",
      url: "https://official.example.org/",
    });
  });

  it("skips URLs with unsupported protocols", () => {
    const local = createLocal({
      contractorPage: "mailto:contractors@example.org",
      officialWebsite: "ftp://files.example.org/",
      seedUrl: "https://original.example.org/",
    });

    assert.deepEqual(selectUnionCrawlTarget(local), {
      kind: "homepage",
      source: "seedUrl",
      url: "https://original.example.org/",
    });
  });

  it("reports when no crawlable URL is available", () => {
    const local = createLocal({
      contractorPage: "unknown",
      officialWebsite: null,
      seedUrl: null,
    });

    assert.deepEqual(selectUnionCrawlTarget(local), {
      kind: "none",
      source: null,
      url: null,
    });
  });
});
