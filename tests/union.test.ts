import { expect, test } from "bun:test"
import { literal, number, string, union } from "../src/index.js"

test("union schema - basic validation", () => {
	const schema = union([string(), number()])

	expect(schema.parse("hello")).toBe("hello")
	expect(schema.parse(123)).toBe(123)
	expect(() => schema.parse(true)).toThrow(
		"Value does not match any schema in union",
	)
	expect(() => schema.parse(null)).toThrow(
		"Value does not match any schema in union",
	)
	expect(() => schema.parse(undefined)).toThrow(
		"Value does not match any schema in union",
	)
})

test("union schema - literal union", () => {
	const schema = union([literal("admin"), literal("user"), literal("guest")])

	expect(schema.parse("admin")).toBe("admin")
	expect(schema.parse("user")).toBe("user")
	expect(schema.parse("guest")).toBe("guest")
	expect(() => schema.parse("moderator")).toThrow(
		"Value does not match any schema in union",
	)
})

test("union schema - complex schemas", () => {
	const schema = union([string().min(5), number().min(100)])

	expect(schema.parse("hello")).toBe("hello")
	expect(schema.parse(100)).toBe(100)
	expect(() => schema.parse("hi")).toThrow(
		"Value does not match any schema in union",
	)
	expect(() => schema.parse(50)).toThrow(
		"Value does not match any schema in union",
	)
})

test("union schema - first match wins", () => {
	const schema = union([string(), number()])

	// Should match string schema first
	expect(schema.parse("123")).toBe("123")
	expect(schema.parse(123)).toBe(123)
})

test("union schema - with constraints", () => {
	const schema = union([string().min(3), number().positive()])

	expect(schema.parse("hello")).toBe("hello")
	expect(schema.parse(5)).toBe(5)
	expect(() => schema.parse("hi")).toThrow(
		"Value does not match any schema in union",
	)
	expect(() => schema.parse(-5)).toThrow(
		"Value does not match any schema in union",
	)
})

test("union schema - safeParse", () => {
	const schema = union([string(), number()])

	const validResult = schema.safeParse("hello")
	expect(validResult.success).toBe(true)
	if (validResult.success) {
		expect(validResult.data).toBe("hello")
	}

	const invalidResult = schema.safeParse(true)
	expect(invalidResult.success).toBe(false)
	if (!invalidResult.success) {
		expect(invalidResult.error.message).toContain(
			"Value does not match any schema in union",
		)
	}
})

test("union schema - optional", () => {
	const schema = union([string(), number()]).optional()

	expect(schema.parse("hello")).toBe("hello")
	expect(schema.parse(123)).toBe(123)
	expect(schema.parse(undefined)).toBe(undefined)
	expect(() => schema.parse(true)).toThrow()
})

test("union schema - nullable", () => {
	const schema = union([string(), number()]).nullable()

	expect(schema.parse("hello")).toBe("hello")
	expect(schema.parse(123)).toBe(123)
	expect(schema.parse(null)).toBe(null)
	expect(() => schema.parse(true)).toThrow()
})

test("union schema - refine", () => {
	const schema = union([string(), number()]).refine(
		(value) => (typeof value === "string" ? value.length > 0 : value > 0),
		"Must be non-empty string or positive number",
	)

	expect(schema.parse("hello")).toBe("hello")
	expect(schema.parse(5)).toBe(5)
	expect(() => schema.parse("")).toThrow(
		"Must be non-empty string or positive number",
	)
	expect(() => schema.parse(-5)).toThrow(
		"Must be non-empty string or positive number",
	)
})

test("union schema - empty union", () => {
	const schema = union([])

	expect(() => schema.parse("anything")).toThrow(
		"Value does not match any schema in union",
	)
})
