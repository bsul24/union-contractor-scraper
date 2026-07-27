import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractContractorLinks } from "../src/discovery/extractContractorLinks.js";

describe("extractContractorLinks", () => {
  it("extracts and resolves a relative contractor link", () => {
    const html = `
      <nav>
        <a href="/about/">About Us</a>
        <a href="/contractors/">Contractor Directory</a>
      </nav>
    `;

    const candidates = extractContractorLinks(
      html,
      "https://ualocal.example.org/",
    );

    assert.equal(candidates.length, 1);

    const candidate = candidates[0];

    assert.ok(candidate);

    assert.equal(candidate.text, "Contractor Directory");
    assert.equal(candidate.href, "/contractors/");
    assert.equal(candidate.url, "https://ualocal.example.org/contractors/");
    assert.equal(candidate.isSameOrigin, true);
    assert.ok(candidate.score >= 8);
  });

  it("uses contractor terms in the URL when link text is vague", () => {
    const html = `
      <a href="/resources/contractor-list/">
        View Directory
      </a>
    `;

    const candidates = extractContractorLinks(
      html,
      "https://ualocal.example.org/members/",
    );

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0]?.text, "View Directory");
    assert.equal(
      candidates[0]?.url,
      "https://ualocal.example.org/resources/contractor-list/",
    );
    assert.ok((candidates[0]?.score ?? 0) >= 5);
  });

  it("ignores unrelated links", () => {
    const html = `
      <a href="/about/">About Our Local</a>
      <a href="/contact/">Contact Us</a>
      <a href="/news/">Latest News</a>
    `;

    const candidates = extractContractorLinks(
      html,
      "https://ualocal.example.org/",
    );

    assert.deepEqual(candidates, []);
  });

  it("ignores links that cannot be crawled as web pages", () => {
    const html = `
      <a href="mailto:office@example.org">Contractor Email</a>
      <a href="tel:+16025551234">Call Contractors</a>
      <a href="javascript:void(0)">Contractor Directory</a>
      <a href="#contractors">Contractors</a>
    `;

    const candidates = extractContractorLinks(
      html,
      "https://ualocal.example.org/",
    );

    assert.deepEqual(candidates, []);
  });

  it("identifies contractor links on another origin", () => {
    const html = `
      <a href="https://contractors.example.com/directory/">
        Contractor Directory
      </a>
    `;

    const candidates = extractContractorLinks(
      html,
      "https://ualocal.example.org/",
    );

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0]?.isSameOrigin, false);
    assert.equal(
      candidates[0]?.url,
      "https://contractors.example.com/directory/",
    );
  });

  it("removes duplicate destinations", () => {
    const html = `
      <a href="/contractors/">Contractors</a>
      <a href="/contractors/">Contractor Directory</a>
    `;

    const candidates = extractContractorLinks(
      html,
      "https://ualocal.example.org/",
    );

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0]?.text, "Contractor Directory");
    assert.ok((candidates[0]?.score ?? 0) >= 8);
  });

  it("sorts candidates from strongest to weakest", () => {
    const html = `
      <a href="/employers/">Employers</a>
      <a href="/contractors/">Contractor Directory</a>
      <a href="/signatory-employers/">Signatory Employers</a>
    `;

    const candidates = extractContractorLinks(
      html,
      "https://ualocal.example.org/",
    );

    assert.deepEqual(
      candidates.map((candidate) => candidate.text),
      ["Contractor Directory", "Signatory Employers", "Employers"],
    );
  });
});
