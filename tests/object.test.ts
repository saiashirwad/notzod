import { expect, test } from "bun:test"
import { boolean, number, object, string } from "../src/index.js"

test("object schema - basic validation", () => {
	const schema = object({
		name: string(),
		age: number(),
	})

	expect(schema.parse({ name: "John", age: 30 })).toEqual({
		name: "John",
		age: 30,
	})
	expect(() => schema.parse("not an object")).toThrow()
	expect(() => schema.parse(null)).toThrow()
	expect(() => schema.parse(undefined)).toThrow()
	expect(() => schema.parse([])).toThrow()
})

test("object schema - property validation", () => {
	const schema = object({
		name: string(),
		age: number(),
		active: boolean(),
	})

	expect(schema.parse({ name: "John", age: 30, active: true })).toEqual({
		name: "John",
		age: 30,
		active: true,
	})

	expect(() => schema.parse({ name: 123, age: 30, active: true })).toThrow()
	expect(() =>
		schema.parse({ name: "John", age: "30", active: true }),
	).toThrow()
	expect(() =>
		schema.parse({ name: "John", age: 30, active: "true" }),
	).toThrow()
})

test("object schema - missing properties", () => {
	const schema = object({
		name: string(),
		age: number(),
	})

	expect(() => schema.parse({ name: "John" })).toThrow()
	expect(() => schema.parse({ age: 30 })).toThrow()
	expect(() => schema.parse({})).toThrow()
})

test("object schema - extra properties ignored", () => {
	const schema = object({
		name: string(),
		age: number(),
	})

	// Extra properties should be ignored
	expect(schema.parse({ name: "John", age: 30, extra: "ignored" })).toEqual({
		name: "John",
		age: 30,
	})
})

test("object schema - nested objects", () => {
	const schema = object({
		user: object({
			name: string(),
			age: number(),
		}),
		active: boolean(),
	})

	expect(
		schema.parse({
			user: { name: "John", age: 30 },
			active: true,
		}),
	).toEqual({
		user: { name: "John", age: 30 },
		active: true,
	})

	expect(() =>
		schema.parse({
			user: { name: "John", age: "30" },
			active: true,
		}),
	).toThrow()
})

test("object schema - with property constraints", () => {
	const schema = object({
		name: string().min(2),
		age: number().min(18),
	})

	expect(schema.parse({ name: "John", age: 30 })).toEqual({
		name: "John",
		age: 30,
	})
	expect(() => schema.parse({ name: "J", age: 30 })).toThrow(
		"String must be at least 2 characters",
	)
	expect(() => schema.parse({ name: "John", age: 17 })).toThrow(
		"Number must be at least 18",
	)
})

test("object schema - safeParse", () => {
	const schema = object({
		name: string(),
		age: number(),
	})

	const validResult = schema.safeParse({ name: "John", age: 30 })
	expect(validResult.success).toBe(true)
	if (validResult.success) {
		expect(validResult.data).toEqual({ name: "John", age: 30 })
	}

	const invalidResult = schema.safeParse({ name: "John", age: "30" })
	expect(invalidResult.success).toBe(false)
	if (!invalidResult.success) {
		expect(invalidResult.error.message).toBe("Expected number, got string")
	}
})

test("object schema - optional", () => {
	const schema = object({
		name: string(),
		age: number(),
	}).optional()

	expect(schema.parse({ name: "John", age: 30 })).toEqual({
		name: "John",
		age: 30,
	})
	expect(schema.parse(undefined)).toBe(undefined)
	expect(() => schema.parse("not an object")).toThrow()
})

test("object schema - nullable", () => {
	const schema = object({
		name: string(),
		age: number(),
	}).nullable()

	expect(schema.parse({ name: "John", age: 30 })).toEqual({
		name: "John",
		age: 30,
	})
	expect(schema.parse(null)).toBe(null)
	expect(() => schema.parse("not an object")).toThrow()
})

test("object schema - refine", () => {
	const schema = object({
		name: string(),
		age: number(),
	}).refine((obj) => obj.age >= 18, "Must be at least 18 years old")

	expect(schema.parse({ name: "John", age: 30 })).toEqual({
		name: "John",
		age: 30,
	})
	expect(() => schema.parse({ name: "John", age: 17 })).toThrow(
		"Must be at least 18 years old",
	)
})

test("object schema - extend", () => {
	const baseSchema = object({
		name: string(),
		age: number(),
	})

	const extendedSchema = baseSchema.extend({
		email: string(),
	})

	expect(
		extendedSchema.parse({ name: "John", age: 30, email: "john@example.com" }),
	).toEqual({
		name: "John",
		age: 30,
		email: "john@example.com",
	})

	expect(() => extendedSchema.parse({ name: "John", age: 30 })).toThrow()
})
