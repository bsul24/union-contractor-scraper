import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  scoreContractorLink,
  type LinkCandidate,
} from "../src/discovery/scoreContractorLink.js";

function candidate(text: string, href: string): LinkCandidate {
  return {
    text,
    href,
  };
}

describe("scoreContractorLink", () => {
  it("gives a strong score to an explicit contractor directory", () => {
    const score = scoreContractorLink(
      candidate("Contractor Directory", "/contractors/"),
    );

    assert.ok(score >= 8);
  });

  it("recognizes signatory employer terminology", () => {
    const score = scoreContractorLink(
      candidate("Signatory Employers", "/signatory-employers/"),
    );

    assert.ok(score >= 6);
  });

  it("uses the URL when the visible text is vague", () => {
    const score = scoreContractorLink(
      candidate("View Directory", "/resources/contractor-list/"),
    );

    assert.ok(score >= 5);
  });

  it("recognizes downloadable contractor directories", () => {
    const score = scoreContractorLink(
      candidate("Download PDF", "/documents/contractor-directory.pdf"),
    );

    assert.ok(score >= 5);
  });

  it("returns zero for unrelated navigation links", () => {
    assert.equal(scoreContractorLink(candidate("Contact Us", "/contact/")), 0);

    assert.equal(
      scoreContractorLink(candidate("About Our Local", "/about/")),
      0,
    );
  });

  it("matches keywords without regard to capitalization", () => {
    const lowercaseScore = scoreContractorLink(
      candidate("contractor directory", "/contractors/"),
    );

    const uppercaseScore = scoreContractorLink(
      candidate("CONTRACTOR DIRECTORY", "/CONTRACTORS/"),
    );

    assert.equal(uppercaseScore, lowercaseScore);
  });
});
