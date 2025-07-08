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
