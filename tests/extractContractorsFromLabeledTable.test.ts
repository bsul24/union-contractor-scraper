import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractContractorsFromLabeledTable } from "../src/extractors/extractContractorsFromLabeledTable.js";

const CONTEXT = {
  localNumber: "447",
  localName: "SACRAMENTO CA",
  sourceUrl: "https://ualocal.example.org/contractors/",
};

describe("extractContractorsFromLabeledTable", () => {
  it("extracts repeated contractor blocks from labeled table rows", () => {
    const html = `
      <table>
        <tr>
          <td colspan="2">
            <strong>Example Mechanical</strong>
          </td>
        </tr>
        <tr>
          <td>Contact:</td>
          <td>Jordan Smith</td>
        </tr>
        <tr>
          <td>E-Mail:</td>
          <td>jordan@example.com</td>
        </tr>
        <tr>
          <td>Address:</td>
          <td>123 Main Street</td>
        </tr>
        <tr>
          <td></td>
          <td>Sacramento, CA 95814</td>
        </tr>
        <tr>
          <td>Phone:</td>
          <td>916-555-1234</td>
        </tr>
        <tr>
          <td>Website:</td>
          <td>
            <a href="https://examplemechanical.com/">
              examplemechanical.com
            </a>
          </td>
        </tr>
        <tr>
          <td colspan="2"><hr /></td>
        </tr>

        <tr>
          <td colspan="2">
            <strong>Desert Air Systems</strong>
          </td>
        </tr>
        <tr>
          <td>Phone:</td>
          <td>602-555-0100</td>
        </tr>
      </table>
    `;

    const contractors = extractContractorsFromLabeledTable(html, CONTEXT);

    assert.deepEqual(contractors, [
      {
        name: "Example Mechanical",
        contactName: "Jordan Smith",
        email: "jordan@example.com",
        phone: "916-555-1234",
        website: "https://examplemechanical.com/",
        address: "123 Main Street",
        cityStateZip: "Sacramento, CA 95814",
        category: null,
        sourceLocalNumber: "447",
        sourceLocalName: "SACRAMENTO CA",
        sourceUrl: "https://ualocal.example.org/contractors/",
      },
      {
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
      },
    ]);
  });

  it("recognizes alternate contact and service fields", () => {
    const html = `
      <table>
        <tr>
          <td colspan="2">
            <strong>Controls Incorporated</strong>
          </td>
        </tr>
        <tr>
          <td>Contact:</td>
          <td>Alex Rivera</td>
        </tr>
        <tr>
          <td>Alt. Contact:</td>
          <td>Sam Lee</td>
        </tr>
        <tr>
          <td>Alt. E-Mail:</td>
          <td>sam@example.com</td>
        </tr>
        <tr>
          <td>Services:</td>
          <td>Building Controls</td>
        </tr>
      </table>
    `;

    const contractors = extractContractorsFromLabeledTable(html, CONTEXT);

    assert.equal(contractors.length, 1);

    assert.deepEqual(contractors[0], {
      name: "Controls Incorporated",
      contactName: "Alex Rivera",
      email: "sam@example.com",
      phone: null,
      website: null,
      address: null,
      cityStateZip: null,
      category: "Building Controls",
      sourceLocalNumber: "447",
      sourceLocalName: "SACRAMENTO CA",
      sourceUrl: "https://ualocal.example.org/contractors/",
    });
  });

  it("ignores unrelated layout tables", () => {
    const html = `
      <table>
        <tr>
          <td>447 Union Office</td>
        </tr>
        <tr>
          <td>Training Center</td>
        </tr>
      </table>
    `;

    const contractors = extractContractorsFromLabeledTable(html, CONTEXT);

    assert.deepEqual(contractors, []);
  });

  it("returns an empty array when there are no tables", () => {
    const contractors = extractContractorsFromLabeledTable(
      "<main><h1>Contractors</h1></main>",
      CONTEXT,
    );

    assert.deepEqual(contractors, []);
  });

  it("recognizes a plain standalone contractor-name row", () => {
    const html = `
    <table>
      <tr>
        <td colspan="2">ABM Building Solutions, LLC</td>
      </tr>
      <tr>
        <td>Contact:</td>
        <td>Richard Cook</td>
      </tr>
      <tr>
        <td>E-Mail:</td>
        <td>rick.cook@abm.com</td>
      </tr>
      <tr>
        <td>Address:</td>
        <td>3640 Northgate Blvd, Suite 110</td>
      </tr>
      <tr>
        <td></td>
        <td>Sacramento, 95834</td>
      </tr>
      <tr>
        <td>Phone:</td>
        <td>(916) 381-4526</td>
      </tr>
      <tr>
        <td>Website:</td>
        <td>
          <a href="http://www.abm.com">
            www.abm.com
          </a>
        </td>
      </tr>
      <tr>
        <td>Associations:</td>
        <td>APMC &amp; National</td>
      </tr>
      <tr>
        <td colspan="2"><hr /></td>
      </tr>
    </table>
  `;

    const contractors = extractContractorsFromLabeledTable(html, CONTEXT);

    assert.deepEqual(contractors, [
      {
        name: "ABM Building Solutions, LLC",
        contactName: "Richard Cook",
        email: "rick.cook@abm.com",
        phone: "(916) 381-4526",
        website: "http://www.abm.com/",
        address: "3640 Northgate Blvd, Suite 110",
        cityStateZip: "Sacramento, 95834",
        category: null,
        sourceLocalNumber: "447",
        sourceLocalName: "SACRAMENTO CA",
        sourceUrl: "https://ualocal.example.org/contractors/",
      },
    ]);
  });

  it("separates multiline addresses stored in one cell", () => {
    const html = `
    <table>
      <tr>
        <td colspan="2">ABM Building Solutions, LLC</td>
      </tr>
      <tr>
        <td>Address:</td>
        <td>
          3640 Northgate Blvd, Suite 110
          <br />
          Sacramento, 95834
        </td>
      </tr>
      <tr>
        <td>Phone:</td>
        <td>(916) 381-4526</td>
      </tr>
    </table>
  `;

    const contractors = extractContractorsFromLabeledTable(html, CONTEXT);

    assert.equal(contractors.length, 1);

    assert.equal(contractors[0]?.address, "3640 Northgate Blvd, Suite 110");

    assert.equal(contractors[0]?.cityStateZip, "Sacramento, 95834");
  });
});
