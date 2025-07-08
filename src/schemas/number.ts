import { Schema } from "../core/schema.js"
import type { ValidationResult } from "../types/index.js"

export class NumberSchema extends Schema<number> {
	private readonly _min?: number
	private readonly _max?: number
	private readonly isPositive?: boolean
	private readonly isNegative?: boolean

	constructor(
		options: {
			min?: number
			max?: number
			isPositive?: boolean
			isNegative?: boolean
			path?: string[]
		} = {},
	) {
		super("number", options.path)
		this._min = options.min
		this._max = options.max
		this.isPositive = options.isPositive
		this.isNegative = options.isNegative
	}

	_parse(value: unknown, path: string[]): ValidationResult<number> {
		if (typeof value !== "number" || Number.isNaN(value)) {
			return this.error("Expected number, got " + typeof value, path, value)
		}

		if (this._min !== undefined && value < this._min) {
			return this.error(`Number must be at least ${this._min}`, path, value)
		}

		if (this._max !== undefined && value > this._max) {
			return this.error(`Number must be at most ${this._max}`, path, value)
		}

		if (this.isPositive && value <= 0) {
			return this.error("Number must be positive", path, value)
		}

		if (this.isNegative && value >= 0) {
			return this.error("Number must be negative", path, value)
		}

		return this.success(value)
	}

	min(val: number): NumberSchema {
		return new NumberSchema({
			min: val,
			max: this._max,
			isPositive: this.isPositive,
			isNegative: this.isNegative,
			path: this.path,
		})
	}

	max(val: number): NumberSchema {
		return new NumberSchema({
			min: this._min,
			max: val,
			isPositive: this.isPositive,
			isNegative: this.isNegative,
			path: this.path,
		})
	}

	positive(): NumberSchema {
		return new NumberSchema({
			min: this._min,
			max: this._max,
			isPositive: true,
			isNegative: false,
			path: this.path,
		})
	}

	negative(): NumberSchema {
		return new NumberSchema({
			min: this._min,
			max: this._max,
			isPositive: false,
			isNegative: true,
			path: this.path,
		})
	}
}
