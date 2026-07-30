import { extractContractorsFromLabeledTable } from "./extractContractorsFromLabeledTable.js";
import { extractContractorsFromList } from "./extractContractorsFromList.js";
import { extractContractorsFromTable } from "./extractContractorsFromTable.js";
import { extractContractorsFromCards } from "./extractContractorsFromCards.js";

import type {
  ContractorExtractionContext,
  ContractorRecord,
} from "../types/contractor.js";

export type ContractorExtractionStrategy =
  | "header_table"
  | "labeled_table"
  | "section_list"
  | "card_grid"
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

  const listContractors = extractContractorsFromList(html, context);

  if (listContractors.length > 0) {
    return {
      strategy: "section_list",
      contractors: listContractors,
    };
  }

  const cardContractors = extractContractorsFromCards(html, context);

  if (cardContractors.length > 0) {
    return {
      strategy: "card_grid",
      contractors: cardContractors,
    };
  }

  return {
    strategy: "none",
    contractors: [],
  };
}
