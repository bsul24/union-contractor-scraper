import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractContractorsFromList } from "../src/extractors/extractContractorsFromList.js";

const CONTEXT = {
  localNumber: "469",
  localName: "PHOENIX AZ",
  sourceUrl: "https://ualocal.example.org/contractors/",
};

describe("extractContractorsFromList", () => {
  it("extracts linked and unlinked names from a contractor section", () => {
    const html = `
      <main>
        <h2>All UA Local 469 Signatory Contractors</h2>

        <ul>
          <li>
            <a href="https://www.acrspecialists.com/">
              AC&R Specialists
            </a>
          </li>
          <li>
            <a href="https://www.accoes.com/">
              ACCO Engineered Systems
            </a>
          </li>
          <li>Apcon Construction</li>
        </ul>
      </main>
    `;

    const contractors = extractContractorsFromList(html, CONTEXT);

    assert.deepEqual(contractors, [
      {
        name: "AC&R Specialists",
        contactName: null,
        email: null,
        phone: null,
        website: "https://www.acrspecialists.com/",
        address: null,
        cityStateZip: null,
        category: null,
        sourceLocalNumber: "469",
        sourceLocalName: "PHOENIX AZ",
        sourceUrl: "https://ualocal.example.org/contractors/",
      },
      {
        name: "ACCO Engineered Systems",
        contactName: null,
        email: null,
        phone: null,
        website: "https://www.accoes.com/",
        address: null,
        cityStateZip: null,
        category: null,
        sourceLocalNumber: "469",
        sourceLocalName: "PHOENIX AZ",
        sourceUrl: "https://ualocal.example.org/contractors/",
      },
      {
        name: "Apcon Construction",
        contactName: null,
        email: null,
        phone: null,
        website: null,
        address: null,
        cityStateZip: null,
        category: null,
        sourceLocalNumber: "469",
        sourceLocalName: "PHOENIX AZ",
        sourceUrl: "https://ualocal.example.org/contractors/",
      },
    ]);
  });

  it("recognizes common contractor-section heading variations", () => {
    const html = `
      <h2>Signatory Employers</h2>
      <ul>
        <li>Example Mechanical</li>
      </ul>

      <h2>Contractor Directory</h2>
      <ul>
        <li>Second Mechanical</li>
      </ul>
    `;

    const contractors = extractContractorsFromList(html, CONTEXT);

    assert.deepEqual(
      contractors.map((contractor) => contractor.name),
      ["Example Mechanical", "Second Mechanical"],
    );
  });

  it("ignores navigation and footer lists", () => {
    const html = `
      <nav>
        <ul>
          <li><a href="/about/">About</a></li>
          <li><a href="/contractors/">Contractors</a></li>
        </ul>
      </nav>

      <h2>All Signatory Contractors</h2>
      <ul>
        <li>Real Contractor</li>
      </ul>

      <footer>
        <ul>
          <li>Contact Info</li>
          <li>Member Login</li>
        </ul>
      </footer>
    `;

    const contractors = extractContractorsFromList(html, CONTEXT);

    assert.deepEqual(
      contractors.map((contractor) => contractor.name),
      ["Real Contractor"],
    );
  });

  it("stops at the next unrelated section heading", () => {
    const html = `
      <h2>All Signatory Contractors</h2>
      <ul>
        <li>Example Mechanical</li>
      </ul>

      <h2>Have A Question?</h2>
      <ul>
        <li>Contact the Union Office</li>
      </ul>
    `;

    const contractors = extractContractorsFromList(html, CONTEXT);

    assert.deepEqual(
      contractors.map((contractor) => contractor.name),
      ["Example Mechanical"],
    );
  });

  it("resolves relative contractor websites", () => {
    const html = `
      <h2>Contractor Directory</h2>
      <ul>
        <li>
          <a href="/companies/example-mechanical/">
            Example Mechanical
          </a>
        </li>
      </ul>
    `;

    const contractors = extractContractorsFromList(html, CONTEXT);

    assert.equal(
      contractors[0]?.website,
      "https://ualocal.example.org/companies/example-mechanical/",
    );
  });

  it("ignores blank list items and duplicate contractor names", () => {
    const html = `
      <h2>All Signatory Contractors</h2>
      <ul>
        <li>Example Mechanical</li>
        <li>   </li>
        <li>Example Mechanical</li>
      </ul>
    `;

    const contractors = extractContractorsFromList(html, CONTEXT);

    assert.equal(contractors.length, 1);
    assert.equal(contractors[0]?.name, "Example Mechanical");
  });

  it("returns an empty array without a recognized section", () => {
    const html = `
      <h2>Quicklinks</h2>
      <ul>
        <li>About Us</li>
        <li>Contact</li>
      </ul>
    `;

    const contractors = extractContractorsFromList(html, CONTEXT);

    assert.deepEqual(contractors, []);
  });
});
