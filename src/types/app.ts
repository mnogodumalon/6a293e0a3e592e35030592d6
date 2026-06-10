// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Wartungsplan {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    maschine?: string; // applookup -> URL zu 'Maschinen' Record
    wartungsart?: LookupValue;
    wartungsintervall?: LookupValue;
    letzte_wartung?: string; // Format: YYYY-MM-DD oder ISO String
    naechste_wartung?: string; // Format: YYYY-MM-DD oder ISO String
    status?: LookupValue;
    verantwortlich_vorname?: string;
    verantwortlich_nachname?: string;
    durchgefuehrt_vorname?: string;
    durchgefuehrt_nachname?: string;
    bemerkungen?: string;
  };
}

export interface Maschinen {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    maschinentyp?: LookupValue;
    seriennummer?: string;
    hersteller?: string;
    baujahr?: number;
    standort_gebaeude?: string;
    standort_bereich?: string;
    beschreibung?: string;
    maschinenname?: string;
  };
}

export const APP_IDS = {
  WARTUNGSPLAN: '6a293dfb99d8252c0ae62355',
  MASCHINEN: '6a293df9754668c0c39068b0',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'wartungsplan': {
    wartungsart: [{ key: "reparatur", label: "Reparatur" }, { key: "austausch", label: "Austausch" }, { key: "inspektion", label: "Inspektion" }, { key: "schmierung", label: "Schmierung" }, { key: "reinigung", label: "Reinigung" }, { key: "kalibrierung", label: "Kalibrierung" }, { key: "sonstiges", label: "Sonstiges" }],
    wartungsintervall: [{ key: "woechentlich", label: "Wöchentlich" }, { key: "monatlich", label: "Monatlich" }, { key: "vierteljaehrlich", label: "Vierteljährlich" }, { key: "halbjaehrlich", label: "Halbjährlich" }, { key: "jaehrlich", label: "Jährlich" }, { key: "nach_bedarf", label: "Nach Bedarf" }],
    status: [{ key: "ausstehend", label: "Ausstehend" }, { key: "in_bearbeitung", label: "In Bearbeitung" }, { key: "abgeschlossen", label: "Abgeschlossen" }, { key: "ueberfaellig", label: "Überfällig" }],
  },
  'maschinen': {
    maschinentyp: [{ key: "drehmaschine", label: "Drehmaschine" }, { key: "fraesmaschine", label: "Fräsmaschine" }, { key: "schweissgeraet", label: "Schweißgerät" }, { key: "kompressor", label: "Kompressor" }, { key: "foerderband", label: "Förderband" }, { key: "pumpe", label: "Pumpe" }, { key: "generator", label: "Generator" }, { key: "presse", label: "Presse" }, { key: "sonstiges", label: "Sonstiges" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'wartungsplan': {
    'maschine': 'applookup/select',
    'wartungsart': 'lookup/select',
    'wartungsintervall': 'lookup/select',
    'letzte_wartung': 'date/date',
    'naechste_wartung': 'date/date',
    'status': 'lookup/select',
    'verantwortlich_vorname': 'string/text',
    'verantwortlich_nachname': 'string/text',
    'durchgefuehrt_vorname': 'string/text',
    'durchgefuehrt_nachname': 'string/text',
    'bemerkungen': 'string/textarea',
  },
  'maschinen': {
    'maschinentyp': 'lookup/select',
    'seriennummer': 'string/text',
    'hersteller': 'string/text',
    'baujahr': 'number',
    'standort_gebaeude': 'string/text',
    'standort_bereich': 'string/text',
    'beschreibung': 'string/textarea',
    'maschinenname': 'string/text',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateWartungsplan = StripLookup<Wartungsplan['fields']>;
export type CreateMaschinen = StripLookup<Maschinen['fields']>;