type ValidationSuccess<T> = { success: true; data: T }
type ValidationError = {
	success: false
	error: {
		path: string[]
		message: string
		data?: unknown
	}
}
type ValidationResult<T> = ValidationSuccess<T> | ValidationError

abstract class Schema<T> {
	constructor(
		public readonly type: string,
		public readonly path: string[] = [],
	) {}

	abstract _parse(value: unknown, path: string[]): ValidationResult<T>

	parse(value: unknown): T {
		const result = this._parse(value, this.path)
		if (!result.success) {
			throw new ValidationErrorImpl(result.error)
		}
		return result.data
	}

	safeParse(value: unknown): ValidationResult<T> {
		return this._parse(value, this.path)
	}

	optional(): Schema<T | undefined> {
		return new OptionalSchema<T>(this)
	}

	nullable(): Schema<T | null> {
		return new NullableSchema<T>(this)
	}

	refine(
		refineFn: (value: T) => boolean,
		errorMessage: string = "Failed refinement check",
	): Schema<T> {
		return new RefinementSchema<T>(this, refineFn, errorMessage)
	}

	protected success<U>(data: U): ValidationSuccess<U> {
		return { success: true, data }
	}

	protected error(
		message: string,
		path: string[],
		data?: unknown,
	): ValidationError {
		return {
			success: false,
			error: {
				path,
				message,
				data,
			},
		}
	}

	pipe<U>(schema: Schema<U>): Schema<U> {
		return new PipeSchema<T, U>(this, schema)
	}
}

class ValidationErrorImpl extends Error {
	constructor(
		public readonly error: {
			path: string[]
			message: string
			data?: unknown
		},
	) {
		const pathStr = error.path.length ? error.path.join(".") : "<root>"
		super(`${pathStr}: ${error.message}`)
		this.name = "ValidationError"
	}
}

class OptionalSchema<T> extends Schema<T | undefined> {
	constructor(private readonly schema: Schema<T>) {
		super("optional", schema.path)
	}

	_parse(value: unknown, path: string[]): ValidationResult<T | undefined> {
		if (value === undefined) {
			return this.success(undefined)
		}
		return this.schema._parse(value, path)
	}
}

class NullableSchema<T> extends Schema<T | null> {
	constructor(private readonly schema: Schema<T>) {
		super("nullable", schema.path)
	}

	_parse(value: unknown, path: string[]): ValidationResult<T | null> {
		if (value === null) {
			return this.success(null)
		}
		return this.schema._parse(value, path)
	}
}

class RefinementSchema<T> extends Schema<T> {
	constructor(
		private readonly schema: Schema<T>,
		private readonly refineFn: (value: T) => boolean,
		private readonly errorMessage: string,
	) {
		super("refinement", schema.path)
	}

	_parse(value: unknown, path: string[]): ValidationResult<T> {
		const result = this.schema._parse(value, path)
		if (!result.success) {
			return result
		}
		if (!this.refineFn(result.data)) {
			return this.error(this.errorMessage, path, result.data)
		}
		return result
	}
}

class PipeSchema<T, U> extends Schema<U> {
	constructor(
		private readonly inputSchema: Schema<T>,
		private readonly outputSchema: Schema<U>,
	) {
		super("pipe", inputSchema.path)
	}

	_parse(value: unknown, path: string[]): ValidationResult<U> {
		const result = this.inputSchema._parse(value, path)
		if (!result.success) {
			return result as ValidationError
		}
		return this.outputSchema._parse(result.data, path)
	}
}

class StringSchema extends Schema<string> {
	private readonly minLength?: number
	private readonly maxLength?: number
	private readonly pattern?: RegExp

	constructor(
		options: {
			minLength?: number
			maxLength?: number
			pattern?: RegExp
			path?: string[]
		} = {},
	) {
		super("string", options.path)
		this.minLength = options.minLength
		this.maxLength = options.maxLength
		this.pattern = options.pattern
	}

	_parse(value: unknown, path: string[]): ValidationResult<string> {
		if (typeof value !== "string") {
			return this.error("Expected string, got " + typeof value, path, value)
		}

		if (this.minLength !== undefined && value.length < this.minLength) {
			return this.error(
				`String must be at least ${this.minLength} characters`,
				path,
				value,
			)
		}

		if (this.maxLength !== undefined && value.length > this.maxLength) {
			return this.error(
				`String must be at most ${this.maxLength} characters`,
				path,
				value,
			)
		}

		if (this.pattern !== undefined && !this.pattern.test(value)) {
			return this.error("String does not match pattern", path, value)
		}

		return this.success(value)
	}

	min(length: number): StringSchema {
		return new StringSchema({
			minLength: length,
			maxLength: this.maxLength,
			pattern: this.pattern,
			path: this.path,
		})
	}

	max(length: number): StringSchema {
		return new StringSchema({
			minLength: this.minLength,
			maxLength: length,
			pattern: this.pattern,
			path: this.path,
		})
	}

	matches(pattern: RegExp): StringSchema {
		return new StringSchema({
			minLength: this.minLength,
			maxLength: this.maxLength,
			pattern,
			path: this.path,
		})
	}
}

class NumberSchema extends Schema<number> {
	private readonly _min?: number
	private readonly _max?: number
	private readonly isPositive?: boolean
	private readonly isNegative?: boolean

	constructor(
		options: {
			min?: number
			max?: number
			isPositive?: boolean
			isNegative?: boolean
			path?: string[]
		} = {},
	) {
		super("number", options.path)
		this._min = options.min
		this._max = options.max
		this.isPositive = options.isPositive
		this.isNegative = options.isNegative
	}

	_parse(value: unknown, path: string[]): ValidationResult<number> {
		if (typeof value !== "number" || Number.isNaN(value)) {
			return this.error("Expected number, got " + typeof value, path, value)
		}

		if (this._min !== undefined && value < this._min) {
			return this.error(`Number must be at least ${this._min}`, path, value)
		}

		if (this._max !== undefined && value > this._max) {
			return this.error(`Number must be at most ${this._max}`, path, value)
		}

		if (this.isPositive && value <= 0) {
			return this.error("Number must be positive", path, value)
		}

		if (this.isNegative && value >= 0) {
			return this.error("Number must be negative", path, value)
		}

		return this.success(value)
	}

	min(val: number): NumberSchema {
		return new NumberSchema({
			min: val,
			max: this._max,
			isPositive: this.isPositive,
			isNegative: this.isNegative,
			path: this.path,
		})
	}

	max(val: number): NumberSchema {
		return new NumberSchema({
			min: this._min,
			max: val,
			isPositive: this.isPositive,
			isNegative: this.isNegative,
			path: this.path,
		})
	}

	positive(): NumberSchema {
		return new NumberSchema({
			min: this._min,
			max: this._max,
			isPositive: true,
			isNegative: false,
			path: this.path,
		})
	}

	negative(): NumberSchema {
		return new NumberSchema({
			min: this._min,
			max: this._max,
			isPositive: false,
			isNegative: true,
			path: this.path,
		})
	}
}

class BooleanSchema extends Schema<boolean> {
	private readonly strictTrue?: boolean
	private readonly strictFalse?: boolean

	constructor(
		options: {
			strictTrue?: boolean
			strictFalse?: boolean
			path?: string[]
		} = {},
	) {
		super("boolean", options.path)
		this.strictTrue = options.strictTrue
		this.strictFalse = options.strictFalse
	}

	_parse(value: unknown, path: string[]): ValidationResult<boolean> {
		if (typeof value !== "boolean") {
			return this.error("Expected boolean, got " + typeof value, path, value)
		}

		if (this.strictTrue && value !== true) {
			return this.error("Boolean must be true", path, value)
		}

		if (this.strictFalse && value !== false) {
			return this.error("Boolean must be false", path, value)
		}

		return this.success(value)
	}

	true(): BooleanSchema {
		return new BooleanSchema({
			strictTrue: true,
			strictFalse: undefined,
			path: this.path,
		})
	}

	false(): BooleanSchema {
		return new BooleanSchema({
			strictTrue: undefined,
			strictFalse: true,
			path: this.path,
		})
	}
}

class ArraySchema<T> extends Schema<T[]> {
	constructor(
		private readonly elementSchema: Schema<T>,
		private readonly options: {
			minLength?: number
			maxLength?: number
			path?: string[]
		} = {},
	) {
		super("array", options.path)
	}

	_parse(value: unknown, path: string[]): ValidationResult<T[]> {
		if (!Array.isArray(value)) {
			return this.error("Expected array, got " + typeof value, path, value)
		}

		if (
			this.options.minLength !== undefined &&
			value.length < this.options.minLength
		) {
			return this.error(
				`Array must have at least ${this.options.minLength} elements`,
				path,
				value,
			)
		}

		if (
			this.options.maxLength !== undefined &&
			value.length > this.options.maxLength
		) {
			return this.error(
				`Array must have at most ${this.options.maxLength} elements`,
				path,
				value,
			)
		}

		const result: T[] = []
		for (let i = 0; i < value.length; i++) {
			const elementPath = [...path, i.toString()]
			const elementResult = this.elementSchema._parse(value[i], elementPath)
			if (!elementResult.success) {
				return elementResult
			}
			result.push(elementResult.data)
		}

		return this.success(result)
	}

	min(length: number): ArraySchema<T> {
		return new ArraySchema(this.elementSchema, {
			...this.options,
			minLength: length,
			path: this.path,
		})
	}

	max(length: number): ArraySchema<T> {
		return new ArraySchema(this.elementSchema, {
			...this.options,
			maxLength: length,
			path: this.path,
		})
	}
}

type ObjectSchemaResult<T extends Record<string, Schema<any>>> = {
	[K in keyof T]: T[K] extends Schema<infer U> ? U : never
}

class ObjectSchema<T extends Record<string, unknown>> extends Schema<T> {
	constructor(
		private readonly shape: { [K in keyof T]: Schema<T[K]> },
		path: string[] = [],
	) {
		super("object", path)
	}

	_parse(value: unknown, path: string[]): ValidationResult<T> {
		if (typeof value !== "object" || value === null) {
			return this.error(
				"Expected object, got " + (value === null ? "null" : typeof value),
				path,
				value,
			)
		}

		const result: Record<string, unknown> = {}
		for (const key in this.shape) {
			const fieldPath = [...path, key]
			const fieldSchema = this.shape[key]
			const fieldValue = (value as Record<string, unknown>)[key]

			const fieldResult = fieldSchema._parse(fieldValue, fieldPath)
			if (!fieldResult.success) {
				return fieldResult
			}

			result[key] = fieldResult.data
		}

		return this.success(result as T)
	}

	extend<U extends Record<string, unknown>>(
		shape: { [K in keyof U]: Schema<U[K]> },
	): ObjectSchema<T & U> {
		return new ObjectSchema<T & U>(
			{ ...this.shape, ...shape } as any,
			this.path,
		)
	}
}

class LiteralSchema<T extends string | number | boolean> extends Schema<T> {
	constructor(
		private readonly value: T,
		path: string[] = [],
	) {
		super("literal", path)
	}

	_parse(value: unknown, path: string[]): ValidationResult<T> {
		if (value !== this.value) {
			return this.error(
				`Expected ${JSON.stringify(this.value)}, got ${JSON.stringify(value)}`,
				path,
				value,
			)
		}
		return this.success(this.value)
	}
}

class UnionSchema<T> extends Schema<T> {
	constructor(
		private readonly schemas: Schema<any>[],
		path: string[] = [],
	) {
		super("union", path)
	}

	_parse(value: unknown, path: string[]): ValidationResult<T> {
		const errors: ValidationError[] = []

		for (const schema of this.schemas) {
			const result = schema._parse(value, path)
			if (result.success) {
				return result as ValidationSuccess<T>
			}
			errors.push(result)
		}

		return this.error(
			"Value does not match any schema in union: " +
				errors.map((e) => e.error.message).join("; "),
			path,
			value,
		)
	}
}

function string(options?: {
	minLength?: number
	maxLength?: number
	pattern?: RegExp
}): StringSchema {
	return new StringSchema(options)
}

function number(options?: {
	min?: number
	max?: number
	isPositive?: boolean
	isNegative?: boolean
}): NumberSchema {
	return new NumberSchema(options)
}

function boolean(options?: {
	strictTrue?: boolean
	strictFalse?: boolean
}): BooleanSchema {
	return new BooleanSchema(options)
}

function array<T>(
	schema: Schema<T>,
	options?: {
		minLength?: number
		maxLength?: number
	},
): ArraySchema<T> {
	return new ArraySchema(schema, options)
}

type ObjectResult<T> = T extends ObjectSchema<infer R> ? R : never

function object<T extends Record<string, unknown>>(
	shape: { [K in keyof T]: Schema<T[K]> },
): Schema<ObjectResult<ObjectSchema<T>>> {
	return new ObjectSchema<T>(shape)
}

function literal<T extends string | number | boolean>(
	value: T,
): LiteralSchema<T> {
	return new LiteralSchema<T>(value)
}

function union<T>(schemas: Schema<any>[]): UnionSchema<T> {
	return new UnionSchema<T>(schemas)
}

type Infer<S> = S extends Schema<infer T> ? T : never

const userSchema = object({
	name: string().nullable(),
	age: number().refine((age) => age >= 18, "Must be at least 18 years old"),
	type: union<"admin" | "user">([literal("admin"), literal("user")]),
	tags: array(string()).min(2),
	email: string().matches(/^[\w.-]+@[\w.-]+\.\w+$/),
})

try {
	const user = userSchema.parse({
		name: "John Doe",
		age: 21,
		type: "admin",
		tags: ["one", "hi"],
		email: "john@example.com",
	})
	console.log(user)
} catch (e) {
	if (e instanceof ValidationErrorImpl) {
		console.log(e.message)
		console.log(e.error)
	} else {
		console.error(e)
	}
}
