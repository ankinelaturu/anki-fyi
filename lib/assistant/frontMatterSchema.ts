/**
 * Load and type the corpus-derived front matter schema artifact.
 */

import schemaJson from "@/lib/assistant/generated/frontMatterSchema.json";

export type FrontMatterFieldType = "string" | "number" | "boolean" | "string[]" | "string|number";

export type FrontMatterFieldDef = {
  name: string;
  yamlKey: string;
  type: FrontMatterFieldType;
  optional: boolean;
  count: number;
  examples: (string | number | boolean)[];
};

export type FrontMatterSchema = {
  version: number;
  generatedAt: string;
  fileCount: number;
  fields: FrontMatterFieldDef[];
  enums: Record<string, string[]>;
};

export const frontMatterSchema = schemaJson as FrontMatterSchema;

const fieldNames = new Set(frontMatterSchema.fields.map((field) => field.name));

/**
 * Returns true when the field name is defined in the derived schema.
 */
export function isKnownFrontMatterField(field: string): boolean {
  return fieldNames.has(field);
}

/**
 * Lookup a field definition by camelCase name.
 */
export function getFrontMatterField(field: string): FrontMatterFieldDef | undefined {
  return frontMatterSchema.fields.find((entry) => entry.name === field);
}
