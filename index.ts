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

	_parse(value: unknown) {
		if (this._required && value === undefined)
			throw this.error("Value is required", value)
	}
}

class StringSchema extends BaseSchema<string, "string"> {
	private _pattern?: RegExp
	private _min?: number
	private _max?: number

	constructor(path: string) {
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
		this._parse(value)
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
		if (typeof value !== "number")
			throw this.error("Value is not a number", value)

		if (this._lt && value < this._lt)
			throw this.error("Value is too small", value)

		if (this._gt && value > this._gt)
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

	constructor(public items: Schema<T>) {
		super("array")
	}

	min(value: number) {
		this._min = value
		return this
	}

	max(value: number) {
		this._max = value
		return this
	}

	parse(value: unknown): T[] | undefined {
		return undefined
	}
}

class ObjectSchema<T> extends BaseSchema<{ [key: string]: T }, "object"> {
	constructor(public properties: { [key: string]: Schema<T> }) {
		super("object")
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

function number(path?: string) {
	return new NumberSchema(path)
}

const schema = number().lt(10).gt(5)

try {
	const result = schema.parse(11)

	console.log(result)
} catch (e) {
	if (e instanceof ValidationError) {
		console.log(e.message)
	}
}
