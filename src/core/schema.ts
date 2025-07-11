import type {
	ValidationError,
	ValidationResult,
	ValidationSuccess,
} from "../types/index.js"

export class ValidationErrorImpl extends Error {
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

export abstract class Schema<T> {
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

export class OptionalSchema<T> extends Schema<T | undefined> {
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

export class NullableSchema<T> extends Schema<T | null> {
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

export class RefinementSchema<T> extends Schema<T> {
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

export class PipeSchema<T, U> extends Schema<U> {
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
