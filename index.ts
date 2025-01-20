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

	required() {
		this._required = true
		return this
	}

	optional() {
		this._required = false
		return this
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
		if (typeof value !== "string")
			throw new ValidationError({
				path: this.path,
				message: "Value is not a string",
				data: value,
			})

		if (this._pattern && !this._pattern.test(value))
			throw new ValidationError({
				path: this.path,
				message: "Value does not match pattern",
				data: value,
			})
		if (this._min && value.length < this._min)
			throw new ValidationError({
				path: this.path,
				message: "Value is too short",
				data: value,
			})
		if (this._max && value.length > this._max)
			throw new ValidationError({
				path: this.path,
				message: "Value is too long",
				data: value,
			})

		return value
	}
}

class NumberSchema extends BaseSchema<number, "number"> {
	private _min?: number
	private _max?: number

	constructor(path?: string) {
		super("number", path ?? "number")
	}

	min(value: number) {
		this._min = value
		return this
	}

	max(value: number) {
		this._max = value
		return this
	}

	parse(value: unknown): number {
		if (typeof value !== "number")
			throw new ValidationError({
				path: this.path,
				message: "Value is not a number",
				data: value,
			})

		if (this._min && value < this._min)
			throw new ValidationError({
				path: this.path,
				message: "Value is too small",
				data: value,
			})
		if (this._max && value > this._max)
			throw new ValidationError({
				path: this.path,
				message: "Value is too large",
				data: value,
			})

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
			throw new ValidationError({
				path: this.path,
				message: "Value is not a boolean",
				data: value,
			})

		if (this._true && value !== true) {
			throw new ValidationError({
				path: this.path,
				message: "Value is not true",
				data: value,
			})
		}

		if (this._false && value !== false) {
			throw new ValidationError({
				path: this.path,
				message: "Value is not false",
				data: value,
			})
		}

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

const schema = number().min(5).max(10)

try {
	const result = schema.parse(11)

	console.log(result)
} catch (e) {
	if (e instanceof ValidationError) {
		console.log(e.message)
	}
}
