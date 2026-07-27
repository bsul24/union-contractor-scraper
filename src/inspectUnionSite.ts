import { CheerioCrawler } from "crawlee";

import { extractContractorLinks } from "./discovery/extractContractorLinks.js";

const HOMEPAGE_LABEL = "HOMEPAGE";
const CONTRACTOR_PAGE_LABEL = "CONTRACTOR_PAGE";

const targetUrl = process.argv[2];

if (!targetUrl) {
  throw new Error(
    "Please provide a URL. Example: npm run inspect:site -- https://ualocal447.org/",
  );
}

const crawler = new CheerioCrawler({
  maxRequestsPerCrawl: 2,

  async requestHandler({ $, request, log, addRequests }) {
    const pageUrl = request.loadedUrl ?? request.url;

    if (request.label === HOMEPAGE_LABEL) {
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

      const bestCandidate =
        candidates.find((candidate) => candidate.isSameOrigin) ?? candidates[0];

      if (!bestCandidate) {
        return;
      }

      const candidateUrl = new URL(bestCandidate.url);

      if (candidateUrl.pathname.toLowerCase().endsWith(".pdf")) {
        log.warning(
          "The strongest candidate is a PDF and cannot be inspected with CheerioCrawler yet.",
          {
            url: bestCandidate.url,
            score: bestCandidate.score,
          },
        );

        return;
      }

      log.info("Following contractor-page candidate", {
        url: bestCandidate.url,
        text: bestCandidate.text,
        score: bestCandidate.score,
      });

      await addRequests([
        {
          url: bestCandidate.url,
          label: CONTRACTOR_PAGE_LABEL,
        },
      ]);

      return;
    }

    if (request.label === CONTRACTOR_PAGE_LABEL) {
      const title = $("title").first().text().trim();

      const headings = $("h1, h2, h3")
        .map((_, element) => $(element).text().replace(/\s+/g, " ").trim())
        .get()
        .filter((heading) => heading !== "");

      log.info("Contractor page inspected", {
        requestedUrl: request.url,
        loadedUrl: pageUrl,
        title,
        headingCount: headings.length,
        tableCount: $("table").length,
        tableRowCount: $("table tr").length,
        mailtoLinkCount: $('a[href^="mailto:"]').length,
        telephoneLinkCount: $('a[href^="tel:"]').length,
        addressElementCount: $("address").length,
      });

      console.log("Page headings:");

      console.table(
        headings.slice(0, 20).map((heading, index) => ({
          position: index + 1,
          heading,
        })),
      );

      return;
    }

    log.warning("Received a request with an unknown label.", {
      label: request.label,
      url: request.url,
    });
  },
});

await crawler.run([
  {
    url: targetUrl,
    label: HOMEPAGE_LABEL,
  },
]);
