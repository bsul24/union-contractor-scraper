import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  crawlUnionLocal,
  type LoadedHtmlPage,
  type UnionPageLoader,
} from "../src/crawl/crawlUnionLocal.js";

import type { UnionLocal } from "../src/types/union.js";

const BASE_LOCAL: UnionLocal = {
  sourceRow: 2,
  listedRegion: "CA",
  localNumber: "447",
  seedUrl: null,
  localName: "SACRAMENTO CA",
  address: null,
  cityStateZip: null,
  phone: null,
  officialWebsite: null,
  contractorPage: null,
  reviewStatus: null,
  notes: null,
  uaSource: null,
};

function createLocal(overrides: Partial<UnionLocal>): UnionLocal {
  return {
    ...BASE_LOCAL,
    ...overrides,
  };
}

type FakePage = LoadedHtmlPage | Error;

function createFakeLoader(pages: Record<string, FakePage>): {
  loadPage: UnionPageLoader;
  requestedUrls: string[];
} {
  const requestedUrls: string[] = [];

  const loadPage: UnionPageLoader = async (url) => {
    requestedUrls.push(url);

    const page = pages[url];

    if (!page) {
      throw new Error(`Unexpected URL: ${url}`);
    }

    if (page instanceof Error) {
      throw page;
    }

    return page;
  };

  return {
    loadPage,
    requestedUrls,
  };
}

describe("crawlUnionLocal", () => {
  it("skips a local without a crawlable URL", async () => {
    const local = createLocal({});

    const { loadPage, requestedUrls } = createFakeLoader({});

    const result = await crawlUnionLocal(local, loadPage);

    assert.deepEqual(result, {
      status: "skipped",
      sourceRow: 2,
      localNumber: "447",
      localName: "SACRAMENTO CA",
      targetSource: null,
      startUrl: null,
      contractorPageUrl: null,
      extractionStrategy: null,
      contractors: [],
      issueCode: "NO_CRAWLABLE_URL",
      message: "No crawlable URL was available for this union local.",
    });

    assert.deepEqual(requestedUrls, []);
  });

  it("extracts directly from a known contractor page", async () => {
    const contractorPageUrl = "https://union.example.org/contractors/";

    const local = createLocal({
      contractorPage: contractorPageUrl,
    });

    const { loadPage, requestedUrls } = createFakeLoader({
      [contractorPageUrl]: {
        requestedUrl: contractorPageUrl,
        loadedUrl: contractorPageUrl,
        html: `
            <table>
              <tr>
                <th>Contractor</th>
                <th>Phone</th>
              </tr>
              <tr>
                <td>Example Mechanical</td>
                <td>916-555-1234</td>
              </tr>
            </table>
          `,
      },
    });

    const result = await crawlUnionLocal(local, loadPage);

    assert.equal(result.status, "success");

    if (result.status !== "success") {
      assert.fail("Expected a successful result.");
    }

    assert.equal(result.extractionStrategy, "header_table");

    assert.equal(result.contractors[0]?.name, "Example Mechanical");

    assert.equal(result.contractorPageUrl, contractorPageUrl);

    assert.deepEqual(requestedUrls, [contractorPageUrl]);
  });

  it("discovers and follows a contractor page from a homepage", async () => {
    const homepageUrl = "https://union.example.org/";

    const contractorPageUrl = "https://union.example.org/contractors/";

    const local = createLocal({
      officialWebsite: homepageUrl,
    });

    const { loadPage, requestedUrls } = createFakeLoader({
      [homepageUrl]: {
        requestedUrl: homepageUrl,
        loadedUrl: homepageUrl,
        html: `
            <main>
              <a href="/contractors/">
                Contractors
              </a>
            </main>
          `,
      },

      [contractorPageUrl]: {
        requestedUrl: contractorPageUrl,
        loadedUrl: contractorPageUrl,
        html: `
            <h2>All Signatory Contractors</h2>

            <ul>
              <li>Example Mechanical</li>
              <li>Second Mechanical</li>
            </ul>
          `,
      },
    });

    const result = await crawlUnionLocal(local, loadPage);

    assert.equal(result.status, "success");

    if (result.status !== "success") {
      assert.fail("Expected a successful result.");
    }

    assert.equal(result.extractionStrategy, "section_list");

    assert.deepEqual(
      result.contractors.map((contractor) => contractor.name),
      ["Example Mechanical", "Second Mechanical"],
    );

    assert.deepEqual(requestedUrls, [homepageUrl, contractorPageUrl]);
  });

  it("returns a review result when discovery finds no contractor page", async () => {
    const homepageUrl = "https://union.example.org/";

    const local = createLocal({
      officialWebsite: homepageUrl,
    });

    const { loadPage, requestedUrls } = createFakeLoader({
      [homepageUrl]: {
        requestedUrl: homepageUrl,
        loadedUrl: homepageUrl,
        html: `
            <main>
              <a href="/about/">About</a>
              <a href="/contact/">Contact</a>
            </main>
          `,
      },
    });

    const result = await crawlUnionLocal(local, loadPage);

    assert.equal(result.status, "review");
    assert.equal(result.issueCode, "NO_CONTRACTOR_PAGE_FOUND");

    assert.deepEqual(requestedUrls, [homepageUrl]);
  });

  it("returns a review result for a discovered PDF", async () => {
    const homepageUrl = "https://union.example.org/";

    const local = createLocal({
      officialWebsite: homepageUrl,
    });

    const { loadPage, requestedUrls } = createFakeLoader({
      [homepageUrl]: {
        requestedUrl: homepageUrl,
        loadedUrl: homepageUrl,
        html: `
            <a href="/contractor-directory.pdf">
              Contractor Directory
            </a>
          `,
      },
    });

    const result = await crawlUnionLocal(local, loadPage);

    assert.equal(result.status, "review");
    assert.equal(result.issueCode, "PDF_CONTRACTOR_PAGE");

    assert.equal(
      result.contractorPageUrl,
      "https://union.example.org/contractor-directory.pdf",
    );

    assert.deepEqual(requestedUrls, [homepageUrl]);
  });

  it("returns a failed result when the starting request fails", async () => {
    const homepageUrl = "https://union.example.org/";

    const local = createLocal({
      officialWebsite: homepageUrl,
    });

    const { loadPage } = createFakeLoader({
      [homepageUrl]: new Error("Request timed out."),
    });

    const result = await crawlUnionLocal(local, loadPage);

    assert.deepEqual(result, {
      status: "failed",
      sourceRow: 2,
      localNumber: "447",
      localName: "SACRAMENTO CA",
      targetSource: "officialWebsite",
      startUrl: homepageUrl,
      contractorPageUrl: null,
      extractionStrategy: null,
      contractors: [],
      issueCode: "REQUEST_FAILED",
      message: "Request timed out.",
    });
  });

  it("returns a failed result when the discovered contractor request fails", async () => {
    const homepageUrl = "https://union.example.org/";

    const contractorPageUrl = "https://union.example.org/contractors/";

    const local = createLocal({
      officialWebsite: homepageUrl,
    });

    const { loadPage, requestedUrls } = createFakeLoader({
      [homepageUrl]: {
        requestedUrl: homepageUrl,
        loadedUrl: homepageUrl,
        html: `
            <a href="/contractors/">
              Contractors
            </a>
          `,
      },

      [contractorPageUrl]: new Error("Contractor page request failed."),
    });

    const result = await crawlUnionLocal(local, loadPage);

    assert.equal(result.status, "failed");
    assert.equal(result.contractorPageUrl, contractorPageUrl);
    assert.equal(result.message, "Contractor page request failed.");

    assert.deepEqual(requestedUrls, [homepageUrl, contractorPageUrl]);
  });
});
