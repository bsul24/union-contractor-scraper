import { CheerioCrawler } from "crawlee";

import { extractContractorLinks } from "./discovery/extractContractorLinks.js";

const targetUrl = process.argv[2];

if (!targetUrl) {
  throw new Error(
    "Please provide a URL. Example: npm run inspect:homepage -- https://ualocal447.org/",
  );
}

const crawler = new CheerioCrawler({
  maxRequestsPerCrawl: 1,

  async requestHandler({ $, request, log }) {
    const pageUrl = request.loadedUrl ?? request.url;
    const title = $("title").first().text().trim();

    const candidates = extractContractorLinks($.html(), pageUrl);

    log.info("Homepage inspected", {
      requestedUrl: request.url,
      loadedUrl: pageUrl,
      title,
      contractorCandidateCount: candidates.length,
    });

    if (candidates.length === 0) {
      log.warning("No contractor-page candidates found.");
      return;
    }

    console.table(
      candidates.map((candidate) => ({
        score: candidate.score,
        text: candidate.text,
        url: candidate.url,
        sameOrigin: candidate.isSameOrigin,
      })),
    );
  },
});

await crawler.run([targetUrl]);
