import { Schema } from "../core/schema.js"
import type { ValidationResult, ValidationError } from "../types/index.js"

export class ObjectSchema<T extends Record<string, unknown>> extends Schema<T> {
	constructor(
		private readonly shape: { [K in keyof T]: Schema<T[K]> },
		path: string[] = [],
	) {
		super("object", path)
	}

	compile(): void {
		// Ensure all field schemas are compiled
		for (const key in this.shape) {
			this.shape[key].compile()
		}
		
		const checks: string[] = []
		
		// Type check
		checks.push('if (typeof value !== "object" || value === null) {')
		checks.push('  return { success: false, error: { path, message: "Expected object, got " + (value === null ? "null" : typeof value), data: value } };')
		checks.push('}')

		// Field validation
		checks.push('const result = {};')
		for (const key in this.shape) {
			checks.push(`{`)
			checks.push(`  const fieldPath = [...path, "${key}"];`)
			checks.push(`  const fieldValue = value["${key}"];`)
			checks.push(`  const fieldResult = this.shape["${key}"].getCompiledParser()(fieldValue, fieldPath);`)
			checks.push(`  if (!fieldResult.success) {`)
			checks.push(`    return fieldResult;`)
			checks.push(`  }`)
			checks.push(`  result["${key}"] = fieldResult.data;`)
			checks.push(`}`)
		}
		checks.push('return { success: true, data: result };')

		try {
			this._compiledParse = new Function('value', 'path', checks.join('\n')) as (value: unknown, path: string[]) => ValidationResult<T>
		} catch (error) {
			// Fallback to regular parsing if compilation fails
			this._compiledParse = this._parse.bind(this)
		}
	}

	_parse(value: unknown, path: string[]): ValidationResult<T> {
		if (typeof value !== "object" || value === null) {
			return this.error(
				"Expected object, got " + (value === null ? "null" : typeof value),
				path,
				value,
			)
		}

		const result: Record<string, unknown> = {}
		for (const key in this.shape) {
			const fieldPath = [...path, key]
			const fieldSchema = this.shape[key]
			const fieldValue = (value as Record<string, unknown>)[key]

			const fieldResult = fieldSchema._parse(fieldValue, fieldPath)
			if (!fieldResult.success) {
				return fieldResult as ValidationError
			}

			result[key] = fieldResult.data
		}

		return this.success(result as T)
	}

	extend<U extends Record<string, unknown>>(
		shape: { [K in keyof U]: Schema<U[K]> },
	): ObjectSchema<T & U> {
		return new ObjectSchema<T & U>(
			{ ...this.shape, ...shape } as any,
			this.path,
		)
	}
}
