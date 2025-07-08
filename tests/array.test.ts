import { expect, test } from "bun:test"
import { array, number, string } from "../src/index.js"

test("array schema - basic validation", () => {
	const schema = array(string())

	expect(schema.parse([])).toEqual([])
	expect(schema.parse(["hello", "world"])).toEqual(["hello", "world"])
	expect(() => schema.parse("not an array")).toThrow()
	expect(() => schema.parse(null)).toThrow()
	expect(() => schema.parse(undefined)).toThrow()
})

test("array schema - element validation", () => {
	const schema = array(string())

	expect(schema.parse(["hello", "world"])).toEqual(["hello", "world"])
	expect(() => schema.parse(["hello", 123])).toThrow()
	expect(() => schema.parse([123, "world"])).toThrow()
})

test("array schema - with minimum length", () => {
	const schema = array(string()).min(2)

	expect(schema.parse(["hello", "world"])).toEqual(["hello", "world"])
	expect(schema.parse(["hello", "world", "!"])).toEqual(["hello", "world", "!"])
	expect(() => schema.parse(["hello"])).toThrow(
		"Array must have at least 2 elements",
	)
	expect(() => schema.parse([])).toThrow("Array must have at least 2 elements")
})

test("array schema - with maximum length", () => {
	const schema = array(string()).max(2)

	expect(schema.parse([])).toEqual([])
	expect(schema.parse(["hello"])).toEqual(["hello"])
	expect(schema.parse(["hello", "world"])).toEqual(["hello", "world"])
	expect(() => schema.parse(["hello", "world", "!"])).toThrow(
		"Array must have at most 2 elements",
	)
})

test("array schema - chaining constraints", () => {
	const schema = array(string()).min(1).max(3)

	expect(schema.parse(["hello"])).toEqual(["hello"])
	expect(schema.parse(["hello", "world"])).toEqual(["hello", "world"])
	expect(schema.parse(["hello", "world", "!"])).toEqual(["hello", "world", "!"])
	expect(() => schema.parse([])).toThrow("Array must have at least 1 elements")
	expect(() => schema.parse(["a", "b", "c", "d"])).toThrow(
		"Array must have at most 3 elements",
	)
})

test("array schema - complex elements", () => {
	const schema = array(number().min(0))

	expect(schema.parse([1, 2, 3])).toEqual([1, 2, 3])
	expect(() => schema.parse([1, -1, 3])).toThrow("Number must be at least 0")
})

test("array schema - safeParse", () => {
	const schema = array(string()).min(1)

	const validResult = schema.safeParse(["hello"])
	expect(validResult.success).toBe(true)
	if (validResult.success) {
		expect(validResult.data).toEqual(["hello"])
	}

	const invalidResult = schema.safeParse([])
	expect(invalidResult.success).toBe(false)
	if (!invalidResult.success) {
		expect(invalidResult.error.message).toBe(
			"Array must have at least 1 elements",
		)
	}
})

test("array schema - optional", () => {
	const schema = array(string()).optional()

	expect(schema.parse(["hello"])).toEqual(["hello"])
	expect(schema.parse(undefined)).toBe(undefined)
	expect(() => schema.parse("not an array")).toThrow()
})

test("array schema - nullable", () => {
	const schema = array(string()).nullable()

	expect(schema.parse(["hello"])).toEqual(["hello"])
	expect(schema.parse(null)).toBe(null)
	expect(() => schema.parse("not an array")).toThrow()
})

test("array schema - refine", () => {
	const schema = array(string()).refine(
		(arr) => arr.length > 0,
		"Array must not be empty",
	)

	expect(schema.parse(["hello"])).toEqual(["hello"])
	expect(() => schema.parse([])).toThrow("Array must not be empty")
})
