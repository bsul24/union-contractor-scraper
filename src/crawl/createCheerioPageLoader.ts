import { CheerioCrawler, Configuration } from "crawlee";

import type { LoadedHtmlPage, UnionPageLoader } from "./crawlUnionLocal.js";

export interface CheerioPageLoaderOptions {
  navigationTimeoutSecs?: number;
  maxRequestRetries?: number;
}

const HTTP_CLIENT_ERROR_STATUS_CODES = Array.from(
  { length: 100 },
  (_, index) => 400 + index,
);

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function createCheerioPageLoader(
  options: CheerioPageLoaderOptions = {},
): UnionPageLoader {
  const navigationTimeoutSecs = options.navigationTimeoutSecs ?? 30;

  const maxRequestRetries = options.maxRequestRetries ?? 2;

  return async (url: string): Promise<LoadedHtmlPage> => {
    let loadedPage: LoadedHtmlPage | null = null;
    let failedRequestMessage: string | null = null;

    const configuration = new Configuration({
      persistStorage: false,
    });

    const crawler = new CheerioCrawler(
      {
        maxRequestsPerCrawl: 1,
        maxConcurrency: 1,
        navigationTimeoutSecs,
        maxRequestRetries,

        additionalHttpErrorStatusCodes: HTTP_CLIENT_ERROR_STATUS_CODES,

        requestHandler({ $, request }) {
          loadedPage = {
            requestedUrl: url,
            loadedUrl: request.loadedUrl ?? request.url,
            html: $.html(),
          };
        },

        failedRequestHandler({ request }, error) {
          failedRequestMessage =
            getErrorMessage(error) || request.errorMessages.at(-1) || null;
        },
      },
      configuration,
    );

    try {
      await crawler.run([url]);
    } catch (error) {
      throw new Error(`Failed to load ${url}: ${getErrorMessage(error)}`, {
        cause: error,
      });
    }

    if (loadedPage === null) {
      const details =
        failedRequestMessage ??
        "The crawler completed without loading the page.";

      throw new Error(`Failed to load ${url}: ${details}`);
    }

    return loadedPage;
  };
}
