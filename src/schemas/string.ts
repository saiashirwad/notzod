import { Schema } from "../core/schema.js"
import type { ValidationResult } from "../types/index.js"

export class StringSchema extends Schema<string> {
	private readonly minLength?: number
	private readonly maxLength?: number
	private readonly pattern?: RegExp

	constructor(
		options: {
			minLength?: number
			maxLength?: number
			pattern?: RegExp
			path?: string[]
		} = {},
	) {
		super("string", options.path)
		this.minLength = options.minLength
		this.maxLength = options.maxLength
		this.pattern = options.pattern
	}

	compile(): void {
		const checks: string[] = []

		// Type check
		checks.push('if (typeof value !== "string") {')
		checks.push(
			'  return { success: false, error: { path, message: "Expected string, got " + typeof value, data: value } };',
		)
		checks.push("}")

		// Min length check
		if (this.minLength !== undefined) {
			checks.push(`if (value.length < ${this.minLength}) {`)
			checks.push(
				`  return { success: false, error: { path, message: "String must be at least ${this.minLength} characters", data: value } };`,
			)
			checks.push("}")
		}

		// Max length check
		if (this.maxLength !== undefined) {
			checks.push(`if (value.length > ${this.maxLength}) {`)
			checks.push(
				`  return { success: false, error: { path, message: "String must be at most ${this.maxLength} characters", data: value } };`,
			)
			checks.push("}")
		}

		// Pattern check
		if (this.pattern !== undefined) {
			// We need to serialize the regex in a way that can be reconstructed
			const regexStr = this.pattern.toString()
			checks.push(`if (!${regexStr}.test(value)) {`)
			checks.push(
				'  return { success: false, error: { path, message: "String does not match pattern", data: value } };',
			)
			checks.push("}")
		}

		checks.push("return { success: true, data: value };")

		try {
			this._compiledParse = new Function(
				"value",
				"path",
				checks.join("\n"),
			) as (value: unknown, path: string[]) => ValidationResult<string>
		} catch (error) {
			// Fallback to regular parsing if compilation fails
			this._compiledParse = this._parse.bind(this)
		}
	}

	_parse(value: unknown, path: string[]): ValidationResult<string> {
		if (typeof value !== "string") {
			return this.error("Expected string, got " + typeof value, path, value)
		}

		if (this.minLength !== undefined && value.length < this.minLength) {
			return this.error(
				`String must be at least ${this.minLength} characters`,
				path,
				value,
			)
		}

		if (this.maxLength !== undefined && value.length > this.maxLength) {
			return this.error(
				`String must be at most ${this.maxLength} characters`,
				path,
				value,
			)
		}

		if (this.pattern !== undefined && !this.pattern.test(value)) {
			return this.error("String does not match pattern", path, value)
		}

		return this.success(value)
	}

	min(length: number): StringSchema {
		return new StringSchema({
			minLength: length,
			maxLength: this.maxLength,
			pattern: this.pattern,
			path: this.path,
		})
	}

	max(length: number): StringSchema {
		return new StringSchema({
			minLength: this.minLength,
			maxLength: length,
			pattern: this.pattern,
			path: this.path,
		})
	}

	matches(pattern: RegExp): StringSchema {
		return new StringSchema({
			minLength: this.minLength,
			maxLength: this.maxLength,
			pattern,
			path: this.path,
		})
	}
}
