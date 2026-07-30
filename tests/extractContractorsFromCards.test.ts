import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractContractorsFromCards } from "../src/extractors/extractContractorsFromCards.js";

import type {
  ContractorExtractionContext,
  ContractorRecord,
} from "../src/types/contractor.js";

const CONTEXT: ContractorExtractionContext = {
  localNumber: "246",
  localName: "FRESNO CA",
  sourceUrl: "https://ualocal246.example/contractors/",
};

function createExpectedContractor(
  name: string,
  website: string | null,
): ContractorRecord {
  return {
    name,
    contactName: null,
    email: null,
    phone: null,
    website,
    address: null,
    cityStateZip: null,
    category: null,
    sourceLocalNumber: CONTEXT.localNumber,
    sourceLocalName: CONTEXT.localName,
    sourceUrl: CONTEXT.sourceUrl,
  };
}

describe("extractContractorsFromCards", () => {
  it("extracts linked and unlinked contractor cards", () => {
    const html = `
      <main>
        <h1>Contractors</h1>

        <p>
          The following is a list of our current
          signatory contractors.
        </p>

        <div class="contractor-grid">
          <div class="contractor-card">
            <img src="/images/acco.png" alt="" />

            <a href="https://www.accoes.com/">
              ACCO Engineered Systems
            </a>
          </div>

          <div class="contractor-card">
            <img src="/images/apcco.png" alt="" />

            <a href="https://apcco.net/">
              APCCO
            </a>
          </div>

          <div class="contractor-card">
            <img src="/images/expert-mechanical.png" alt="" />

            <span>
              Expert Mechanical Contractors
            </span>
          </div>
        </div>
      </main>
    `;

    const contractors = extractContractorsFromCards(html, CONTEXT);

    assert.deepEqual(contractors, [
      createExpectedContractor(
        "ACCO Engineered Systems",
        "https://www.accoes.com/",
      ),
      createExpectedContractor("APCCO", "https://apcco.net/"),
      createExpectedContractor("Expert Mechanical Contractors", null),
    ]);
  });

  it("ignores cards outside the contractor section", () => {
    const html = `
      <nav>
        <div class="card">
          <a href="/contractors">
            Contractors
          </a>
        </div>
      </nav>

      <main>
        <h2>Signatory Contractors</h2>

        <div class="contractor-grid">
          <div class="contractor-card">
            <a href="/companies/example-mechanical">
              Example Mechanical
            </a>
          </div>
        </div>
      </main>

      <footer>
        <div class="card">
          <a href="/contact">
            Contact Us
          </a>
        </div>
      </footer>
    `;

    const contractors = extractContractorsFromCards(html, CONTEXT);

    assert.deepEqual(contractors, [
      createExpectedContractor(
        "Example Mechanical",
        "https://ualocal246.example/companies/example-mechanical",
      ),
    ]);
  });

  it("removes duplicate contractor cards by name", () => {
    const html = `
      <section>
        <h2>Partnering Contractors</h2>

        <div class="contractor-grid">
          <div class="contractor-card">
            <a href="https://example.com/">
              Example Mechanical
            </a>
          </div>

          <div class="contractor-card">
            <a href="https://example.com/">
              example mechanical
            </a>
          </div>
        </div>
      </section>
    `;

    const contractors = extractContractorsFromCards(html, CONTEXT);

    assert.deepEqual(contractors, [
      createExpectedContractor("Example Mechanical", "https://example.com/"),
    ]);
  });

  it("finds contractor cards in sibling wrapper elements", () => {
    const html = `
    <main>
      <section class="page-section">
        <div class="heading-widget">
          <h1>Contractors</h1>
        </div>

        <div class="text-widget">
          <p>
            The following is a list of our current
            signatory contractors.
          </p>
        </div>

        <div class="contractor-grid">
          <div class="contractor-card">
            <a href="https://www.accoes.com/">
              ACCO Engineered Systems
            </a>
          </div>

          <div class="contractor-card">
            <a href="https://apcco.net/">
              APCCO
            </a>
          </div>

          <div class="contractor-card">
            <span>
              Expert Mechanical Contractors
            </span>
          </div>
        </div>
      </section>
    </main>
  `;

    const contractors = extractContractorsFromCards(html, CONTEXT);

    assert.deepEqual(contractors, [
      createExpectedContractor(
        "ACCO Engineered Systems",
        "https://www.accoes.com/",
      ),
      createExpectedContractor("APCCO", "https://apcco.net/"),
      createExpectedContractor("Expert Mechanical Contractors", null),
    ]);
  });

  it("ignores breadcrumbs and extracts names from accessible link labels", () => {
    const html = `
    <main>
      <div class="heading-widget">
        <h1>Contractors</h1>
      </div>

      <div class="breadcrumb">
        <a href="/">Home</a>
      </div>

      <div class="contractor-grid">
        <div class="logo-widget">
          <a
            href="https://www.accoes.com/"
            aria-label="ACCO Engineered Systems"
          >
            <img src="/images/acco.png" alt="" />
          </a>
        </div>

        <div class="logo-widget">
          <a
            href="https://apcco.net/"
            title="APCCO"
          >
            <img src="/images/apcco.png" alt="" />
          </a>
        </div>
      </div>
    </main>
  `;

    const contractors = extractContractorsFromCards(html, CONTEXT);

    assert.deepEqual(contractors, [
      createExpectedContractor(
        "ACCO Engineered Systems",
        "https://www.accoes.com/",
      ),
      createExpectedContractor("APCCO", "https://apcco.net/"),
    ]);
  });

  it("extracts cards from a wrapper that contains a later unrelated heading", () => {
    const html = `
    <main>
      <div class="heading-widget">
        <h1>Contractors</h1>
      </div>

      <div class="page-content">
        <div class="contractor-grid">
          <div class="contractor-card">
            <a href="https://www.accoes.com/">
              ACCO Engineered Systems
            </a>
          </div>

          <div class="contractor-card">
            <a href="https://apcco.net/">
              APCCO
            </a>
          </div>
        </div>

        <section class="footer-content">
          <h2>Contact Info</h2>

          <a href="/contact">
            Contact Us
          </a>
        </section>
      </div>
    </main>
  `;

    const contractors = extractContractorsFromCards(html, CONTEXT);

    assert.deepEqual(contractors, [
      createExpectedContractor(
        "ACCO Engineered Systems",
        "https://www.accoes.com/",
      ),
      createExpectedContractor("APCCO", "https://apcco.net/"),
    ]);
  });

  it("ignores generic image link text", () => {
    const html = `
    <main>
      <h1>Contractors</h1>

      <div class="contractor-grid">
        <div class="contractor-card">
          <a href="https://www.accoes.com/">
            Image
          </a>

          <a href="https://www.accoes.com/">
            ACCO Engineered Systems
          </a>
        </div>
      </div>
    </main>
  `;

    const contractors = extractContractorsFromCards(html, CONTEXT);

    assert.deepEqual(contractors, [
      createExpectedContractor(
        "ACCO Engineered Systems",
        "https://www.accoes.com/",
      ),
    ]);
  });
});
