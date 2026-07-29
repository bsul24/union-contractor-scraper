import type { UnionLocal } from "../types/union.js";

export interface UnionBatchSelection {
  locals: UnionLocal[];
  startPosition: number | null;
  endPosition: number | null;
  outputPath: string;
}

const DEFAULT_OUTPUT_PATH = "data/output/union-contractor-results.xlsx";

function parsePosition(value: string, label: string): number {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(
      `The ${label} must be a positive integer. Received: ${value}`,
    );
  }

  return parsedValue;
}

function formatPosition(position: number): string {
  return String(position).padStart(3, "0");
}

function createRangeOutputPath(
  startPosition: number,
  endPosition: number,
): string {
  return (
    "data/output/" +
    "union-contractor-results-" +
    `${formatPosition(startPosition)}-` +
    `${formatPosition(endPosition)}.xlsx`
  );
}

function validateAvailablePosition(position: number, localCount: number): void {
  if (position > localCount) {
    throw new Error(
      `Position ${position} was requested, but the workbook contains only ${localCount} valid locals.`,
    );
  }
}

export function selectUnionBatch(
  locals: UnionLocal[],
  firstValue?: string,
  secondValue?: string,
): UnionBatchSelection {
  if (locals.length === 0) {
    return {
      locals: [],
      startPosition: null,
      endPosition: null,
      outputPath: DEFAULT_OUTPUT_PATH,
    };
  }

  if (firstValue === undefined && secondValue === undefined) {
    return {
      locals: [...locals],
      startPosition: 1,
      endPosition: locals.length,
      outputPath: DEFAULT_OUTPUT_PATH,
    };
  }

  if (firstValue === undefined) {
    throw new Error(
      "A starting position is required when an ending position is supplied.",
    );
  }

  const firstPosition = parsePosition(firstValue, "batch position");

  if (secondValue === undefined) {
    validateAvailablePosition(firstPosition, locals.length);

    return {
      locals: locals.slice(0, firstPosition),
      startPosition: 1,
      endPosition: firstPosition,
      outputPath: createRangeOutputPath(1, firstPosition),
    };
  }

  const secondPosition = parsePosition(secondValue, "ending position");

  if (firstPosition > secondPosition) {
    throw new Error(
      `The starting position ${firstPosition} cannot be greater than the ending position ${secondPosition}.`,
    );
  }

  validateAvailablePosition(firstPosition, locals.length);

  validateAvailablePosition(secondPosition, locals.length);

  return {
    locals: locals.slice(firstPosition - 1, secondPosition),
    startPosition: firstPosition,
    endPosition: secondPosition,
    outputPath: createRangeOutputPath(firstPosition, secondPosition),
  };
}
