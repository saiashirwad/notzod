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
	public _compiledParse?: (value: unknown, path: string[]) => ValidationResult<T>

	constructor(
		public readonly type: string,
		public readonly path: string[] = [],
	) {}

	abstract _parse(value: unknown, path: string[]): ValidationResult<T>

	/**
	 * Compile the schema into a fast parsing function using JIT compilation
	 */
	compile(): void {
		// Default implementation - can be overridden by subclasses
		this._compiledParse = this._parse.bind(this)
	}

	/**
	 * Get the compiled parser, compiling if not already done
	 */
	protected getCompiledParser(): (value: unknown, path: string[]) => ValidationResult<T> {
		if (!this._compiledParse) {
			this.compile()
		}
		return this._compiledParse!
	}

	parse(value: unknown): T {
		const result = this.getCompiledParser()(value, this.path)
		if (!result.success) {
			throw new ValidationErrorImpl((result as ValidationError).error)
		}
		return result.data
	}

	safeParse(value: unknown): ValidationResult<T> {
		return this.getCompiledParser()(value, this.path)
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

	compile(): void {
		// Ensure the wrapped schema is compiled
		this.schema.compile()
		
		const checks: string[] = []
		checks.push('if (value === undefined) {')
		checks.push('  return { success: true, data: undefined };')
		checks.push('}')
		checks.push('return this.schema.getCompiledParser()(value, path);')

		try {
			this._compiledParse = new Function('value', 'path', checks.join('\n')) as (value: unknown, path: string[]) => ValidationResult<T | undefined>
		} catch (error) {
			// Fallback to regular parsing if compilation fails
			this._compiledParse = this._parse.bind(this)
		}
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

	compile(): void {
		// Ensure the wrapped schema is compiled
		this.schema.compile()
		
		const checks: string[] = []
		checks.push('if (value === null) {')
		checks.push('  return { success: true, data: null };')
		checks.push('}')
		checks.push('return this.schema.getCompiledParser()(value, path);')

		try {
			this._compiledParse = new Function('value', 'path', checks.join('\n')) as (value: unknown, path: string[]) => ValidationResult<T | null>
		} catch (error) {
			// Fallback to regular parsing if compilation fails
			this._compiledParse = this._parse.bind(this)
		}
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

	compile(): void {
		// Ensure the wrapped schema is compiled
		this.schema.compile()
		
		const checks: string[] = []
		checks.push('const result = this.schema.getCompiledParser()(value, path);')
		checks.push('if (!result.success) {')
		checks.push('  return result;')
		checks.push('}')
		checks.push('if (!this.refineFn(result.data)) {')
		checks.push(`  return { success: false, error: { path, message: ${JSON.stringify(this.errorMessage)}, data: result.data } };`)
		checks.push('}')
		checks.push('return result;')

		try {
			this._compiledParse = new Function('value', 'path', checks.join('\n')) as (value: unknown, path: string[]) => ValidationResult<T>
		} catch (error) {
			// Fallback to regular parsing if compilation fails
			this._compiledParse = this._parse.bind(this)
		}
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

	compile(): void {
		// Ensure both schemas are compiled
		this.inputSchema.compile()
		this.outputSchema.compile()
		
		const checks: string[] = []
		checks.push('const result = this.inputSchema.getCompiledParser()(value, path);')
		checks.push('if (!result.success) {')
		checks.push('  return result;')
		checks.push('}')
		checks.push('return this.outputSchema.getCompiledParser()(result.data, path);')

		try {
			this._compiledParse = new Function('value', 'path', checks.join('\n')) as (value: unknown, path: string[]) => ValidationResult<U>
		} catch (error) {
			// Fallback to regular parsing if compilation fails
			this._compiledParse = this._parse.bind(this)
		}
	}

	_parse(value: unknown, path: string[]): ValidationResult<U> {
		const result = this.inputSchema._parse(value, path)
		if (!result.success) {
			return result as ValidationError
		}
		return this.outputSchema._parse(result.data, path)
	}
}
