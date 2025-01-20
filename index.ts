class ValidationError extends Error {
	constructor(
		public path: string,
		public message: string,
		public data?: unknown,
	) {
		super(message)
	}
}

abstract class BaseSchema<T, type extends string> {
	_required: boolean = true
	constructor(public type: type) {}

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
	_pattern?: RegExp
	_min?: number
	_max?: number

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
			throw new ValidationError("string", "Value is not a string", value)

		if (this._pattern && !this._pattern.test(value))
			throw new Error("Value does not match pattern")
		if (this._min && value.length < this._min)
			throw new Error("Value is too short")
		if (this._max && value.length > this._max)
			throw new Error("Value is too long")

		return value
	}
}

class NumberSchema extends BaseSchema<number, "number"> {
	_min?: number
	_max?: number

	min(value: number) {
		this._min = value
		return this
	}

	max(value: number) {
		this._max = value
		return this
	}

	parse(value: unknown): number {
		if (typeof value !== "number") throw new Error("Value is not a number")

		if (this._min && value < this._min) throw new Error("Value is too small")
		if (this._max && value > this._max) throw new Error("Value is too large")

		return value
	}
}

class BooleanSchema extends BaseSchema<boolean, "boolean"> {
	parse(value: unknown): boolean | undefined {
		return undefined
	}
}

class ArraySchema<T> extends BaseSchema<T[], "array"> {
	constructor(public items: Schema<T>) {
		super("array")
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
