import { Schema } from "../core/schema.js"
import type { ValidationResult } from "../types/index.js"

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
				return elementResult
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
