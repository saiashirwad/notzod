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

class ArraySchema<T> extends Schema<T[]> {
	constructor(
		public schema: Schema<T>,
		public options: ArraySchemaOptions<T>,
	) {
		super("array", options.path)
		this.compile()
	}

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

	min(value: number) {
		return new ArraySchema(this.schema, { ...this.options, min: value })
	}

	max(value: number) {
		return new ArraySchema(this.schema, { ...this.options, max: value })
	}

	parse(value: unknown): T[] {
		return this.runParser(value, (value) => {
			return this._compiledParse!.call(this, value)
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
		this.compile()
	}

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

	parse(value: unknown): {
		[K in keyof T]: T[K] extends Schema<infer U> ? U : never
	} {
		return this.runParser(value, (value) => {
			return this._compiledParse!.call(this, value)
		})
	}
}

export function number(options: NumberSchemaOptions = {}) {
	return new NumberSchema(options)
}

export function string(options: StringSchemaOptions = {}) {
	return new StringSchema(options)
}

export function boolean(options: BooleanSchemaOptions = {}) {
	return new BooleanSchema(options)
}

export function array<T>(
	schema: Schema<T>,
	options: ArraySchemaOptions<T> = {},
) {
	return new ArraySchema<T>(schema, options)
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
