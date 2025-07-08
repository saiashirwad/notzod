import type { Schema } from "../core/schema.js"
import { ArraySchema } from "../schemas/array.js"
import { BooleanSchema } from "../schemas/boolean.js"
import { LiteralSchema } from "../schemas/literal.js"
import { NumberSchema } from "../schemas/number.js"
import { ObjectSchema } from "../schemas/object.js"
import { StringSchema } from "../schemas/string.js"
import { UnionSchema } from "../schemas/union.js"

export function string(options?: {
	minLength?: number
	maxLength?: number
	pattern?: RegExp
}): StringSchema {
	return new StringSchema(options)
}

export function number(options?: {
	min?: number
	max?: number
	isPositive?: boolean
	isNegative?: boolean
}): NumberSchema {
	return new NumberSchema(options)
}

export function boolean(options?: {
	strictTrue?: boolean
	strictFalse?: boolean
}): BooleanSchema {
	return new BooleanSchema(options)
}

export function array<T>(
	schema: Schema<T>,
	options?: {
		minLength?: number
		maxLength?: number
	},
): ArraySchema<T> {
	return new ArraySchema(schema, options)
}

export function object<T extends Record<string, unknown>>(
	shape: { [K in keyof T]: Schema<T[K]> },
): ObjectSchema<T> {
	return new ObjectSchema<T>(shape)
}

export function literal<T extends string | number | boolean>(
	value: T,
): LiteralSchema<T> {
	return new LiteralSchema<T>(value)
}

export function union<T>(schemas: Schema<any>[]): UnionSchema<T> {
	return new UnionSchema<T>(schemas)
}
