import { CheerioCrawler } from "crawlee";

const targetUrl = process.argv[2];

if (!targetUrl) {
  throw new Error(
    "Please provide a URL. Example: npm run inspect:homepage -- https://ualocal447.org/",
  );
}

const crawler = new CheerioCrawler({
  maxRequestsPerCrawl: 1,

  async requestHandler({ $, request, log }) {
    const title = $("title").first().text().trim();

    const headings = $("h1")
      .map((_, element) => $(element).text().trim())
      .get()
      .filter((heading) => heading !== "");

    log.info("Homepage fetched", {
      requestedUrl: request.url,
      loadedUrl: request.loadedUrl,
      title,
      headings,
    });
  },
});

await crawler.run([targetUrl]);
