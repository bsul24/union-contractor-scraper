import type { UnionCrawlResult } from "../types/crawl.js";
import type { UnionLocal } from "../types/union.js";

export type CrawlSingleUnion = (local: UnionLocal) => Promise<UnionCrawlResult>;

export interface UnionCrawlProgress {
  completed: number;
  total: number;
  result: UnionCrawlResult;
}

export interface CrawlUnionLocalsOptions {
  onProgress?: (progress: UnionCrawlProgress) => void | Promise<void>;
}

export async function crawlUnionLocals(
  locals: UnionLocal[],
  crawlLocal: CrawlSingleUnion,
  options: CrawlUnionLocalsOptions = {},
): Promise<UnionCrawlResult[]> {
  const results: UnionCrawlResult[] = [];
  const total = locals.length;

  for (const local of locals) {
    const result = await crawlLocal(local);

    results.push(result);

    await options.onProgress?.({
      completed: results.length,
      total,
      result,
    });
  }

  return results;
}
