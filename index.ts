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

	optional() {
		this._required = false
		return this
	}

	_preValidate(value: unknown) {
		if (this._required && value === undefined)
			throw this.error("Value is required", value)
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
		this._preValidate(value)
		if (typeof value !== "string")
			throw this.error("Value is not a string", value)

		if (this._pattern && !this._pattern.test(value))
			throw this.error("Value does not match pattern", value)

		if (this._min && value.length < this._min)
			throw this.error("Value is too short", value)

		if (this._max && value.length > this._max)
			throw this.error("Value is too long", value)

		return value
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
		this._preValidate(value)
		if (typeof value !== "number")
			throw this.error("Value is not a number", value)

		if (this._lt && value > this._lt)
			throw this.error("Value is too small", value)

		if (this._gt && value < this._gt)
			throw this.error("Value is too large", value)

		return value
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
		this._preValidate(value)
		if (typeof value !== "boolean")
			throw this.error("Value is not a boolean", value)

		if (this._true && value !== true)
			throw this.error("Value is not true", value)

		if (this._false && value !== false)
			throw this.error("Value is not false", value)

		return value
	}
}

class ArraySchema<T> extends BaseSchema<T[], "array"> {
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
		this._preValidate(value)
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
	}
}

class ObjectSchema<T> extends BaseSchema<{ [key: string]: T }, "object"> {
	constructor(
		public properties: { [key: string]: Schema<T> },
		path?: string,
	) {
		super("object", path)
	}

	parse(value: unknown): { [key: string]: T } | undefined {
		return undefined
	}
}

type Schema<T> =
	| StringSchema
	| NumberSchema
	| BooleanSchema
	| ArraySchema<T>
	| ObjectSchema<T>

function number(path?: string): NumberSchema {
	return new NumberSchema(path)
}

function string(path?: string): StringSchema {
	return new StringSchema(path)
}

function boolean(path?: string): BooleanSchema {
	return new BooleanSchema(path)
}

function array<T>(schema: Schema<T>, path?: string): ArraySchema<T> {
	return new ArraySchema(schema, path)
}

function object<T>(properties: { [key: string]: Schema<T> }, path?: string) {
	return new ObjectSchema(properties, path)
}

const schema = array(number().lt(10).gt(5))

try {
	const result = schema.parse(11)

	console.log(result)
} catch (e) {
	if (e instanceof ValidationError) {
		console.log(e.message)
	}
}
