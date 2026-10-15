/** Convert Mongoose documents / Decimals into plain, client-safe JSON. */

export function serialize<T = unknown>(value: unknown): T {
  return JSON.parse(
    JSON.stringify(value, (_key, val) => {
      if (val && typeof val === "object" && typeof val.toHexString === "function") {
        return val.toHexString();
      }
      if (val && typeof val === "object" && "_bsontype" in val) {
        return String(val);
      }
      return val;
    }),
  ) as T;
}

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function toIdString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "toHexString" in value) {
    return (value as { toHexString: () => string }).toHexString();
  }
  return String(value);
}
