export interface UnionLocal {
  sourceRow: number;
  listedRegion: string | null;
  localNumber: string;
  seedUrl: string | null;
  localName: string;
  address: string | null;
  cityStateZip: string | null;
  phone: string | null;
  officialWebsite: string | null;
  contractorPage: string | null;
  reviewStatus: string | null;
  notes: string | null;
  uaSource: string | null;
}

export type ImportIssueCode = "MISSING_LOCAL_IDENTITY";

export interface ImportIssue {
  sourceRow: number;
  code: ImportIssueCode;
  message: string;
  rawWebsite: string | null;
}

export interface UnionWorkbookImport {
  sheetName: string;
  locals: UnionLocal[];
  issues: ImportIssue[];
}
