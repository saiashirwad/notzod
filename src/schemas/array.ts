import { Schema } from "../core/schema.js"
import type { ValidationError, ValidationResult } from "../types/index.js"

export class ArraySchema<T> extends Schema<T[]> {
	constructor(
		private readonly elementSchema: Schema<T>,
		private readonly options: {
			minLength?: number
			maxLength?: number
			path?: string[]
		} = {},
	) {
		super("array", options.path)
	}

	compile(): void {
		// Ensure the element schema is compiled
		this.elementSchema.compile()

		const checks: string[] = []

		// Type check
		checks.push("if (!Array.isArray(value)) {")
		checks.push(
			'  return { success: false, error: { path, message: "Expected array, got " + typeof value, data: value } };',
		)
		checks.push("}")

		// Min length check
		if (this.options.minLength !== undefined) {
			checks.push(`if (value.length < ${this.options.minLength}) {`)
			checks.push(
				`  return { success: false, error: { path, message: "Array must have at least ${this.options.minLength} elements", data: value } };`,
			)
			checks.push("}")
		}

		// Max length check
		if (this.options.maxLength !== undefined) {
			checks.push(`if (value.length > ${this.options.maxLength}) {`)
			checks.push(
				`  return { success: false, error: { path, message: "Array must have at most ${this.options.maxLength} elements", data: value } };`,
			)
			checks.push("}")
		}

		// Element validation loop
		checks.push("const result = [];")
		checks.push("for (let i = 0; i < value.length; i++) {")
		checks.push("  const elementPath = [...path, i.toString()];")
		checks.push(
			"  const elementResult = this.elementSchema.getCompiledParser()(value[i], elementPath);",
		)
		checks.push("  if (!elementResult.success) {")
		checks.push("    return elementResult;")
		checks.push("  }")
		checks.push("  result.push(elementResult.data);")
		checks.push("}")
		checks.push("return { success: true, data: result };")

		try {
			this._compiledParse = new Function(
				"value",
				"path",
				checks.join("\n"),
			) as (value: unknown, path: string[]) => ValidationResult<T[]>
		} catch (error) {
			// Fallback to regular parsing if compilation fails
			this._compiledParse = this._parse.bind(this)
		}
	}

	_parse(value: unknown, path: string[]): ValidationResult<T[]> {
		if (!Array.isArray(value)) {
			return this.error("Expected array, got " + typeof value, path, value)
		}

		if (
			this.options.minLength !== undefined &&
			value.length < this.options.minLength
		) {
			return this.error(
				`Array must have at least ${this.options.minLength} elements`,
				path,
				value,
			)
		}

		if (
			this.options.maxLength !== undefined &&
			value.length > this.options.maxLength
		) {
			return this.error(
				`Array must have at most ${this.options.maxLength} elements`,
				path,
				value,
			)
		}

		const result: T[] = []
		for (let i = 0; i < value.length; i++) {
			const elementPath = [...path, i.toString()]
			const elementResult = this.elementSchema._parse(value[i], elementPath)
			if (!elementResult.success) {
				return elementResult as ValidationError
			}
			result.push(elementResult.data)
		}

		return this.success(result)
	}

	min(length: number): ArraySchema<T> {
		return new ArraySchema(this.elementSchema, {
			...this.options,
			minLength: length,
			path: this.path,
		})
	}

	max(length: number): ArraySchema<T> {
		return new ArraySchema(this.elementSchema, {
			...this.options,
			maxLength: length,
			path: this.path,
		})
	}
}
