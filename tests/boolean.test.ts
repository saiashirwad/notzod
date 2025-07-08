import { expect, test } from "bun:test"
import { boolean } from "../src/index.js"

test("boolean schema - basic validation", () => {
	const schema = boolean()

	expect(schema.parse(true)).toBe(true)
	expect(schema.parse(false)).toBe(false)
	expect(() => schema.parse("true")).toThrow()
	expect(() => schema.parse(1)).toThrow()
	expect(() => schema.parse(0)).toThrow()
	expect(() => schema.parse(null)).toThrow()
	expect(() => schema.parse(undefined)).toThrow()
})

test("boolean schema - strict true", () => {
	const schema = boolean().true()

	expect(schema.parse(true)).toBe(true)
	expect(() => schema.parse(false)).toThrow("Boolean must be true")
})

test("boolean schema - strict false", () => {
	const schema = boolean().false()

	expect(schema.parse(false)).toBe(false)
	expect(() => schema.parse(true)).toThrow("Boolean must be false")
})

test("boolean schema - safeParse", () => {
	const schema = boolean()

	const validResult = schema.safeParse(true)
	expect(validResult.success).toBe(true)
	if (validResult.success) {
		expect(validResult.data).toBe(true)
	}

	const invalidResult = schema.safeParse("true")
	expect(invalidResult.success).toBe(false)
	if (!invalidResult.success) {
		expect(invalidResult.error.message).toBe("Expected boolean, got string")
	}
})

test("boolean schema - optional", () => {
	const schema = boolean().optional()

	expect(schema.parse(true)).toBe(true)
	expect(schema.parse(false)).toBe(false)
	expect(schema.parse(undefined)).toBe(undefined)
	expect(() => schema.parse("true")).toThrow()
})

test("boolean schema - nullable", () => {
	const schema = boolean().nullable()

	expect(schema.parse(true)).toBe(true)
	expect(schema.parse(false)).toBe(false)
	expect(schema.parse(null)).toBe(null)
	expect(() => schema.parse("true")).toThrow()
})

test("boolean schema - refine", () => {
	const schema = boolean().refine((value) => value === true, "Must be true")

	expect(schema.parse(true)).toBe(true)
	expect(() => schema.parse(false)).toThrow("Must be true")
})
