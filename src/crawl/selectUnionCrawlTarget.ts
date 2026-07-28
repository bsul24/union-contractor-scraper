import type { UnionLocal } from "../types/union.js";

export type UnionCrawlTargetKind = "contractor_page" | "homepage" | "none";

export type UnionCrawlTargetSource =
  | "contractorPage"
  | "officialWebsite"
  | "seedUrl"
  | null;

export interface UnionCrawlTarget {
  kind: UnionCrawlTargetKind;
  source: UnionCrawlTargetSource;
  url: string | null;
}

function getCrawlableUrl(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const trimmedValue = value.trim();

  if (trimmedValue === "") {
    return null;
  }

  try {
    const url = new URL(trimmedValue);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function selectUnionCrawlTarget(local: UnionLocal): UnionCrawlTarget {
  const contractorPage = getCrawlableUrl(local.contractorPage);

  if (contractorPage !== null) {
    return {
      kind: "contractor_page",
      source: "contractorPage",
      url: contractorPage,
    };
  }

  const officialWebsite = getCrawlableUrl(local.officialWebsite);

  if (officialWebsite !== null) {
    return {
      kind: "homepage",
      source: "officialWebsite",
      url: officialWebsite,
    };
  }

  const seedUrl = getCrawlableUrl(local.seedUrl);

  if (seedUrl !== null) {
    return {
      kind: "homepage",
      source: "seedUrl",
      url: seedUrl,
    };
  }

  return {
    kind: "none",
    source: null,
    url: null,
  };
}
