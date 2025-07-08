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

	_parse(value: unknown, path: string[]): ValidationResult<T> {
		const errors: ValidationError[] = []

		for (const schema of this.schemas) {
			const result = schema._parse(value, path)
			if (result.success) {
				return result as ValidationSuccess<T>
			}
			errors.push(result)
		}

		return this.error(
			"Value does not match any schema in union: " +
				errors.map((e) => e.error.message).join("; "),
			path,
			value,
		)
	}
}
