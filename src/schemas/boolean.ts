import { Schema } from "../core/schema.js"
import type { ValidationResult } from "../types/index.js"

export class BooleanSchema extends Schema<boolean> {
	private readonly strictTrue?: boolean
	private readonly strictFalse?: boolean

	constructor(
		options: {
			strictTrue?: boolean
			strictFalse?: boolean
			path?: string[]
		} = {},
	) {
		super("boolean", options.path)
		this.strictTrue = options.strictTrue
		this.strictFalse = options.strictFalse
	}

	compile(): void {
		const checks: string[] = []

		// Type check
		checks.push('if (typeof value !== "boolean") {')
		checks.push(
			'  return { success: false, error: { path, message: "Expected boolean, got " + typeof value, data: value } };',
		)
		checks.push("}")

		// Strict true check
		if (this.strictTrue) {
			checks.push("if (value !== true) {")
			checks.push(
				'  return { success: false, error: { path, message: "Boolean must be true", data: value } };',
			)
			checks.push("}")
		}

		// Strict false check
		if (this.strictFalse) {
			checks.push("if (value !== false) {")
			checks.push(
				'  return { success: false, error: { path, message: "Boolean must be false", data: value } };',
			)
			checks.push("}")
		}

		checks.push("return { success: true, data: value };")

		try {
			this._compiledParse = new Function(
				"value",
				"path",
				checks.join("\n"),
			) as (value: unknown, path: string[]) => ValidationResult<boolean>
		} catch (error) {
			// Fallback to regular parsing if compilation fails
			this._compiledParse = this._parse.bind(this)
		}
	}

	_parse(value: unknown, path: string[]): ValidationResult<boolean> {
		if (typeof value !== "boolean") {
			return this.error("Expected boolean, got " + typeof value, path, value)
		}

		if (this.strictTrue && value !== true) {
			return this.error("Boolean must be true", path, value)
		}

		if (this.strictFalse && value !== false) {
			return this.error("Boolean must be false", path, value)
		}

		return this.success(value)
	}

	true(): BooleanSchema {
		return new BooleanSchema({
			strictTrue: true,
			strictFalse: undefined,
			path: this.path,
		})
	}

	false(): BooleanSchema {
		return new BooleanSchema({
			strictTrue: undefined,
			strictFalse: true,
			path: this.path,
		})
	}
}
