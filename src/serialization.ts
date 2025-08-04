/**
 * Pure serialization functions inspired by keyv
 * Handles type preservation across storage boundaries
 */

/**
 * Default serialization function
 * Preserves JavaScript types and handles special cases like buffers
 */
export const defaultSerialize = (value: unknown): string => {
  if (value === undefined || value === null) {
    return "null";
  }
  
  if (typeof value === "string") {
    // Escape strings that start with : to avoid conflicts with special markers
    return JSON.stringify(value.startsWith(":") ? `:${value}` : value);
  }
  
  if (Buffer.isBuffer(value)) {
    // Convert buffers to base64 with special marker
    return JSON.stringify(`:base64:${value.toString("base64")}`);
  }
  
  // Handle objects with toJSON method (like Date)
  let processedValue = value;
  if (processedValue && typeof processedValue === "object" && "toJSON" in processedValue && typeof processedValue.toJSON === "function") {
    processedValue = processedValue.toJSON();
  }
  
  if (typeof processedValue === "object") {
    let result = "";
    const isArray = Array.isArray(processedValue);
    result = isArray ? "[" : "{";
    
    let first = true;
    for (const key in processedValue) {
      const val = (processedValue as Record<string, unknown>)[key];
      const ignore = typeof val === "function" || (!isArray && val === undefined);
      
      if (!Object.prototype.hasOwnProperty.call(processedValue, key) || ignore) {
        continue;
      }
      
      if (!first) {
        result += ",";
      }
      first = false;
      
      if (isArray) {
        result += defaultSerialize(val);
      } else if (val !== undefined) {
        result += `${defaultSerialize(key)}:${defaultSerialize(val)}`;
      }
    }
    
    result += isArray ? "]" : "}";
    return result;
  }
  
  return JSON.stringify(processedValue);
};

/**
 * Default deserialization function
 * Restores JavaScript types from serialized strings
 */
export const defaultDeserialize = <T>(data: string): T => {
  return JSON.parse(data, (_, value) => {
    if (typeof value === "string") {
      if (value.startsWith(":base64:")) {
        // Restore buffer from base64
        return Buffer.from(value.slice(8), "base64");
      }
      // Restore escaped strings
      return value.startsWith(":") ? value.slice(1) : value;
    }
    return value;
  });
};

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
