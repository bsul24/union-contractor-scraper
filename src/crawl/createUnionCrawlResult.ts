import type { ContractorExtractionStrategy } from "../extractors/extractContractors.js";
import type { ContractorRecord } from "../types/contractor.js";
import type {
  FailedUnionCrawlResult,
  ReviewUnionCrawlResult,
  SkippedUnionCrawlResult,
  SuccessfulUnionCrawlResult,
  UnionCrawlReviewIssueCode,
} from "../types/crawl.js";
import type { UnionLocal } from "../types/union.js";
import type { UnionCrawlTarget } from "./selectUnionCrawlTarget.js";

type SuccessfulExtractionStrategy = Exclude<
  ContractorExtractionStrategy,
  "none"
>;

interface SuccessfulResultInput {
  local: UnionLocal;
  target: UnionCrawlTarget;
  contractorPageUrl: string;
  extractionStrategy: SuccessfulExtractionStrategy;
  contractors: ContractorRecord[];
}

interface ReviewResultInput {
  local: UnionLocal;
  target: UnionCrawlTarget;
  contractorPageUrl: string | null;
  extractionStrategy: ContractorExtractionStrategy | null;
  contractors: ContractorRecord[];
  issueCode: UnionCrawlReviewIssueCode;
  message: string;
}

interface SkippedResultInput {
  local: UnionLocal;
  target: UnionCrawlTarget;
  message: string;
}

interface FailedResultInput {
  local: UnionLocal;
  target: UnionCrawlTarget;
  contractorPageUrl: string | null;
  message: string;
}

function createBaseResult(local: UnionLocal, target: UnionCrawlTarget) {
  return {
    sourceRow: local.sourceRow,
    localNumber: local.localNumber,
    localName: local.localName,
    targetSource: target.source,
    startUrl: target.url,
  };
}

export function createSuccessfulUnionCrawlResult(
  input: SuccessfulResultInput,
): SuccessfulUnionCrawlResult {
  return {
    ...createBaseResult(input.local, input.target),
    status: "success",
    contractorPageUrl: input.contractorPageUrl,
    extractionStrategy: input.extractionStrategy,
    contractors: input.contractors,
    issueCode: null,
    message: null,
  };
}

export function createReviewUnionCrawlResult(
  input: ReviewResultInput,
): ReviewUnionCrawlResult {
  return {
    ...createBaseResult(input.local, input.target),
    status: "review",
    contractorPageUrl: input.contractorPageUrl,
    extractionStrategy: input.extractionStrategy,
    contractors: input.contractors,
    issueCode: input.issueCode,
    message: input.message,
  };
}

export function createSkippedUnionCrawlResult(
  input: SkippedResultInput,
): SkippedUnionCrawlResult {
  return {
    ...createBaseResult(input.local, input.target),
    status: "skipped",
    contractorPageUrl: null,
    extractionStrategy: null,
    contractors: [],
    issueCode: "NO_CRAWLABLE_URL",
    message: input.message,
  };
}

export function createFailedUnionCrawlResult(
  input: FailedResultInput,
): FailedUnionCrawlResult {
  return {
    ...createBaseResult(input.local, input.target),
    status: "failed",
    contractorPageUrl: input.contractorPageUrl,
    extractionStrategy: null,
    contractors: [],
    issueCode: "REQUEST_FAILED",
    message: input.message,
  };
}
