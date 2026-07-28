import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { processLoadedUnionPage } from "../src/crawl/processLoadedUnionPage.js";

import type { UnionCrawlTarget } from "../src/crawl/selectUnionCrawlTarget.js";
import type { UnionLocal } from "../src/types/union.js";

const LOCAL: UnionLocal = {
  sourceRow: 2,
  listedRegion: "CA",
  localNumber: "447",
  seedUrl: "https://original.example.org/",
  localName: "SACRAMENTO CA",
  address: null,
  cityStateZip: null,
  phone: null,
  officialWebsite: "https://union.example.org/",
  contractorPage: null,
  reviewStatus: null,
  notes: null,
  uaSource: null,
};

const HOMEPAGE_TARGET: UnionCrawlTarget = {
  kind: "homepage",
  source: "officialWebsite",
  url: "https://union.example.org/",
};

const CONTRACTOR_PAGE_TARGET: UnionCrawlTarget = {
  kind: "contractor_page",
  source: "contractorPage",
  url: "https://union.example.org/contractors/",
};

describe("processLoadedUnionPage", () => {
  it("selects a same-origin contractor-page candidate from a homepage", () => {
    const html = `
      <main>
        <a
          href="https://directory.example.com/contractor-directory/"
        >
          Contractor Directory
        </a>

        <a href="/contractors/">
          Contractors
        </a>
      </main>
    `;

    const result = processLoadedUnionPage({
      local: LOCAL,
      target: HOMEPAGE_TARGET,
      pageKind: "homepage",
      pageUrl: "https://union.example.org/",
      html,
    });

    assert.deepEqual(result, {
      action: "follow",
      contractorPageUrl: "https://union.example.org/contractors/",
    });
  });

  it("completes with a review result when no contractor page is found", () => {
    const html = `
      <main>
        <h1>Welcome</h1>
        <a href="/about/">About Us</a>
        <a href="/contact/">Contact</a>
      </main>
    `;

    const result = processLoadedUnionPage({
      local: LOCAL,
      target: HOMEPAGE_TARGET,
      pageKind: "homepage",
      pageUrl: "https://union.example.org/",
      html,
    });

    assert.deepEqual(result, {
      action: "complete",
      result: {
        status: "review",
        sourceRow: 2,
        localNumber: "447",
        localName: "SACRAMENTO CA",
        targetSource: "officialWebsite",
        startUrl: "https://union.example.org/",
        contractorPageUrl: null,
        extractionStrategy: null,
        contractors: [],
        issueCode: "NO_CONTRACTOR_PAGE_FOUND",
        message: "No contractor-page candidate was found on the homepage.",
      },
    });
  });

  it("completes with a review result for a PDF contractor page", () => {
    const html = `
      <main>
        <a href="/documents/contractor-directory.pdf">
          Contractor Directory
        </a>
      </main>
    `;

    const result = processLoadedUnionPage({
      local: LOCAL,
      target: HOMEPAGE_TARGET,
      pageKind: "homepage",
      pageUrl: "https://union.example.org/",
      html,
    });

    assert.deepEqual(result, {
      action: "complete",
      result: {
        status: "review",
        sourceRow: 2,
        localNumber: "447",
        localName: "SACRAMENTO CA",
        targetSource: "officialWebsite",
        startUrl: "https://union.example.org/",
        contractorPageUrl:
          "https://union.example.org/documents/contractor-directory.pdf",
        extractionStrategy: null,
        contractors: [],
        issueCode: "PDF_CONTRACTOR_PAGE",
        message: "The discovered contractor page is a PDF.",
      },
    });
  });

  it("completes successfully after extracting a contractor table", () => {
    const html = `
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
    `;

    const result = processLoadedUnionPage({
      local: LOCAL,
      target: CONTRACTOR_PAGE_TARGET,
      pageKind: "contractor_page",
      pageUrl: "https://union.example.org/contractors/",
      html,
    });

    assert.equal(result.action, "complete");

    if (result.action !== "complete") {
      assert.fail("Expected the crawl to be complete.");
    }

    assert.equal(result.result.status, "success");

    if (result.result.status !== "success") {
      assert.fail("Expected a successful crawl result.");
    }

    assert.equal(result.result.extractionStrategy, "header_table");

    assert.equal(result.result.contractors.length, 1);

    assert.equal(result.result.contractors[0]?.name, "Example Mechanical");

    assert.equal(
      result.result.contractorPageUrl,
      "https://union.example.org/contractors/",
    );
  });

  it("marks a contractor page for review when extraction finds nothing", () => {
    const html = `
      <main>
        <h1>Contractors</h1>
        <p>Contact our office for more information.</p>
      </main>
    `;

    const result = processLoadedUnionPage({
      local: LOCAL,
      target: CONTRACTOR_PAGE_TARGET,
      pageKind: "contractor_page",
      pageUrl: "https://union.example.org/contractors/",
      html,
    });

    assert.deepEqual(result, {
      action: "complete",
      result: {
        status: "review",
        sourceRow: 2,
        localNumber: "447",
        localName: "SACRAMENTO CA",
        targetSource: "contractorPage",
        startUrl: "https://union.example.org/contractors/",
        contractorPageUrl: "https://union.example.org/contractors/",
        extractionStrategy: "none",
        contractors: [],
        issueCode: "NO_CONTRACTORS_EXTRACTED",
        message:
          "The contractor page was found but no contractor records were extracted.",
      },
    });
  });
});
