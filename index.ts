type ValidationErrorData = unknown

class ValidationError extends Error {
	constructor(
		public options: {
			path?: string
			message: string
			data?: ValidationErrorData
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

type UnionSchemaParams<T extends unknown[]> = { [K in keyof T]: Schema<T[K]> }

class UnionSchema<T extends unknown[]> extends Schema<T[number]> {
	constructor(public schemas: UnionSchemaParams<T>) {
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

type LiteralSchemaTypes = string | number | boolean
type LiteralSchemaParams = {
	path?: string
}

class LiteralSchema<T extends LiteralSchemaTypes> extends Schema<T> {
	constructor(
		public literalValue: T,
		public params: LiteralSchemaParams,
	) {
		super("literal", params.path)
	}

	parse(value: unknown): T {
		return this.runParser(value, (value) => {
			if (value !== this.literalValue)
				throw this.error("Value does not match literal", value)
			return value as T
		})
	}
}

type StringSchemaParams = {
	pattern?: RegExp
	min?: number
	max?: number
	path?: string
}

class StringSchema extends Schema<string> {
	constructor(public params: StringSchemaParams) {
		super("string", params.path)
	}

	min(value: number) {
		return new StringSchema({ ...this.params, min: value })
	}

	max(value: number) {
		return new StringSchema({ ...this.params, max: value })
	}

	pattern(value: RegExp) {
		return new StringSchema({ ...this.params, pattern: value })
	}

	parse(value: unknown): string {
		return this.runParser(value, (value) => {
			if (typeof value !== "string") throw this.error("is not a string", value)

			if (this.params.pattern && !this.params.pattern.test(value))
				throw this.error("Value does not match pattern", value)

			if (this.params.min && value.length < this.params.min)
				throw this.error("Value is too short", value)

			if (this.params.max && value.length > this.params.max)
				throw this.error("Value is too long", value)

			return value
		})
	}
}

type NumberSchemaParams = {
	path?: string
	lt?: number
	gt?: number
	isPositive?: boolean
	isNegative?: boolean
}

class NumberSchema extends Schema<number> {
	constructor(public params: NumberSchemaParams) {
		super("number", params.path)
	}

	lt(value: number) {
		return new NumberSchema({ ...this.params, lt: value })
	}

	gt(value: number) {
		return new NumberSchema({ ...this.params, gt: value })
	}

	positive() {
		return new NumberSchema({
			...this.params,
			isPositive: true,
			isNegative: false,
		})
	}

	negative() {
		return new NumberSchema({
			...this.params,
			isPositive: false,
			isNegative: true,
		})
	}

	parse(value: unknown): number {
		return this.runParser(value, (value) => {
			if (typeof value !== "number") throw this.error("is not a number", value)

			if (this.params.isPositive && value <= 0)
				throw this.error("is not positive", value)

			if (this.params.isNegative && value >= 0)
				throw this.error("is not negative", value)

			if (this.params.lt && value > this.params.lt)
				throw this.error("Value is too small", value)

			if (this.params.gt && value < this.params.gt)
				throw this.error("Value is too large", value)

			return value
		})
	}
}

type BooleanSchemaParams = {
	path?: string
	true?: boolean
	false?: boolean
}

class BooleanSchema extends Schema<boolean> {
	constructor(public params: BooleanSchemaParams) {
		super("boolean", params.path)
	}

	true() {
		return new BooleanSchema({
			...this.params,
			true: true,
			false: undefined,
		})
	}

	false() {
		return new BooleanSchema({
			...this.params,
			true: undefined,
			false: true,
		})
	}

	parse(value: unknown): boolean {
		return this.runParser(value, (value) => {
			if (typeof value !== "boolean")
				throw this.error("is not a boolean", value)

			if (this.params.true && value !== true)
				throw this.error("is not true", value)

			if (this.params.false && value !== false)
				throw this.error("is not false", value)

			return value
		})
	}
}

type ArraySchemaParams = {
	path?: string
	min?: number
	max?: number
}

class ArraySchema<T> extends Schema<T[]> {
	constructor(
		public schema: Schema<T>,
		public params: ArraySchemaParams,
	) {
		super("array", params.path)
	}

	min(value: number) {
		return new ArraySchema(this.schema, { ...this.params, min: value })
	}

	max(value: number) {
		return new ArraySchema(this.schema, { ...this.params, max: value })
	}

	parse(value: unknown): T[] {
		return this.runParser(value, (value) => {
			if (!(value instanceof Array)) {
				throw this.error("Invalid array", value)
			}
			if (this.params.min && value.length < this.params.min) {
				throw this.error(
					`Expected a minimum of ${this.params.min} items`,
					value,
				)
			}
			if (this.params.max && value.length > this.params.max) {
				throw this.error(
					`Expected a maximum of ${this.params.max} items`,
					value,
				)
			}
			let result: T[] = []
			for (const item of value) {
				result.push(this.schema.parse(item) as any)
			}
			return result
		})
	}
}

type ObjectSchemaResult<T extends Record<string, Schema<any>>> = {
	[K in keyof T]: T[K] extends Schema<infer U> ? U : never
}

type ObjectSchemaParams = {
	path?: string
}

class ObjectSchema<T extends Record<string, Schema<any>>> extends Schema<
	ObjectSchemaResult<T>
> {
	constructor(
		public properties: T,
		public params?: ObjectSchemaParams,
	) {
		super("object", params?.path)
		for (const key in properties) {
			const schema = properties[key]
			if (schema instanceof Schema) {
				schema.path = key
			}
		}
	}

	parse(value: unknown): ObjectSchemaResult<T> {
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

export function number(params?: NumberSchemaParams) {
	return new NumberSchema(params ?? {})
}

export function string(params?: StringSchemaParams) {
	return new StringSchema(params ?? {})
}

export function boolean(params?: BooleanSchemaParams) {
	return new BooleanSchema(params ?? {})
}

export function array<T>(schema: Schema<T>, params?: ArraySchemaParams) {
	return new ArraySchema<T>(schema, params ?? {})
}

export function object<T extends Record<string, Schema<any>>>(
	properties: T,
	params?: ObjectSchemaParams,
): Schema<{ [K in keyof T]: T[K] extends Schema<infer U> ? U : never }> {
	return new ObjectSchema<T>(properties, params)
}

export function literal<T extends LiteralSchemaTypes>(
	literalValue: T,
	path?: string,
) {
	return new LiteralSchema(literalValue, { path })
}

export function union<T extends unknown[]>(
	schemas: { [K in keyof T]: Schema<T[K]> },
): UnionSchema<T> {
	return new UnionSchema(schemas)
}

type Infer<S> = S extends Schema<infer T> ? T : never

const user = object({
	name: string(),
	age: number().refine((age) => age === 10),
	type: union([literal("admin"), literal("user")]),
	tags: array(string()).min(2),
})

type User = Infer<typeof user>

try {
	const result = user.parse({
		name: "sai",
		age: 1,
		type: "admin",
		tags: ["hi"],
	})
	console.log(result)
} catch (e) {
	if (e instanceof ValidationError) {
		console.log(e.options)
	}
}
