export class ValidationError extends Error {
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
	protected _required: boolean = true
	protected _nullable: boolean = true
	private _refineFns: ((value: T) => boolean)[] = []
	protected _compiledParse?: (value: unknown) => T

	abstract compile(): void

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
	constructor(public schemas: [...Schema<T[number]>[]]) {
		super("union", "union")
		this.compile()
	}

	compile(): void {
		// TODO: implement
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

class LiteralSchema<
	T extends string | number | boolean | null,
> extends Schema<T> {
	constructor(
		public value: T,
		path?: string,
	) {
		super("literal", path)
		this.compile()
	}

	compile(): void {
		// TODO: implement
	}

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

class StringSchema extends Schema<string> {
	constructor(public options: StringSchemaOptions) {
		super("string", options.path)
		this.compile()
	}

	min(value: number) {
		return new StringSchema({ ...this.options, min: value })
	}

	max(value: number) {
		return new StringSchema({ ...this.options, max: value })
	}

	pattern(value: RegExp) {
		return new StringSchema({ ...this.options, pattern: value })
	}

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

class NumberSchema extends Schema<number> {
	constructor(public options: NumberSchemaOptions) {
		super("number", options.path)
		this.compile()
	}

	lt(value: number) {
		return new NumberSchema({ ...this.options, lt: value })
	}

	gt(value: number) {
		return new NumberSchema({ ...this.options, gt: value })
	}

	positive() {
		return new NumberSchema({ ...this.options, positive: true })
	}

	negative() {
		return new NumberSchema({ ...this.options, negative: true })
	}

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

class BooleanSchema extends Schema<boolean> {
	constructor(public options: BooleanSchemaOptions) {
		super("boolean", options.path)
		this.compile()
	}

	true() {
		return new BooleanSchema({ ...this.options, true: true })
	}

	false() {
		return new BooleanSchema({ ...this.options, false: true })
	}

	compile(): void {
		// TODO: implement
	}

	parse(value: unknown): boolean {
		// return this.runParser(value, (value) => {
		// 	if (typeof value !== "boolean")
		// 		throw this.error("is not a boolean", value)
		// 	if (this._true && value !== true) throw this.error("is not true", value)
		// 	if (this._false && value !== false)
		// 		throw this.error("is not false", value)
		// 	return value
		// })
		return this._compiledParse!(value)
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
			if (!Array.isArray(value)) {
				throw this.error("is not an array", value)
			}

			const len = value.length
			if (this._min && len < this._min) {
				throw this.error(`expected a minimum of ${this._min} items`, value)
			}
			if (this._max && len > this._max) {
				throw this.error(`expected a maximum of ${this._max} items`, value)
			}

			const result = new Array(len)
			for (let i = 0; i < len; i++) {
				result[i] = this.schema.parse(value[i])
			}
			return result
		})
	}
}

class ObjectSchema<T extends Record<string, Schema<any>>> extends Schema<{
	[K in keyof T]: T[K] extends Schema<infer U> ? U : never
}> {
	private propertyKeys: string[]
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
		this.propertyKeys = Object.keys(properties)
		this.compile()
	}

	private compile() {
		const validators = Object.entries(this.properties).map(
			([key, schema]) => `result.${key} = ${schema.compile()}(value.${key});`,
		)
		this._compiledParse = new Function(
			"value",
			`{ ${validators.join("")} }`,
		) as any
	}

	parse(value: unknown): {
		[K in keyof T]: T[K] extends Schema<infer U> ? U : never
	} {
		// return this.runParser(value, (value) => {
		// 	if (typeof value !== "object" || value === null) {
		// 		throw this.error("is not an object", value)
		// 	}

		// 	const result = Object.create(null)
		// 	const len = this.propertyKeys.length
		// 	for (let i = 0; i < len; i++) {
		// 		const key = this.propertyKeys[i]
		// 		const schema = this.properties[key]
		// 		const propertyValue = (value as any)[key]
		// 		result[key] = schema.parse(propertyValue)
		// 	}
		// 	return result
		// })
		return this._compiledParse!(value)
	}
}

export function number(options: NumberSchemaOptions = {}) {
	return new NumberSchema(options)
}

export function string(options: StringSchemaOptions = {}) {
	return new StringSchema(options)
}

export function boolean(path?: string) {
	return new BooleanSchema(path)
}

export function array<T>(schema: Schema<T>, path?: string) {
	return new ArraySchema<T>(schema, path)
}

export function object<T extends Record<string, Schema<any>>>(
	properties: T,
	path?: string,
): Schema<{ [K in keyof T]: T[K] extends Schema<infer U> ? U : never }> {
	return new ObjectSchema<T>(properties, path)
}

export function literal<T extends string | number | boolean | null>(
	value: T,
	path?: string,
) {
	return new LiteralSchema<T>(value, path)
}

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
})

try {
	const result = user.parse({
		name: "sai",
		age: 1,
		type: "admin",
		tags: ["hi", "hi", "hi"],
	})
	console.log(result)
} catch (e) {
	if (e instanceof ValidationError) {
		console.log(e.options)
	}
}

// const rip = number().gt(1).lt(3)
// try {
// 	const result = rip.parse(2)
// 	console.log(result)
// } catch (e) {
// 	if (e instanceof ValidationError) {
// 		console.log(e.options)
// 	}
// }

const lol = literal(null)
const result = lol.parse(null)
console.log(result)
