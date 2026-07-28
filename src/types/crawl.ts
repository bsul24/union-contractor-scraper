import type { ContractorExtractionStrategy } from "../extractors/extractContractors.js";
import type { UnionCrawlTargetSource } from "../crawl/selectUnionCrawlTarget.js";
import type { ContractorRecord } from "./contractor.js";

interface BaseUnionCrawlResult {
  sourceRow: number;
  localNumber: string;
  localName: string;
  targetSource: UnionCrawlTargetSource;
  startUrl: string | null;
}

export interface SuccessfulUnionCrawlResult extends BaseUnionCrawlResult {
  status: "success";
  contractorPageUrl: string;
  extractionStrategy: Exclude<ContractorExtractionStrategy, "none">;
  contractors: ContractorRecord[];
  issueCode: null;
  message: null;
}

export type UnionCrawlReviewIssueCode =
  | "NO_CONTRACTOR_PAGE_FOUND"
  | "PDF_CONTRACTOR_PAGE"
  | "NO_CONTRACTORS_EXTRACTED";

export interface ReviewUnionCrawlResult extends BaseUnionCrawlResult {
  status: "review";
  contractorPageUrl: string | null;
  extractionStrategy: ContractorExtractionStrategy | null;
  contractors: ContractorRecord[];
  issueCode: UnionCrawlReviewIssueCode;
  message: string;
}

export interface SkippedUnionCrawlResult extends BaseUnionCrawlResult {
  status: "skipped";
  contractorPageUrl: null;
  extractionStrategy: null;
  contractors: [];
  issueCode: "NO_CRAWLABLE_URL";
  message: string;
}

export interface FailedUnionCrawlResult extends BaseUnionCrawlResult {
  status: "failed";
  contractorPageUrl: string | null;
  extractionStrategy: null;
  contractors: [];
  issueCode: "REQUEST_FAILED";
  message: string;
}

export type UnionCrawlResult =
  | SuccessfulUnionCrawlResult
  | ReviewUnionCrawlResult
  | SkippedUnionCrawlResult
  | FailedUnionCrawlResult;
