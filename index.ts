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

abstract class BaseSchema<T, type extends string> {
	private _required: boolean = true
	private _nullable: boolean = true
	constructor(
		public type: type,
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

	optional(): BaseSchema<T | undefined, type> {
		this._required = false
		return this
	}

	nullable(): BaseSchema<T | null, type> {
		this._nullable = true
		return this
	}

	runParser(value: unknown, run: (value: unknown) => T): T {
		if (this._required === false) {
			return run(value)
		}
		if (this._required && value === undefined) {
			throw this.error("Value is required", value)
		}
		return run(value)
	}

	_postValidate(value: T) {}
}

class StringSchema extends BaseSchema<string, "string"> {
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
			if (typeof value !== "string")
				throw this.error("Value is not a string", value)

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

class NumberSchema extends BaseSchema<number, "number"> {
	private _lt?: number
	private _gt?: number

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

	parse(value: unknown): number {
		return this.runParser(value, (value) => {
			if (typeof value !== "number")
				throw this.error("Value is not a number", value)

			if (this._lt && value > this._lt)
				throw this.error("Value is too small", value)

			if (this._gt && value < this._gt)
				throw this.error("Value is too large", value)

			return value
		})
	}
}

class BooleanSchema extends BaseSchema<boolean, "boolean"> {
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
				throw this.error("Value is not a boolean", value)

			if (this._true && value !== true)
				throw this.error("Value is not true", value)

			if (this._false && value !== false)
				throw this.error("Value is not false", value)

			return value
		})
	}
}

class ArraySchema<T> extends BaseSchema<T[], "array"> {
	private _min?: number
	private _max?: number

	constructor(
		public schema: BaseSchema<T, any>,
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

class ObjectSchema<
	T extends Record<string, BaseSchema<any, any>>,
> extends BaseSchema<
	{ [K in keyof T]: T[K] extends BaseSchema<infer U, any> ? U : never },
	"object"
> {
	constructor(
		public properties: T,
		path?: string,
	) {
		super("object", path)
		for (const key in properties) {
			const schema = properties[key]
			if (schema instanceof BaseSchema) {
				schema.path = key
			}
		}
	}

	parse(value: unknown): {
		[K in keyof T]: T[K] extends BaseSchema<infer U, any> ? U : never
	} {
		return this.runParser(value, (value) => {
			if (typeof value !== "object" || value === null) {
				throw this.error("Value is not an object", value)
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

function array<T>(schema: BaseSchema<T, any>, path?: string) {
	return new ArraySchema<T>(schema, path)
}

function object<T extends Record<string, BaseSchema<any, any>>>(
	properties: T,
	path?: string,
) {
	return new ObjectSchema<T>(properties, path)
}

const schema = object({
	hi: number().nullable(),
	name: string(),
	isTrue: boolean().optional().nullable(),
})

try {
	const result = schema.parse({
		hi: 11,
		name: "hi",
	})

	console.log(result)
} catch (e) {
	if (e instanceof ValidationError) {
		console.log(e.options)
	}
}
