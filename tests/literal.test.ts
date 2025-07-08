import { expect, test } from "bun:test"
import { literal } from "../src/index.js"

test("literal schema - string literal", () => {
	const schema = literal("hello")

	expect(schema.parse("hello")).toBe("hello")
	expect(() => schema.parse("world")).toThrow('Expected "hello", got "world"')
	expect(() => schema.parse(123)).toThrow('Expected "hello", got 123')
	expect(() => schema.parse(null)).toThrow('Expected "hello", got null')
	expect(() => schema.parse(undefined)).toThrow(
		'Expected "hello", got undefined',
	)
})

test("literal schema - number literal", () => {
	const schema = literal(42)

	expect(schema.parse(42)).toBe(42)
	expect(() => schema.parse(43)).toThrow("Expected 42, got 43")
	expect(() => schema.parse("42")).toThrow('Expected 42, got "42"')
})

test("literal schema - boolean literal", () => {
	const trueSchema = literal(true)
	const falseSchema = literal(false)

	expect(trueSchema.parse(true)).toBe(true)
	expect(() => trueSchema.parse(false)).toThrow("Expected true, got false")
	expect(() => trueSchema.parse("true")).toThrow('Expected true, got "true"')

	expect(falseSchema.parse(false)).toBe(false)
	expect(() => falseSchema.parse(true)).toThrow("Expected false, got true")
	expect(() => falseSchema.parse("false")).toThrow(
		'Expected false, got "false"',
	)
})

test("literal schema - safeParse", () => {
	const schema = literal("hello")

	const validResult = schema.safeParse("hello")
	expect(validResult.success).toBe(true)
	if (validResult.success) {
		expect(validResult.data).toBe("hello")
	}

	const invalidResult = schema.safeParse("world")
	expect(invalidResult.success).toBe(false)
	if (!invalidResult.success) {
		expect(invalidResult.error.message).toBe('Expected "hello", got "world"')
	}
})

test("literal schema - optional", () => {
	const schema = literal("hello").optional()

	expect(schema.parse("hello")).toBe("hello")
	expect(schema.parse(undefined)).toBe(undefined)
	expect(() => schema.parse("world")).toThrow()
})

test("literal schema - nullable", () => {
	const schema = literal("hello").nullable()

	expect(schema.parse("hello")).toBe("hello")
	expect(schema.parse(null)).toBe(null)
	expect(() => schema.parse("world")).toThrow()
})

test("literal schema - refine", () => {
	const schema = literal("hello").refine(
		(value) => value.length > 0,
		"Must not be empty",
	)

	expect(schema.parse("hello")).toBe("hello")
	// Since literal always validates to the exact value, this refine will always pass for valid literals
})
