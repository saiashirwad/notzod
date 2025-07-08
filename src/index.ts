// Core exports
export { Schema, ValidationErrorImpl } from "./core/schema.js"
export type {
	ValidationResult,
	ValidationError,
	ValidationSuccess,
	Infer,
} from "./types/index.js"

// Schema class exports
export { StringSchema } from "./schemas/string.js"
export { NumberSchema } from "./schemas/number.js"
export { BooleanSchema } from "./schemas/boolean.js"
export { ArraySchema } from "./schemas/array.js"
export { ObjectSchema } from "./schemas/object.js"
export { LiteralSchema } from "./schemas/literal.js"
export { UnionSchema } from "./schemas/union.js"

// Factory function exports
export {
	string,
	number,
	boolean,
	array,
	object,
	literal,
	union,
} from "./factories/index.js"
