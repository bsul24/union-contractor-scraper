import { extractContractorsFromLabeledTable } from "./extractContractorsFromLabeledTable.js";
import { extractContractorsFromTable } from "./extractContractorsFromTable.js";

import type {
  ContractorExtractionContext,
  ContractorRecord,
} from "../types/contractor.js";

export type ContractorExtractionStrategy =
  | "header_table"
  | "labeled_table"
  | "none";

export interface ContractorExtractionResult {
  strategy: ContractorExtractionStrategy;
  contractors: ContractorRecord[];
}

export function extractContractors(
  html: string,
  context: ContractorExtractionContext,
): ContractorExtractionResult {
  const tableContractors = extractContractorsFromTable(html, context);

  if (tableContractors.length > 0) {
    return {
      strategy: "header_table",
      contractors: tableContractors,
    };
  }

  const labeledTableContractors = extractContractorsFromLabeledTable(
    html,
    context,
  );

  if (labeledTableContractors.length > 0) {
    return {
      strategy: "labeled_table",
      contractors: labeledTableContractors,
    };
  }

  return {
    strategy: "none",
    contractors: [],
  };
}
