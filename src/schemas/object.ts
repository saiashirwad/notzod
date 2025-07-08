import { Schema } from "../core/schema.js"
import type { ValidationResult } from "../types/index.js"

export class ObjectSchema<T extends Record<string, unknown>> extends Schema<T> {
	constructor(
		private readonly shape: { [K in keyof T]: Schema<T[K]> },
		path: string[] = [],
	) {
		super("object", path)
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
				return fieldResult
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
