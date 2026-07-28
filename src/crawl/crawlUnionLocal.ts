import {
  createFailedUnionCrawlResult,
  createSkippedUnionCrawlResult,
} from "./createUnionCrawlResult.js";
import { processLoadedUnionPage } from "./processLoadedUnionPage.js";
import { selectUnionCrawlTarget } from "./selectUnionCrawlTarget.js";

import type { UnionCrawlResult } from "../types/crawl.js";
import type { UnionLocal } from "../types/union.js";

export interface LoadedHtmlPage {
  requestedUrl: string;
  loadedUrl: string;
  html: string;
}

export type UnionPageLoader = (url: string) => Promise<LoadedHtmlPage>;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function crawlUnionLocal(
  local: UnionLocal,
  loadPage: UnionPageLoader,
): Promise<UnionCrawlResult> {
  const target = selectUnionCrawlTarget(local);

  if (target.kind === "none" || target.url === null) {
    return createSkippedUnionCrawlResult({
      local,
      target,
      message: "No crawlable URL was available for this union local.",
    });
  }

  let startingPage: LoadedHtmlPage;

  try {
    startingPage = await loadPage(target.url);
  } catch (error) {
    return createFailedUnionCrawlResult({
      local,
      target,
      contractorPageUrl: target.kind === "contractor_page" ? target.url : null,
      message: getErrorMessage(error),
    });
  }

  const startingPageResult = processLoadedUnionPage({
    local,
    target,
    pageKind: target.kind,
    pageUrl: startingPage.loadedUrl,
    html: startingPage.html,
  });

  if (startingPageResult.action === "complete") {
    return startingPageResult.result;
  }

  const contractorPageUrl = startingPageResult.contractorPageUrl;

  let contractorPage: LoadedHtmlPage;

  try {
    contractorPage = await loadPage(contractorPageUrl);
  } catch (error) {
    return createFailedUnionCrawlResult({
      local,
      target,
      contractorPageUrl,
      message: getErrorMessage(error),
    });
  }

  const contractorPageResult = processLoadedUnionPage({
    local,
    target,
    pageKind: "contractor_page",
    pageUrl: contractorPage.loadedUrl,
    html: contractorPage.html,
  });

  if (contractorPageResult.action === "follow") {
    throw new Error(
      "A contractor page unexpectedly requested another contractor page.",
    );
  }

  return contractorPageResult.result;
}
