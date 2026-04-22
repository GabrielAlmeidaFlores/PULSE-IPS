type JsonPrimitive = string | number | boolean | null
type JsonArray = JsonValue[]
interface JsonObject {
  [key: string]: JsonValue
}

export type JsonValue = JsonPrimitive | JsonObject | JsonArray
