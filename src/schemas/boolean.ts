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
