/**
 * Pure serialization functions inspired by keyv
 * Handles type preservation across storage boundaries
 */

/**
 * Enhanced serialization from keyv analysis
 * Handles Buffer conversion, type preservation, simpler and more reliable
 */
export const defaultSerialize = (value: unknown): string => {
  if (value === undefined || value === null) return "null";
  if (typeof value === "string") {
    return JSON.stringify(value.startsWith(":") ? `:${value}` : value);
  }
  if (Buffer.isBuffer(value)) {
    return JSON.stringify(`:base64:${value.toString("base64")}`);
  }
  return JSON.stringify(value);
};

/**
 * Enhanced deserialization from keyv analysis
 * Restores JavaScript types from serialized strings
 */
export const defaultDeserialize = <T>(data: string): T => 
  JSON.parse(data, (_, value) => {
    if (typeof value === "string") {
      if (value.startsWith(":base64:")) {
        return Buffer.from(value.slice(8), "base64");
      }
      return value.startsWith(":") ? value.slice(1) : value;
    }
    return value;
  });

/**
 * Serialization adapter interface
 */
export interface SerializationAdapter {
  serialize: (value: unknown) => string;
  deserialize: <T>(data: string) => T;
}

/**
 * Create a serialization adapter with custom functions
 */
export const createSerializationAdapter = (
  serialize: (value: unknown) => string = defaultSerialize,
  deserialize: <T>(data: string) => T = defaultDeserialize
): SerializationAdapter => ({
  serialize,
  deserialize,
});

/**
 * JSON-only serialization (faster, but no type preservation)
 */
export const jsonSerializer: SerializationAdapter = {
  serialize: (value: unknown) => JSON.stringify(value),
  deserialize: <T>(data: string): T => JSON.parse(data),
};

/**
 * Identity serialization (no serialization - for already serialized data)
 */
export const identitySerializer: SerializationAdapter = {
  serialize: (value: unknown) => String(value),
  deserialize: <T>(data: string): T => data as T,
};
