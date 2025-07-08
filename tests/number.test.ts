import { expect, test } from "bun:test"
import { number } from "../src/index.js"

test("number schema - basic validation", () => {
	const schema = number()

	expect(schema.parse(123)).toBe(123)
	expect(schema.parse(0)).toBe(0)
	expect(schema.parse(-456)).toBe(-456)
	expect(schema.parse(3.14)).toBe(3.14)
	expect(() => schema.parse("123")).toThrow()
	expect(() => schema.parse(null)).toThrow()
	expect(() => schema.parse(undefined)).toThrow()
	expect(() => schema.parse(NaN)).toThrow()
})

test("number schema - with minimum", () => {
	const schema = number().min(10)

	expect(schema.parse(10)).toBe(10)
	expect(schema.parse(100)).toBe(100)
	expect(() => schema.parse(9)).toThrow("Number must be at least 10")
})

test("number schema - with maximum", () => {
	const schema = number().max(100)

	expect(schema.parse(100)).toBe(100)
	expect(schema.parse(50)).toBe(50)
	expect(() => schema.parse(101)).toThrow("Number must be at most 100")
})

test("number schema - positive", () => {
	const schema = number().positive()

	expect(schema.parse(1)).toBe(1)
	expect(schema.parse(0.1)).toBe(0.1)
	expect(() => schema.parse(0)).toThrow("Number must be positive")
	expect(() => schema.parse(-1)).toThrow("Number must be positive")
})

test("number schema - negative", () => {
	const schema = number().negative()

	expect(schema.parse(-1)).toBe(-1)
	expect(schema.parse(-0.1)).toBe(-0.1)
	expect(() => schema.parse(0)).toThrow("Number must be negative")
	expect(() => schema.parse(1)).toThrow("Number must be negative")
})

test("number schema - chaining constraints", () => {
	const schema = number().min(10).max(100).positive()

	expect(schema.parse(50)).toBe(50)
	expect(() => schema.parse(5)).toThrow("Number must be at least 10")
	expect(() => schema.parse(150)).toThrow("Number must be at most 100")
})

test("number schema - safeParse", () => {
	const schema = number().min(10)

	const validResult = schema.safeParse(20)
	expect(validResult.success).toBe(true)
	if (validResult.success) {
		expect(validResult.data).toBe(20)
	}

	const invalidResult = schema.safeParse(5)
	expect(invalidResult.success).toBe(false)
	if (!invalidResult.success) {
		expect(invalidResult.error.message).toBe("Number must be at least 10")
	}
})

test("number schema - optional", () => {
	const schema = number().optional()

	expect(schema.parse(123)).toBe(123)
	expect(schema.parse(undefined)).toBe(undefined)
	expect(() => schema.parse("123")).toThrow()
})

test("number schema - nullable", () => {
	const schema = number().nullable()

	expect(schema.parse(123)).toBe(123)
	expect(schema.parse(null)).toBe(null)
	expect(() => schema.parse("123")).toThrow()
})

test("number schema - refine", () => {
	const schema = number().refine((value) => value % 2 === 0, "Must be even")

	expect(schema.parse(2)).toBe(2)
	expect(schema.parse(4)).toBe(4)
	expect(() => schema.parse(3)).toThrow("Must be even")
})
