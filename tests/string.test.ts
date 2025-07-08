import { expect, test } from "bun:test"
import { StringSchema, string } from "../src/index.js"

test("string schema - basic validation", () => {
	const schema = string()

	expect(schema.parse("hello")).toBe("hello")
	expect(schema.parse("")).toBe("")
	expect(() => schema.parse(123)).toThrow()
	expect(() => schema.parse(null)).toThrow()
	expect(() => schema.parse(undefined)).toThrow()
})

test("string schema - with minimum length", () => {
	const schema = string().min(3)

	expect(schema.parse("hello")).toBe("hello")
	expect(schema.parse("abc")).toBe("abc")
	expect(() => schema.parse("ab")).toThrow(
		"String must be at least 3 characters",
	)
})

test("string schema - with maximum length", () => {
	const schema = string().max(5)

	expect(schema.parse("hello")).toBe("hello")
	expect(schema.parse("hi")).toBe("hi")
	expect(() => schema.parse("hello world")).toThrow(
		"String must be at most 5 characters",
	)
})

test("string schema - with pattern", () => {
	const emailSchema = string().matches(/^[\w.-]+@[\w.-]+\.\w+$/)

	expect(emailSchema.parse("test@example.com")).toBe("test@example.com")
	expect(() => emailSchema.parse("invalid-email")).toThrow(
		"String does not match pattern",
	)
})

test("string schema - chaining constraints", () => {
	const schema = string()
		.min(3)
		.max(10)
		.matches(/^[a-zA-Z]+$/)

	expect(schema.parse("hello")).toBe("hello")
	expect(() => schema.parse("hi")).toThrow(
		"String must be at least 3 characters",
	)
	expect(() => schema.parse("hello world")).toThrow(
		"String must be at most 10 characters",
	)
	expect(() => schema.parse("hello123")).toThrow(
		"String does not match pattern",
	)
})

test("string schema - safeParse", () => {
	const schema = string().min(3)

	const validResult = schema.safeParse("hello")
	expect(validResult.success).toBe(true)
	if (validResult.success) {
		expect(validResult.data).toBe("hello")
	}

	const invalidResult = schema.safeParse("hi")
	expect(invalidResult.success).toBe(false)
	if (!invalidResult.success) {
		expect(invalidResult.error.message).toBe(
			"String must be at least 3 characters",
		)
	}
})

test("string schema - optional", () => {
	const schema = string().optional()

	expect(schema.parse("hello")).toBe("hello")
	expect(schema.parse(undefined)).toBe(undefined)
	expect(() => schema.parse(123)).toThrow()
})

test("string schema - nullable", () => {
	const schema = string().nullable()

	expect(schema.parse("hello")).toBe("hello")
	expect(schema.parse(null)).toBe(null)
	expect(() => schema.parse(123)).toThrow()
})

test("string schema - refine", () => {
	const schema = string().refine(
		(value) => value.startsWith("hello"),
		"Must start with 'hello'",
	)

	expect(schema.parse("hello world")).toBe("hello world")
	expect(() => schema.parse("hi there")).toThrow("Must start with 'hello'")
})
