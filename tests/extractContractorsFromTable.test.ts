import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractContractorsFromTable } from "../src/extractors/extractContractorsFromTable.js";

const CONTEXT = {
  localNumber: "447",
  localName: "SACRAMENTO CA",
  sourceUrl: "https://ualocal.example.org/contractors/",
};

describe("extractContractorsFromTable", () => {
  it("extracts a contractor from a table with recognized headers", () => {
    const html = `
      <table>
        <thead>
          <tr>
            <th>Contractor Name</th>
            <th>Contact</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Website</th>
            <th>Address</th>
            <th>City / State / ZIP</th>
            <th>Category</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>Example Mechanical</td>
            <td>Jordan Smith</td>
            <td>
              <a href="mailto:jordan@example.com">
                jordan@example.com
              </a>
            </td>
            <td>
              <a href="tel:+19165551234">
                916-555-1234
              </a>
            </td>
            <td>
              <a href="https://examplemechanical.com/">
                examplemechanical.com
              </a>
            </td>
            <td>123 Main Street</td>
            <td>Sacramento, CA 95814</td>
            <td>Commercial Plumbing</td>
          </tr>
        </tbody>
      </table>
    `;

    const contractors = extractContractorsFromTable(html, CONTEXT);

    assert.deepEqual(contractors, [
      {
        name: "Example Mechanical",
        contactName: "Jordan Smith",
        email: "jordan@example.com",
        phone: "916-555-1234",
        website: "https://examplemechanical.com/",
        address: "123 Main Street",
        cityStateZip: "Sacramento, CA 95814",
        category: "Commercial Plumbing",
        sourceLocalNumber: "447",
        sourceLocalName: "SACRAMENTO CA",
        sourceUrl: "https://ualocal.example.org/contractors/",
      },
    ]);
  });

  it("normalizes whitespace and converts blank fields to null", () => {
    const html = `
      <table>
        <tr>
          <th>Contractor</th>
          <th>Contact Person</th>
          <th>Email Address</th>
          <th>Telephone</th>
        </tr>

        <tr>
          <td>
            Desert
            Air Systems
          </td>
          <td>   </td>
          <td></td>
          <td> 602-555-0100 </td>
        </tr>
      </table>
    `;

    const contractors = extractContractorsFromTable(html, CONTEXT);

    assert.equal(contractors.length, 1);

    assert.deepEqual(contractors[0], {
      name: "Desert Air Systems",
      contactName: null,
      email: null,
      phone: "602-555-0100",
      website: null,
      address: null,
      cityStateZip: null,
      category: null,
      sourceLocalNumber: "447",
      sourceLocalName: "SACRAMENTO CA",
      sourceUrl: "https://ualocal.example.org/contractors/",
    });
  });

  it("extracts contractors from multiple matching tables", () => {
    const html = `
      <table>
        <tr>
          <th>Contractor</th>
          <th>Category</th>
        </tr>
        <tr>
          <td>Alpha Plumbing</td>
          <td>Plumbing</td>
        </tr>
      </table>

      <table>
        <tr>
          <th>Company</th>
          <th>Category</th>
        </tr>
        <tr>
          <td>Beta HVAC</td>
          <td>HVAC</td>
        </tr>
      </table>
    `;

    const contractors = extractContractorsFromTable(html, CONTEXT);

    assert.deepEqual(
      contractors.map((contractor) => contractor.name),
      ["Alpha Plumbing", "Beta HVAC"],
    );
  });

  it("ignores tables without a recognizable contractor-name column", () => {
    const html = `
      <table>
        <tr>
          <th>Date</th>
          <th>Meeting</th>
        </tr>
        <tr>
          <td>August 1</td>
          <td>Membership Meeting</td>
        </tr>
      </table>
    `;

    const contractors = extractContractorsFromTable(html, CONTEXT);

    assert.deepEqual(contractors, []);
  });

  it("ignores blank rows and rows without a contractor name", () => {
    const html = `
      <table>
        <tr>
          <th>Contractor</th>
          <th>Phone</th>
        </tr>

        <tr>
          <td></td>
          <td></td>
        </tr>

        <tr>
          <td></td>
          <td>916-555-9999</td>
        </tr>

        <tr>
          <td>Gamma Mechanical</td>
          <td>916-555-1111</td>
        </tr>
      </table>
    `;

    const contractors = extractContractorsFromTable(html, CONTEXT);

    assert.equal(contractors.length, 1);
    assert.equal(contractors[0]?.name, "Gamma Mechanical");
  });

  it("returns an empty array when the page contains no tables", () => {
    const html = `
      <main>
        <h1>Contractors</h1>
        <p>No contractor table is available.</p>
      </main>
    `;

    const contractors = extractContractorsFromTable(html, CONTEXT);

    assert.deepEqual(contractors, []);
  });
});
