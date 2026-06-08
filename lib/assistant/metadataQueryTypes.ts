/**
 * Structured metadata query types produced by the planner LLM.
 */

export type MetadataFilterOp =
  | "eq"
  | "neq"
  | "in"
  | "contains"
  | "containsAll"
  | "containsAny"
  | "gte"
  | "lte"
  | "exists";

export type MetadataFilterValue = string | number | boolean | string[];

export type MetadataFilter = {
  field: string;
  op: MetadataFilterOp;
  value?: MetadataFilterValue;
};

export type MetadataSort = {
  field: string;
  direction: "asc" | "desc";
};

/**
 * Parsed intent for a metadata-driven list query.
 *
 * `action: "none"` means the question should fall through to vector search.
 */
export type MetadataQuery = {
  action: "list" | "none";
  filters?: MetadataFilter[];
  sort?: MetadataSort[];
};

export const METADATA_FILTER_OPS: MetadataFilterOp[] = [
  "eq",
  "neq",
  "in",
  "contains",
  "containsAll",
  "containsAny",
  "gte",
  "lte",
  "exists",
];
