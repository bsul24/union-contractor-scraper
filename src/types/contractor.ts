export interface ContractorRecord {
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  cityStateZip: string | null;
  category: string | null;
  sourceLocalNumber: string;
  sourceLocalName: string;
  sourceUrl: string;
}

export interface ContractorExtractionContext {
  localNumber: string;
  localName: string;
  sourceUrl: string;
}
