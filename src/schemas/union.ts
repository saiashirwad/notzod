import { Schema } from "../core/schema.js"
import type {
	ValidationError,
	ValidationResult,
	ValidationSuccess,
} from "../types/index.js"

export class UnionSchema<T> extends Schema<T> {
	constructor(
		private readonly schemas: Schema<any>[],
		path: string[] = [],
	) {
		super("union", path)
	}

	compile(): void {
		// Ensure all schemas are compiled
		for (const schema of this.schemas) {
			schema.compile()
		}

		const checks: string[] = []

		checks.push("const errors = [];")
		checks.push("for (let i = 0; i < this.schemas.length; i++) {")
		checks.push(
			"  const result = this.schemas[i].getCompiledParser()(value, path);",
		)
		checks.push("  if (result.success) {")
		checks.push("    return result;")
		checks.push("  }")
		checks.push("  errors.push(result);")
		checks.push("}")
		checks.push(
			'return { success: false, error: { path, message: "Value does not match any schema in union: " + errors.map(e => e.error.message).join("; "), data: value } };',
		)

		try {
			this._compiledParse = new Function(
				"value",
				"path",
				checks.join("\n"),
			) as (value: unknown, path: string[]) => ValidationResult<T>
		} catch (error) {
			// Fallback to regular parsing if compilation fails
			this._compiledParse = this._parse.bind(this)
		}
	}

	_parse(value: unknown, path: string[]): ValidationResult<T> {
		const errors: ValidationError[] = []

		for (const schema of this.schemas) {
			const result = schema._parse(value, path)
			if (result.success) {
				return result as ValidationSuccess<T>
			}
			errors.push(result as ValidationError)
		}

		return this.error(
			"Value does not match any schema in union: " +
				errors.map((e) => e.error.message).join("; "),
			path,
			value,
		)
	}
}
