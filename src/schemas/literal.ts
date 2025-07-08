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
