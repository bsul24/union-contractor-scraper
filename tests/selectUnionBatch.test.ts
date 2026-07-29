import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { selectUnionBatch } from "../src/crawl/selectUnionBatch.js";

import type { UnionLocal } from "../src/types/union.js";

function createLocal(localNumber: string, sourceRow: number): UnionLocal {
  return {
    sourceRow,
    listedRegion: "AZ",
    localNumber,
    seedUrl: `https://local${localNumber}.example.org/`,
    localName: `LOCAL ${localNumber}`,
    address: null,
    cityStateZip: null,
    phone: null,
    officialWebsite: null,
    contractorPage: null,
    reviewStatus: null,
    notes: null,
    uaSource: null,
  };
}

const LOCALS = [
  createLocal("1", 2),
  createLocal("2", 3),
  createLocal("3", 4),
  createLocal("4", 5),
  createLocal("5", 6),
];

describe("selectUnionBatch", () => {
  it("selects every local when no arguments are supplied", () => {
    const selection = selectUnionBatch(LOCALS);

    assert.deepEqual(
      selection.locals.map((local) => local.localNumber),
      ["1", "2", "3", "4", "5"],
    );

    assert.equal(selection.startPosition, 1);
    assert.equal(selection.endPosition, 5);

    assert.equal(
      selection.outputPath,
      "data/output/union-contractor-results.xlsx",
    );
  });

  it("preserves the existing first-N limit behavior", () => {
    const selection = selectUnionBatch(LOCALS, "2");

    assert.deepEqual(
      selection.locals.map((local) => local.localNumber),
      ["1", "2"],
    );

    assert.equal(selection.startPosition, 1);
    assert.equal(selection.endPosition, 2);

    assert.equal(
      selection.outputPath,
      "data/output/union-contractor-results-001-002.xlsx",
    );
  });

  it("selects an inclusive one-based range", () => {
    const selection = selectUnionBatch(LOCALS, "2", "4");

    assert.deepEqual(
      selection.locals.map((local) => local.localNumber),
      ["2", "3", "4"],
    );

    assert.equal(selection.startPosition, 2);
    assert.equal(selection.endPosition, 4);

    assert.equal(
      selection.outputPath,
      "data/output/union-contractor-results-002-004.xlsx",
    );
  });

  it("allows selecting one local with an explicit range", () => {
    const selection = selectUnionBatch(LOCALS, "3", "3");

    assert.deepEqual(
      selection.locals.map((local) => local.localNumber),
      ["3"],
    );

    assert.equal(
      selection.outputPath,
      "data/output/union-contractor-results-003-003.xlsx",
    );
  });

  it("rejects non-positive and non-integer positions", () => {
    assert.throws(() => selectUnionBatch(LOCALS, "0"), /positive integer/);

    assert.throws(() => selectUnionBatch(LOCALS, "-1"), /positive integer/);

    assert.throws(() => selectUnionBatch(LOCALS, "2.5"), /positive integer/);

    assert.throws(() => selectUnionBatch(LOCALS, "abc"), /positive integer/);
  });

  it("rejects a range whose start is after its end", () => {
    assert.throws(
      () => selectUnionBatch(LOCALS, "4", "2"),
      /cannot be greater/,
    );
  });

  it("rejects a position beyond the available locals", () => {
    assert.throws(() => selectUnionBatch(LOCALS, "6"), /only 5 valid locals/);

    assert.throws(
      () => selectUnionBatch(LOCALS, "2", "6"),
      /only 5 valid locals/,
    );
  });

  it("handles an empty imported-local list", () => {
    const selection = selectUnionBatch([]);

    assert.deepEqual(selection, {
      locals: [],
      startPosition: null,
      endPosition: null,
      outputPath: "data/output/union-contractor-results.xlsx",
    });
  });
});
