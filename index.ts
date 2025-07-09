/**
 * @module index
 * @description This module provides a powerful and flexible schema validation library.
 * It allows defining schemas for various data types and validating data against them.
 * Features include:
 *  - Type checking for primitive types (string, number, boolean)
 *  - Support for literal values
 *  - Array validation with min/max length and element schema
 *  - Object validation with property schemas
 *  - Union types for validating against multiple schemas
 *  - Optional and nullable fields
 *  - Custom refinement functions for complex validation logic
 *  - Pre-compiled parsers for performance
 *  - Detailed error reporting with `ValidationError`
 */

/**
 * @class ValidationError
 * @extends Error
 * @description Custom error class for schema validation errors.
 * Contains information about the validation failure, including the path to the invalid field,
 * an error message, and the data that failed validation.
 */
export class ValidationError extends Error {
	/**
	 * @constructor
	 * @param {object} options - Options for the validation error.
	 * @param {string} [options.path] - The path to the field that failed validation.
	 * @param {string} options.message - The error message.
	 * @param {unknown} [options.data] - The data that failed validation.
	 */
	constructor(
		public options: {
			path?: string
			message: string
			data?: unknown
		},
	) {
		super(options.message)
	}
}

/**
 * @abstract
 * @class Schema
 * @template T
 * @description Base class for all schema types.
 * Provides common functionality for schema definition and validation.
 */
abstract class Schema<T> {
	protected _required: boolean = true
	protected _nullable: boolean = true
	private _refineFns: ((value: T) => boolean)[] = []
	protected _compiledParse?: (value: unknown) => T

	/**
	 * @abstract
	 * @description Compiles the schema into a parsing function for performance.
	 * This method should be implemented by subclasses.
	 */
	abstract compile(): void

	/**
	 * @constructor
	 * @param {string} type - The type of the schema (e.g., "string", "number").
	 * @param {string} [path] - The path to the field this schema represents.
	 */
	constructor(
		public type: string,
		public path?: string,
	) {}

	/**
	 * @abstract
	 * @description Parses and validates the given value against the schema.
	 * This method should be implemented by subclasses.
	 * @param {unknown} value - The value to parse and validate.
	 * @returns {T | undefined} The parsed value if valid, otherwise throws a ValidationError or returns undefined for optional fields.
	 */
	abstract parse(value: unknown): T | undefined

	/**
	 * @description Creates a ValidationError instance for this schema.
	 * @param {string} message - The error message.
	 * @param {unknown} [data] - The data that caused the error.
	 * @returns {ValidationError} A new ValidationError instance.
	 */
	error(message: string, data?: unknown) {
		return new ValidationError({
			path: this.path,
			message,
			data,
		})
	}

	/**
	 * @description Marks the schema as required.
	 * @returns {this} The current schema instance.
	 */
	required() {
		this._required = true
		return this
	}

	/**
	 * @description Marks the schema as optional.
	 * @returns {Schema<T | undefined>} A new schema instance that allows undefined values.
	 */
	optional(): Schema<T | undefined> {
		this._required = false
		return this as any
	}

	/**
	 * @description Adds a custom refinement function to the schema.
	 * The function should return true if the value is valid, false otherwise.
	 * @param {(value: T) => boolean} refineFn - The refinement function.
	 * @returns {Schema<T>} The current schema instance.
	 */
	refine(refineFn: (value: T) => boolean): Schema<T> {
		this._refineFns.push(refineFn)
		return this
	}

	/**
	 * @description Marks the schema as nullable.
	 * @returns {Schema<T | null>} A new schema instance that allows null values.
	 */
	nullable(): Schema<T | null> {
		this._nullable = true
		return this as any
	}

	/**
	 * @protected
	 * @description Runs the core parsing logic, handling null, undefined, and refinement checks.
	 * @param {unknown} value - The value to parse.
	 * @param {(value: unknown) => T} run - The actual parsing function for the specific schema type.
	 * @returns {T} The parsed and validated value.
	 * @throws {ValidationError} If validation fails.
	 */
	runParser(value: unknown, run: (value: unknown) => T): T {
		if (value === null) {
			if (this._nullable) {
				return null as any
			}
			throw this.error("value cannot be null", value)
		}
		if (value === undefined) {
			if (!this._required) {
				return undefined as any
			}
			throw this.error("value cannot be undefined", value)
		}

		const result = run(value)
		for (const filterFn of this._refineFns) {
			if (!filterFn(result)) {
				throw this.error("value does not pass filter", result)
			}
		}
		return result
	}
}

/**
 * @class UnionSchema
 * @extends Schema
 * @template T - An array of possible types.
 * @description Represents a schema that can validate against one of several provided schemas.
 * The value is valid if it matches any of the schemas in the union.
 */
class UnionSchema<T extends unknown[]> extends Schema<T[number]> {
	/**
	 * @constructor
	 * @param {Schema<T[number]>[]} schemas - An array of schemas to form the union.
	 */
	constructor(public schemas: [...Schema<T[number]>[]]) {
		super("union", "union")
		this.compile()
	}

	/**
	 * @override
	 * @description Compiles all schemas within the union and creates a compiled parser.
	 */
	compile(): void {
		this.schemas.forEach((schema) => schema.compile())

		this._compiledParse = new Function(
			"value",
			`
			for (const schema of this.schemas) {
				try {
					return schema.parse(value);
				} catch (e) {}
			}
			throw this.error("No schema matched", value);
			`,
		) as any
	}

	/**
	 * @override
	 * @description Parses the value against each schema in the union until one matches.
	 * @param {unknown} value - The value to parse.
	 * @returns {T[number]} The parsed value if it matches one of the schemas.
	 * @throws {ValidationError} If the value does not match any of the schemas.
	 */
	parse(value: unknown): T[number] {
		return this.runParser(value, (value) => {
			for (const schema of this.schemas) {
				try {
					return schema.parse(value) as T[number]
				} catch (e) {}
			}
			throw this.error("No schema matched", value)
		})
	}
}

class LiteralSchema<
	T extends string | number | boolean | null,
> extends Schema<T> {
	/**
	 * @constructor
	 * @param {T} value - The literal value to match.
	 * @param {string} [path] - The path to the field this schema represents.
	 */
	constructor(
		public value: T,
		path?: string,
	) {
		super("literal", path)
		this.compile()
	}

	/**
	 * @override
	 * @description Compiles the literal schema into a parsing function.
	 */
	compile(): void {
		this._compiledParse = new Function(
			"value",
			`
			if (value !== ${JSON.stringify(this.value)}) {
				throw this.error("Value does not match literal", value);
			}
			return value;
			`,
		) as any
	}

	/**
	 * @override
	 * @description Parses the value, checking if it strictly matches the literal value.
	 * @param {unknown} value - The value to parse.
	 * @returns {T} The literal value if it matches.
	 * @throws {ValidationError} If the value does not match the literal.
	 */
	parse(value: unknown): T {
		return this.runParser(value, (value) => {
			if (value !== this.value)
				throw this.error("Value does not match literal", value)
			return value as T
		})
	}
}

type StringSchemaOptions = {
	path?: string
	min?: number
	max?: number
	pattern?: RegExp
}

/**
 * @class StringSchema
 * @extends Schema<string>
 * @description Represents a schema for string values.
 * Allows specifying minimum/maximum length and a regex pattern.
 */
class StringSchema extends Schema<string> {
	/**
	 * @constructor
	 * @param {StringSchemaOptions} options - Options for the string schema.
	 */
	constructor(public options: StringSchemaOptions) {
		super("string", options.path)
		this.compile()
	}

	/**
	 * @description Sets the minimum length for the string.
	 * @param {number} value - The minimum length.
	 * @returns {StringSchema} A new StringSchema instance with the min constraint.
	 */
	min(value: number) {
		return new StringSchema({ ...this.options, min: value })
	}

	/**
	 * @description Sets the maximum length for the string.
	 * @param {number} value - The maximum length.
	 * @returns {StringSchema} A new StringSchema instance with the max constraint.
	 */
	max(value: number) {
		return new StringSchema({ ...this.options, max: value })
	}

	/**
	 * @description Sets a regex pattern that the string must match.
	 * @param {RegExp} value - The regex pattern.
	 * @returns {StringSchema} A new StringSchema instance with the pattern constraint.
	 */
	pattern(value: RegExp) {
		return new StringSchema({ ...this.options, pattern: value })
	}

	/**
	 * @override
	 * @description Compiles the string schema into a parsing function with length and pattern checks.
	 */
	compile() {
		const checks: string[] = []
		checks.push(
			'if (typeof value !== "string") throw this.error("not a string");',
		)
		if (this.options.min)
			checks.push(
				`if (value.length < ${this.options.min}) throw this.error("too short");`,
			)
		if (this.options.max)
			checks.push(
				`if (value.length > ${this.options.max}) throw this.error("too long");`,
			)
		if (this.options.pattern)
			checks.push(
				`if (!${this.options.pattern}.test(value)) throw error("pattern mismatch");`,
			)

		this._compiledParse = new Function(
			"value",
			`${checks.join("\n")}
        return value;
    `,
		) as any
	}

	parse(value: unknown): string {
		return this._compiledParse!(value)
	}
}

type NumberSchemaOptions = {
	path?: string
	lt?: number
	gt?: number
	positive?: boolean
	negative?: boolean
}

/**
 * @class NumberSchema
 * @extends Schema<number>
 * @description Represents a schema for number values.
 * Allows specifying less than (lt), greater than (gt), positive, and negative constraints.
 */
class NumberSchema extends Schema<number> {
	/**
	 * @constructor
	 * @param {NumberSchemaOptions} options - Options for the number schema.
	 */
	constructor(public options: NumberSchemaOptions) {
		super("number", options.path)
		this.compile()
	}

	/**
	 * @description Sets the upper bound (exclusive) for the number.
	 * @param {number} value - The value the number must be less than.
	 * @returns {NumberSchema} A new NumberSchema instance with the lt constraint.
	 */
	lt(value: number) {
		return new NumberSchema({ ...this.options, lt: value })
	}

	/**
	 * @description Sets the lower bound (exclusive) for the number.
	 * @param {number} value - The value the number must be greater than.
	 * @returns {NumberSchema} A new NumberSchema instance with the gt constraint.
	 */
	gt(value: number) {
		return new NumberSchema({ ...this.options, gt: value })
	}

	/**
	 * @description Requires the number to be positive (> 0).
	 * @returns {NumberSchema} A new NumberSchema instance with the positive constraint.
	 */
	positive() {
		return new NumberSchema({ ...this.options, positive: true })
	}

	/**
	 * @description Requires the number to be negative (< 0).
	 * @returns {NumberSchema} A new NumberSchema instance with the negative constraint.
	 */
	negative() {
		return new NumberSchema({ ...this.options, negative: true })
	}

	/**
	 * @override
	 * @description Compiles the number schema into a parsing function with all specified constraints.
	 */
	compile() {
		const checks: string[] = []
		checks.push(
			'if (typeof value !== "number") throw this.error("is not a number", value);',
		)
		if (this.options.positive)
			checks.push(`if (value <= 0) throw this.error("is not positive", value);`)
		if (this.options.negative)
			checks.push(`if (value >= 0) throw this.error("is not negative", value);`)
		if (this.options.lt)
			checks.push(
				`if (value > ${this.options.lt}) throw this.error("Value is too small", value);`,
			)
		if (this.options.gt)
			checks.push(
				`if (value < ${this.options.gt}) throw this.error("Value is too large", value);`,
			)

		this._compiledParse = new Function(
			"value",
			`${checks.join("\n")}
       return value;`,
		) as any
	}

	parse(value: unknown): number {
		return this._compiledParse!(value)
	}
}

type BooleanSchemaOptions = {
	path?: string
	true?: boolean
	false?: boolean
}

/**
 * @class BooleanSchema
 * @extends Schema<boolean>
 * @description Represents a schema for boolean values.
 * Allows requiring the boolean to be strictly true or strictly false.
 */
class BooleanSchema extends Schema<boolean> {
	/**
	 * @constructor
	 * @param {BooleanSchemaOptions} options - Options for the boolean schema.
	 */
	constructor(public options: BooleanSchemaOptions) {
		super("boolean", options.path)
		this.compile()
	}

	/**
	 * @description Requires the boolean to be true.
	 * @returns {BooleanSchema} A new BooleanSchema instance with the true constraint.
	 */
	true() {
		return new BooleanSchema({ ...this.options, true: true })
	}

	/**
	 * @description Requires the boolean to be false.
	 * @returns {BooleanSchema} A new BooleanSchema instance with the false constraint.
	 */
	false() {
		return new BooleanSchema({ ...this.options, false: true })
	}

	/**
	 * @override
	 * @description Compiles the boolean schema into a parsing function with true/false checks if specified.
	 */
	compile(): void {
		const checks: string[] = []
		checks.push(
			'if (typeof value !== "boolean") throw this.error("is not a boolean", value);',
		)

		if (this.options.true) {
			checks.push('if (value !== true) throw this.error("is not true", value);')
		}
		if (this.options.false) {
			checks.push(
				'if (value !== false) throw this.error("is not false", value);',
			)
		}

		this._compiledParse = new Function(
			"value",
			`
			${checks.join("\n")}
			return value;
			`,
		) as any
	}

	parse(value: unknown): boolean {
		return this.runParser(value, (value) => {
			return this._compiledParse!.call(this, value)
		})
	}
}

type ArraySchemaOptions<T> = {
	path?: string
	min?: number
	max?: number
}

/**
 * @class ArraySchema
 * @extends Schema<T[]>
 * @template T - The type of elements in the array.
 * @description Represents a schema for array values.
 * Validates that the value is an array and that its elements conform to a given schema.
 * Allows specifying minimum and maximum length for the array.
 */
class ArraySchema<T> extends Schema<T[]> {
	/**
	 * @constructor
	 * @param {Schema<T>} schema - The schema for the elements of the array.
	 * @param {ArraySchemaOptions<T>} options - Options for the array schema.
	 */
	constructor(
		public schema: Schema<T>,
		public options: ArraySchemaOptions<T>,
	) {
		super("array", options.path)
		this.compile()
	}

	/**
	 * @override
	 * @description Compiles the array schema and its element schema into a parsing function.
	 * Includes checks for array type, min/max length, and parses each element.
	 */
	compile(): void {
		this.schema.compile()

		const minCheck = this.options.min
			? `if (len < ${this.options.min}) throw this.error("expected a minimum of ${this.options.min} items", value);`
			: ""

		const maxCheck = this.options.max
			? `if (len > ${this.options.max}) throw this.error("expected a maximum of ${this.options.max} items", value);`
			: ""

		this._compiledParse = new Function(
			"value",
			`
			if (!Array.isArray(value)) {
				throw this.error("is not an array", value);
			}
			const len = value.length;
			${minCheck}
			${maxCheck}
			const result = new Array(len);
			for (let i = 0; i < len; i++) {
				result[i] = this.schema.parse(value[i]);
			}
			return result;
			`,
		) as any
	}

	/**
	 * @description Sets the minimum length for the array.
	 * @param {number} value - The minimum length.
	 * @returns {ArraySchema<T>} A new ArraySchema instance with the min constraint.
	 */
	min(value: number) {
		return new ArraySchema(this.schema, { ...this.options, min: value })
	}

	/**
	 * @description Sets the maximum length for the array.
	 * @param {number} value - The maximum length.
	 * @returns {ArraySchema<T>} A new ArraySchema instance with the max constraint.
	 */
	max(value: number) {
		return new ArraySchema(this.schema, { ...this.options, max: value })
	}

	/**
	 * @override
	 * @description Parses the value, ensuring it's an array, meets length constraints, and all elements match the schema.
	 * @param {unknown} value - The value to parse.
	 * @returns {T[]} The parsed array.
	 * @throws {ValidationError} If validation fails.
	 */
	parse(value: unknown): T[] {
		return this.runParser(value, (value) => {
			return this._compiledParse!.call(this, value)
		})
	}
}

class ObjectSchema<T extends Record<string, Schema<any>>> extends Schema<{
	[K in keyof T]: T[K] extends Schema<infer U> ? U : never
}> {
	/**
	 * @constructor
	 * @param {T} properties - An object where keys are property names and values are their corresponding schemas.
	 * @param {string} [path] - The path to the field this schema represents.
	 */
	constructor(
		public properties: T,
		path?: string,
	) {
		super("object", path)
		for (const key in properties) {
			const schema = properties[key]
			if (schema instanceof Schema) {
				schema.path = key
			}
		}
		this.compile()
	}

	/**
	 * @override
	 * @description Compiles the object schema and all its property schemas into a parsing function.
	 * Ensures the value is an object and validates each property against its schema.
	 */
	compile() {
		const validators = Object.entries(this.properties).map(([key, schema]) => {
			schema.compile()
			return `result.${key} = this.properties.${key}.parse(value.${key});`
		})

		this._compiledParse = new Function(
			"value",
			`
			if (typeof value !== "object" || value === null) {
				throw this.error("is not an object", value);
			}
			const result = Object.create(null);
			${validators.join("\n")}
			return result;
			`,
		) as any
	}

	/**
	 * @override
	 * @description Parses the value, ensuring it's an object and all its properties match their respective schemas.
	 * @param {unknown} value - The value to parse.
	 * @returns {{ [K in keyof T]: T[K] extends Schema<infer U> ? U : never }} The parsed object.
	 * @throws {ValidationError} If validation fails.
	 */
	parse(value: unknown): {
		[K in keyof T]: T[K] extends Schema<infer U> ? U : never
	} {
		return this.runParser(value, (value) => {
			return this._compiledParse!.call(this, value)
		})
	}
}

/**
 * @description Factory function to create a new NumberSchema.
 * @param {NumberSchemaOptions} [options={}] - Options for the number schema.
 * @returns {NumberSchema} A new NumberSchema instance.
 */
export function number(options: NumberSchemaOptions = {}) {
	return new NumberSchema(options)
}

/**
 * @description Factory function to create a new StringSchema.
 * @param {StringSchemaOptions} [options={}] - Options for the string schema.
 * @returns {StringSchema} A new StringSchema instance.
 */
export function string(options: StringSchemaOptions = {}) {
	return new StringSchema(options)
}

/**
 * @description Factory function to create a new BooleanSchema.
 * @param {BooleanSchemaOptions} [options={}] - Options for the boolean schema.
 * @returns {BooleanSchema} A new BooleanSchema instance.
 */
export function boolean(options: BooleanSchemaOptions = {}) {
	return new BooleanSchema(options)
}

/**
 * @description Factory function to create a new ArraySchema.
 * @template T - The type of elements in the array.
 * @param {Schema<T>} schema - The schema for the elements of the array.
 * @param {ArraySchemaOptions<T>} [options={}] - Options for the array schema.
 * @returns {ArraySchema<T>} A new ArraySchema instance.
 */
export function array<T>(
	schema: Schema<T>,
	options: ArraySchemaOptions<T> = {},
) {
	return new ArraySchema<T>(schema, options)
}

/**
 * @description Factory function to create a new ObjectSchema.
 * @template T - An object type where keys are property names and values are their corresponding schemas.
 * @param {T} properties - An object defining the schemas for each property.
 * @param {string} [path] - The path to the field this schema represents.
 * @returns {Schema<{ [K in keyof T]: T[K] extends Schema<infer U> ? U : never }>} A new ObjectSchema instance.
 */
export function object<T extends Record<string, Schema<any>>>(
	properties: T,
	path?: string,
): Schema<{ [K in keyof T]: T[K] extends Schema<infer U> ? U : never }> {
	return new ObjectSchema<T>(properties, path)
}

/**
 * @description Factory function to create a new LiteralSchema.
 * @template T - The type of the literal value (string, number, boolean, or null).
 * @param {T} value - The literal value to match.
 * @param {string} [path] - The path to the field this schema represents.
 * @returns {LiteralSchema<T>} A new LiteralSchema instance.
 */
export function literal<T extends string | number | boolean | null>(
	value: T,
	path?: string,
) {
	return new LiteralSchema<T>(value, path)
}

/**
 * @description Factory function to create a new UnionSchema.
 * @template T - An array of possible types for the union.
 * @param {Schema<T[K]>[]} schemas - An array of schemas to form the union.
 * @returns {Schema<T[number]>} A new UnionSchema instance.
 */
export function union<T extends unknown[]>(
	schemas: [...{ [K in keyof T]: Schema<T[K]> }],
): Schema<T[number]> {
	return new UnionSchema(schemas)
}

const user = object({
	name: string().max(3),
	age: number(),
	type: union([literal("admin"), literal("user")]),
	tags: array(string()).min(1).max(3),
	properties: object({
		age: number(),
		name: string(),
	}),
})

try {
	const result = user.parse({
		name: "sai",
		age: 1,
		type: "admin",
		tags: ["hi", "hi", "hi"],
		properties: {
			age: 1,
			name: "sai",
		},
	})
	console.log(result)
} catch (e) {
	console.log(e)
	if (e instanceof ValidationError) {
		console.log(e.options)
	}
}

const rip = number().gt(1).lt(3)
try {
	const result = rip.parse(2)
	console.log(result)
} catch (e) {
	if (e instanceof ValidationError) {
		console.log(e.options)
	}
}
