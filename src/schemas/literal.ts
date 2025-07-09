import { Schema } from "../core/schema.js"
import type { ValidationResult } from "../types/index.js"

export class LiteralSchema<
	T extends string | number | boolean,
> extends Schema<T> {
	constructor(
		private readonly value: T,
		path: string[] = [],
	) {
		super("literal", path)
	}

	compile(): void {
		const expectedValue = JSON.stringify(this.value)
		const checks: string[] = []
		
		checks.push(`if (value !== ${expectedValue}) {`)
		checks.push(`  return { success: false, error: { path, message: "Expected ${expectedValue}, got " + JSON.stringify(value), data: value } };`)
		checks.push('}')
		checks.push(`return { success: true, data: ${expectedValue} };`)

		try {
			this._compiledParse = new Function('value', 'path', checks.join('\n')) as (value: unknown, path: string[]) => ValidationResult<T>
		} catch (error) {
			// Fallback to regular parsing if compilation fails
			this._compiledParse = this._parse.bind(this)
		}
	}

	_parse(value: unknown, path: string[]): ValidationResult<T> {
		if (value !== this.value) {
			return this.error(
				`Expected ${JSON.stringify(this.value)}, got ${JSON.stringify(value)}`,
				path,
				value,
			)
		}
		return this.success(this.value)
	}
}
