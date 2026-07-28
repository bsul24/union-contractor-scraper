import { extractContractorLinks } from "../discovery/extractContractorLinks.js";
import { extractContractors } from "../extractors/extractContractors.js";
import type { UnionCrawlResult } from "../types/crawl.js";
import type { UnionLocal } from "../types/union.js";
import {
  createReviewUnionCrawlResult,
  createSuccessfulUnionCrawlResult,
} from "./createUnionCrawlResult.js";
import type {
  UnionCrawlTarget,
  UnionCrawlTargetKind,
} from "./selectUnionCrawlTarget.js";

export type LoadedUnionPageKind = Exclude<UnionCrawlTargetKind, "none">;

export interface ProcessLoadedUnionPageInput {
  local: UnionLocal;
  target: UnionCrawlTarget;
  pageKind: LoadedUnionPageKind;
  pageUrl: string;
  html: string;
}

export interface FollowContractorPageResult {
  action: "follow";
  contractorPageUrl: string;
}

export interface CompleteUnionCrawlResult {
  action: "complete";
  result: UnionCrawlResult;
}

export type LoadedUnionPageResult =
  | FollowContractorPageResult
  | CompleteUnionCrawlResult;

export function processLoadedUnionPage(
  input: ProcessLoadedUnionPageInput,
): LoadedUnionPageResult {
  if (input.pageKind === "homepage") {
    const candidates = extractContractorLinks(input.html, input.pageUrl);

    const selectedCandidate =
      candidates.find((candidate) => candidate.isSameOrigin) ?? candidates[0];

    if (!selectedCandidate) {
      return {
        action: "complete",
        result: createReviewUnionCrawlResult({
          local: input.local,
          target: input.target,
          contractorPageUrl: null,
          extractionStrategy: null,
          contractors: [],
          issueCode: "NO_CONTRACTOR_PAGE_FOUND",
          message: "No contractor-page candidate was found on the homepage.",
        }),
      };
    }

    const contractorPageUrl = new URL(selectedCandidate.url);

    if (contractorPageUrl.pathname.toLowerCase().endsWith(".pdf")) {
      return {
        action: "complete",
        result: createReviewUnionCrawlResult({
          local: input.local,
          target: input.target,
          contractorPageUrl: selectedCandidate.url,
          extractionStrategy: null,
          contractors: [],
          issueCode: "PDF_CONTRACTOR_PAGE",
          message: "The discovered contractor page is a PDF.",
        }),
      };
    }

    return {
      action: "follow",
      contractorPageUrl: selectedCandidate.url,
    };
  }

  const extractionResult = extractContractors(input.html, {
    localNumber: input.local.localNumber,
    localName: input.local.localName,
    sourceUrl: input.pageUrl,
  });

  if (extractionResult.strategy === "none") {
    return {
      action: "complete",
      result: createReviewUnionCrawlResult({
        local: input.local,
        target: input.target,
        contractorPageUrl: input.pageUrl,
        extractionStrategy: "none",
        contractors: [],
        issueCode: "NO_CONTRACTORS_EXTRACTED",
        message:
          "The contractor page was found but no contractor records were extracted.",
      }),
    };
  }

  return {
    action: "complete",
    result: createSuccessfulUnionCrawlResult({
      local: input.local,
      target: input.target,
      contractorPageUrl: input.pageUrl,
      extractionStrategy: extractionResult.strategy,
      contractors: extractionResult.contractors,
    }),
  };
}
