import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  crawlUnionLocals,
  type CrawlSingleUnion,
  type UnionCrawlProgress,
} from "../src/crawl/crawlUnionLocals.js";

import type { UnionCrawlResult } from "../src/types/crawl.js";
import type { UnionLocal } from "../src/types/union.js";

function createLocal(localNumber: string, sourceRow: number): UnionLocal {
  return {
    sourceRow,
    listedRegion: "AZ",
    localNumber,
    seedUrl: `https://local${localNumber}.example.org/`,
    localName: `LOCAL ${localNumber}`,
    address: null,
    cityStateZip: null,
    phone: null,
    officialWebsite: null,
    contractorPage: null,
    reviewStatus: null,
    notes: null,
    uaSource: null,
  };
}

function createSkippedResult(local: UnionLocal): UnionCrawlResult {
  return {
    status: "skipped",
    sourceRow: local.sourceRow,
    localNumber: local.localNumber,
    localName: local.localName,
    targetSource: null,
    startUrl: null,
    contractorPageUrl: null,
    extractionStrategy: null,
    contractors: [],
    issueCode: "NO_CRAWLABLE_URL",
    message: "Skipped for test.",
  };
}

describe("crawlUnionLocals", () => {
  it("crawls every local in workbook order", async () => {
    const locals = [
      createLocal("1", 2),
      createLocal("2", 3),
      createLocal("3", 4),
    ];

    const crawledLocalNumbers: string[] = [];

    const crawlLocal: CrawlSingleUnion = async (local) => {
      crawledLocalNumbers.push(local.localNumber);

      return createSkippedResult(local);
    };

    const results = await crawlUnionLocals(locals, crawlLocal);

    assert.deepEqual(crawledLocalNumbers, ["1", "2", "3"]);

    assert.deepEqual(
      results.map((result) => result.localNumber),
      ["1", "2", "3"],
    );
  });

  it("reports progress after each completed local", async () => {
    const locals = [createLocal("1", 2), createLocal("2", 3)];

    const progressUpdates: UnionCrawlProgress[] = [];

    const crawlLocal: CrawlSingleUnion = async (local) =>
      createSkippedResult(local);

    await crawlUnionLocals(locals, crawlLocal, {
      onProgress(progress) {
        progressUpdates.push(progress);
      },
    });

    assert.deepEqual(
      progressUpdates.map((progress) => ({
        completed: progress.completed,
        total: progress.total,
        localNumber: progress.result.localNumber,
      })),
      [
        {
          completed: 1,
          total: 2,
          localNumber: "1",
        },
        {
          completed: 2,
          total: 2,
          localNumber: "2",
        },
      ],
    );
  });

  it("waits for an asynchronous progress callback", async () => {
    const locals = [createLocal("1", 2)];

    let progressCallbackFinished = false;

    const crawlLocal: CrawlSingleUnion = async (local) =>
      createSkippedResult(local);

    await crawlUnionLocals(locals, crawlLocal, {
      async onProgress() {
        await Promise.resolve();
        progressCallbackFinished = true;
      },
    });

    assert.equal(progressCallbackFinished, true);
  });

  it("returns an empty array for an empty local list", async () => {
    let crawlCallCount = 0;

    const crawlLocal: CrawlSingleUnion = async (local) => {
      crawlCallCount += 1;
      return createSkippedResult(local);
    };

    const results = await crawlUnionLocals([], crawlLocal);

    assert.deepEqual(results, []);
    assert.equal(crawlCallCount, 0);
  });
});
