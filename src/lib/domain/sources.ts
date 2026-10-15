import { AGMARKNET_SOURCE_KEY, DEMO_SOURCE_KEY } from "@/lib/domain/constants";

export interface SourceDefinition {
  key: string;
  name: string;
  shortLabel: string;
  type: "api" | "csv" | "json" | "manual";
  url?: string;
  license?: string;
  licenseUrl?: string;
  attribution: string;
  updateFrequency?: string;
  requiresApiKey: boolean;
  apiKeyEnvVar?: string;
  enabled: boolean;
}

/**
 * Declared data sources. Only sources with a verified, permitted access method
 * are listed. AGMARKNET is redistributed via the Open Government Data Platform
 * under the Government Open Data License - India (attribution required).
 */
export const SOURCE_DEFINITIONS: SourceDefinition[] = [
  {
    key: AGMARKNET_SOURCE_KEY,
    name: "AGMARKNET — Daily Mandi Prices (via data.gov.in)",
    shortLabel: "AGMARKNET",
    type: "api",
    url: "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070",
    license: "Government Open Data License - India",
    licenseUrl: "https://data.gov.in/government-open-data-license-india",
    attribution: "Source: AGMARKNET, Directorate of Marketing & Inspection, via data.gov.in",
    updateFrequency: "Daily",
    requiresApiKey: true,
    apiKeyEnvVar: "AGRICULTURAL_DATA_API_KEY",
    enabled: true,
  },
  {
    key: DEMO_SOURCE_KEY,
    name: "MandiLens demonstration dataset",
    shortLabel: "Demo data",
    type: "manual",
    license: "MIT (project data)",
    attribution: "Illustrative data created for the MandiLens demo. Not real market prices.",
    updateFrequency: "Static",
    requiresApiKey: false,
    enabled: true,
  },
  {
    key: "user_input",
    name: "Prices entered by users",
    shortLabel: "User input",
    type: "manual",
    attribution: "Entered by a MandiLens user; not verified by an official source.",
    requiresApiKey: false,
    enabled: true,
  },
  {
    key: "admin_csv",
    name: "CSV / JSON administrative import",
    shortLabel: "CSV import",
    type: "csv",
    attribution: "Imported by an administrator. Original source noted in the import record.",
    requiresApiKey: false,
    enabled: true,
  },
];

export function getSourceDefinition(key: string): SourceDefinition | undefined {
  return SOURCE_DEFINITIONS.find((source) => source.key === key);
}

export function sourceLabel(key: string): string {
  return getSourceDefinition(key)?.shortLabel ?? key;
}
