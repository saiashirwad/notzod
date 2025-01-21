class ValidationError extends Error {
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

abstract class Schema<T> {
	private _required: boolean = true
	private _nullable: boolean = true
	private _refineFns: ((value: T) => boolean)[] = []

	constructor(
		public type: string,
		public path?: string,
	) {}

	abstract parse(value: unknown): T | undefined

	error(message: string, data?: unknown) {
		return new ValidationError({
			path: this.path,
			message,
			data,
		})
	}

	required() {
		this._required = true
		return this
	}

	optional(): Schema<T | undefined> {
		this._required = false
		return this as any
	}

	refine(refineFn: (value: T) => boolean): Schema<T> {
		this._refineFns.push(refineFn)
		return this
	}

	nullable(): Schema<T | null> {
		this._nullable = true
		return this as any
	}

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

class UnionSchema<T extends unknown[]> extends Schema<T[number]> {
	constructor(public schemas: { [K in keyof T]: Schema<T[K]> }) {
		super("union", "union")
	}

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

class LiteralSchema<T extends string | number | boolean> extends Schema<T> {
	constructor(
		public value: T,
		path?: string,
	) {
		super("literal", path)
	}

	parse(value: unknown): T {
		return this.runParser(value, (value) => {
			if (value !== this.value)
				throw this.error("Value does not match literal", value)
			return value as T
		})
	}
}

class StringSchema extends Schema<string> {
	private _pattern?: RegExp
	private _min?: number
	private _max?: number

	constructor(path?: string) {
		super("string", path)
	}

	min(value: number) {
		this._min = value
		return this
	}

	max(value: number) {
		this._max = value
		return this
	}

	pattern(value: RegExp) {
		this._pattern = value
		return this
	}

	parse(value: unknown): string {
		return this.runParser(value, (value) => {
			if (typeof value !== "string") throw this.error("is not a string", value)

			if (this._pattern && !this._pattern.test(value))
				throw this.error("Value does not match pattern", value)

			if (this._min && value.length < this._min)
				throw this.error("Value is too short", value)

			if (this._max && value.length > this._max)
				throw this.error("Value is too long", value)

			return value
		})
	}
}

class NumberSchema extends Schema<number> {
	private _lt?: number
	private _gt?: number
	private _isPositive?: boolean
	private _isNegative?: boolean

	constructor(path?: string) {
		super("number", path ?? "number")
	}

	lt(value: number) {
		this._lt = value
		return this
	}

	gt(value: number) {
		this._gt = value
		return this
	}

	positive() {
		this._isPositive = true
		return this
	}

	negative() {
		this._isNegative = true
		return this
	}

	parse(value: unknown): number {
		return this.runParser(value, (value) => {
			if (typeof value !== "number") throw this.error("is not a number", value)

			if (this._isPositive && value <= 0)
				throw this.error("is not positive", value)

			if (this._isNegative && value >= 0)
				throw this.error("is not negative", value)

			if (this._lt && value > this._lt)
				throw this.error("Value is too small", value)

			if (this._gt && value < this._gt)
				throw this.error("Value is too large", value)

			return value
		})
	}
}

class BooleanSchema extends Schema<boolean> {
	private _true?: boolean
	private _false?: boolean

	constructor(path?: string) {
		super("boolean", path ?? "boolean")
	}

	true() {
		this._true = true
		return this
	}

	false() {
		this._false = true
		return this
	}

	parse(value: unknown): boolean {
		return this.runParser(value, (value) => {
			if (typeof value !== "boolean")
				throw this.error("is not a boolean", value)

			if (this._true && value !== true) throw this.error("is not true", value)

			if (this._false && value !== false)
				throw this.error("is not false", value)

			return value
		})
	}
}

class ArraySchema<T> extends Schema<T[]> {
	private _min?: number
	private _max?: number

	constructor(
		public schema: Schema<T>,
		path?: string,
	) {
		super("array", path)
	}

	min(value: number) {
		this._min = value
		return this
	}

	max(value: number) {
		this._max = value
		return this
	}

	parse(value: unknown): T[] {
		return this.runParser(value, (value) => {
			if (!(value instanceof Array)) {
				throw this.error("Invalid array", value)
			}
			if (this._min && value.length < this._min) {
				throw this.error(`Expected a minimum of ${this._min} items`, value)
			}
			if (this._max && value.length > this._max) {
				throw this.error(`Expected a maximum of ${this._max} items`, value)
			}
			let result: T[] = []
			for (const item of value) {
				result.push(this.schema.parse(item) as any)
			}
			return result
		})
	}
}

class ObjectSchema<T extends Record<string, Schema<any>>> extends Schema<{
	[K in keyof T]: T[K] extends Schema<infer U> ? U : never
}> {
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
	}

	parse(value: unknown): {
		[K in keyof T]: T[K] extends Schema<infer U> ? U : never
	} {
		return this.runParser(value, (value) => {
			if (typeof value !== "object" || value === null) {
				throw this.error("is not an object", value)
			}

			const result: any = {}
			for (const key in this.properties) {
				const schema = this.properties[key]
				const propertyValue = (value as any)[key]
				result[key] = schema.parse(propertyValue)
			}
			return result
		})
	}
}

function number(path?: string) {
	return new NumberSchema(path)
}

function string(path?: string) {
	return new StringSchema(path)
}

function boolean(path?: string) {
	return new BooleanSchema(path)
}

function array<T>(schema: Schema<T>, path?: string) {
	return new ArraySchema<T>(schema, path)
}

function object<T extends Record<string, Schema<any>>>(
	properties: T,
	path?: string,
): Schema<{ [K in keyof T]: T[K] extends Schema<infer U> ? U : never }> {
	return new ObjectSchema<T>(properties, path)
}

function literal<T extends string | number | boolean>(value: T, path?: string) {
	return new LiteralSchema<T>(value, path)
}

function union<T extends unknown[]>(
	schemas: { [K in keyof T]: Schema<T[K]> },
): UnionSchema<T> {
	return new UnionSchema(schemas)
}

const user = object({
	name: string(),
	age: number(),
	type: union([literal("admin"), literal("user")]),
})

try {
	const result = user.parse({
		name: "sai",
		age: 1,
		type: "admin",
	})
	console.log(result)
} catch (e) {
	if (e instanceof ValidationError) {
		console.log(e.options)
	}
}
