import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractContractors } from "../src/extractors/extractContractors.js";

const CONTEXT = {
  localNumber: "447",
  localName: "SACRAMENTO CA",
  sourceUrl: "https://ualocal.example.org/contractors/",
};

describe("extractContractors", () => {
  it("uses the header-table strategy when it finds records", () => {
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

    const result = extractContractors(html, CONTEXT);

    assert.equal(result.strategy, "header_table");
    assert.equal(result.contractors.length, 1);
    assert.equal(result.contractors[0]?.name, "Example Mechanical");
  });

  it("falls back to the labeled-table strategy", () => {
    const html = `
      <table>
        <tr>
          <td colspan="2">Example Mechanical</td>
        </tr>
        <tr>
          <td>Contact:</td>
          <td>Jordan Smith</td>
        </tr>
        <tr>
          <td>Phone:</td>
          <td>916-555-1234</td>
        </tr>
      </table>
    `;

    const result = extractContractors(html, CONTEXT);

    assert.equal(result.strategy, "labeled_table");
    assert.equal(result.contractors.length, 1);

    assert.deepEqual(result.contractors[0], {
      name: "Example Mechanical",
      contactName: "Jordan Smith",
      email: null,
      phone: "916-555-1234",
      website: null,
      address: null,
      cityStateZip: null,
      category: null,
      sourceLocalNumber: "447",
      sourceLocalName: "SACRAMENTO CA",
      sourceUrl: "https://ualocal.example.org/contractors/",
    });
  });

  it("prefers the header-table strategy when both find records", () => {
    const html = `
      <table>
        <tr>
          <th>Contractor</th>
          <th>Phone</th>
        </tr>
        <tr>
          <td>Header Table Company</td>
          <td>916-555-1000</td>
        </tr>
      </table>

      <table>
        <tr>
          <td colspan="2">Labeled Table Company</td>
        </tr>
        <tr>
          <td>Phone:</td>
          <td>916-555-2000</td>
        </tr>
      </table>
    `;

    const result = extractContractors(html, CONTEXT);

    assert.equal(result.strategy, "header_table");

    assert.deepEqual(
      result.contractors.map((contractor) => contractor.name),
      ["Header Table Company"],
    );
  });

  it("reports when no extraction strategy succeeds", () => {
    const html = `
      <main>
        <h1>Contractors</h1>
        <p>Contact the union office for more information.</p>
      </main>
    `;

    const result = extractContractors(html, CONTEXT);

    assert.deepEqual(result, {
      strategy: "none",
      contractors: [],
    });
  });

  it("falls back to the section-list strategy", () => {
    const html = `
    <main>
      <h2>All Signatory Contractors</h2>

      <ul>
        <li>
          <a href="https://example-mechanical.com/">
            Example Mechanical
          </a>
        </li>
        <li>Second Mechanical</li>
      </ul>
    </main>
  `;

    const result = extractContractors(html, CONTEXT);

    assert.equal(result.strategy, "section_list");

    assert.deepEqual(
      result.contractors.map((contractor) => ({
        name: contractor.name,
        website: contractor.website,
      })),
      [
        {
          name: "Example Mechanical",
          website: "https://example-mechanical.com/",
        },
        {
          name: "Second Mechanical",
          website: null,
        },
      ],
    );
  });

  it("prefers the labeled-table strategy over section lists", () => {
    const html = `
    <table>
      <tr>
        <td colspan="2">Labeled Table Company</td>
      </tr>
      <tr>
        <td>Phone:</td>
        <td>916-555-1000</td>
      </tr>
    </table>

    <h2>All Signatory Contractors</h2>
    <ul>
      <li>List Company</li>
    </ul>
  `;

    const result = extractContractors(html, CONTEXT);

    assert.equal(result.strategy, "labeled_table");

    assert.deepEqual(
      result.contractors.map((contractor) => contractor.name),
      ["Labeled Table Company"],
    );
  });

  it("falls back to the contractor-card strategy", () => {
    const html = `
    <main>
      <h2>Signatory Contractors</h2>

      <div class="contractor-grid">
        <div class="contractor-card">
          <a href="https://example.com/">
            Example Mechanical
          </a>
        </div>

        <div class="contractor-card">
          <span>
            Second Mechanical
          </span>
        </div>
      </div>
    </main>
  `;

    const result = extractContractors(html, CONTEXT);

    assert.equal(result.strategy, "card_grid");

    assert.deepEqual(
      result.contractors.map((contractor) => contractor.name),
      ["Example Mechanical", "Second Mechanical"],
    );
  });

  it("prefers the section-list strategy over contractor cards", () => {
    const html = `
    <main>
      <h2>Signatory Contractors</h2>

      <ul class="contractor-cards">
        <li class="contractor-card">
          <a href="https://example.com/">
            Example Mechanical
          </a>
        </li>

        <li class="contractor-card">
          Second Mechanical
        </li>
      </ul>
    </main>
  `;

    const result = extractContractors(html, CONTEXT);

    assert.equal(result.strategy, "section_list");
  });
});
