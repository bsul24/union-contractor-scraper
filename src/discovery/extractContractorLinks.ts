import { load } from "cheerio";

import {
  scoreContractorLink,
  type LinkCandidate,
} from "./scoreContractorLink.js";

export interface ContractorLinkCandidate extends LinkCandidate {
  url: string;
  score: number;
  isSameOrigin: boolean;
}

function isCrawlableHref(href: string): boolean {
  const normalizedHref = href.trim().toLowerCase();

  if (normalizedHref === "") {
    return false;
  }

  return !(
    normalizedHref.startsWith("#") ||
    normalizedHref.startsWith("mailto:") ||
    normalizedHref.startsWith("tel:") ||
    normalizedHref.startsWith("javascript:")
  );
}

export function extractContractorLinks(
  html: string,
  pageUrl: string,
): ContractorLinkCandidate[] {
  const $ = load(html);
  const sourceUrl = new URL(pageUrl);

  const candidatesByUrl = new Map<string, ContractorLinkCandidate>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");

    if (!href || !isCrawlableHref(href)) {
      return;
    }

    let resolvedUrl: URL;

    try {
      resolvedUrl = new URL(href, sourceUrl);
    } catch {
      return;
    }

    if (resolvedUrl.protocol !== "http:" && resolvedUrl.protocol !== "https:") {
      return;
    }

    const text = $(element).text().replace(/\s+/g, " ").trim();

    const linkCandidate: LinkCandidate = {
      text,
      href,
    };

    const score = scoreContractorLink(linkCandidate);

    if (score === 0) {
      return;
    }

    resolvedUrl.hash = "";

    const candidate: ContractorLinkCandidate = {
      text,
      href,
      url: resolvedUrl.toString(),
      score,
      isSameOrigin: resolvedUrl.origin === sourceUrl.origin,
    };

    const existingCandidate = candidatesByUrl.get(candidate.url);

    if (!existingCandidate || candidate.score > existingCandidate.score) {
      candidatesByUrl.set(candidate.url, candidate);
    }
  });

  return [...candidatesByUrl.values()].sort(
    (firstCandidate, secondCandidate) =>
      secondCandidate.score - firstCandidate.score,
  );
}
