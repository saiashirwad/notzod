import { expect, test } from "bun:test"
import { array, literal, number, object, string, union } from "../src/index.js"

test("integration - complex nested schema", () => {
	const userSchema = object({
		name: string().min(2),
		age: number().min(18),
		type: union([literal("admin"), literal("user")]),
		tags: array(string()).min(1).max(5),
		profile: object({
			bio: string().optional(),
			website: string()
				.matches(/^https?:\/\//)
				.optional(),
		}),
		active: literal(true),
	})

	const validUser = {
		name: "John Doe",
		age: 25,
		type: "admin",
		tags: ["developer", "admin"],
		profile: {
			bio: "Software developer",
			website: "https://johndoe.com",
		},
		active: true,
	}

	expect(userSchema.parse(validUser)).toEqual(validUser)
})

test("integration - error handling with nested paths", () => {
	const schema = object({
		user: object({
			name: string().min(2),
			age: number().min(18),
		}),
		tags: array(string().min(3)),
	})

	// Test nested object validation error
	try {
		schema.parse({
			user: {
				name: "J",
				age: 25,
			},
			tags: ["tag1", "tag2"],
		})
		expect.unreachable()
	} catch (error) {
		expect(error.message).toContain("user.name")
		expect(error.message).toContain("String must be at least 2 characters")
	}

	// Test array element validation error
	try {
		schema.parse({
			user: {
				name: "John",
				age: 25,
			},
			tags: ["tag1", "x"],
		})
		expect.unreachable()
	} catch (error) {
		expect(error.message).toContain("1:")
		expect(error.message).toContain("String must be at least 3 characters")
	}
})

test("integration - chaining transformations", () => {
	const schema = string()
		.min(5)
		.max(20)
		.matches(/^[a-zA-Z0-9]+$/)
		.refine((value) => value.includes("test"), "Must contain 'test'")

	expect(schema.parse("test123")).toBe("test123")
	expect(schema.parse("mytest456")).toBe("mytest456")

	expect(() => schema.parse("tes")).toThrow(
		"String must be at least 5 characters",
	)
	expect(() => schema.parse("test@123")).toThrow(
		"String does not match pattern",
	)
	expect(() => schema.parse("hello123")).toThrow("Must contain 'test'")
})

test("integration - optional and nullable combinations", () => {
	const schema = object({
		required: string(),
		optional: string().optional(),
		nullable: string().nullable(),
		optionalNullable: string().optional().nullable(),
	})

	expect(
		schema.parse({
			required: "value",
			optional: "value",
			nullable: "value",
			optionalNullable: "value",
		}),
	).toEqual({
		required: "value",
		optional: "value",
		nullable: "value",
		optionalNullable: "value",
	})

	expect(
		schema.parse({
			required: "value",
			optional: undefined,
			nullable: null,
			optionalNullable: null,
		}),
	).toEqual({
		required: "value",
		optional: undefined,
		nullable: null,
		optionalNullable: null,
	})

	expect(
		schema.parse({
			required: "value",
			optional: undefined,
			nullable: null,
			optionalNullable: undefined,
		}),
	).toEqual({
		required: "value",
		optional: undefined,
		nullable: null,
		optionalNullable: undefined,
	})
})

test("integration - safeParse with complex schema", () => {
	const schema = object({
		name: string().min(2),
		age: number().min(18),
		tags: array(string()).min(1),
	})

	const validResult = schema.safeParse({
		name: "John",
		age: 25,
		tags: ["developer"],
	})

	expect(validResult.success).toBe(true)
	if (validResult.success) {
		expect(validResult.data).toEqual({
			name: "John",
			age: 25,
			tags: ["developer"],
		})
	}

	const invalidResult = schema.safeParse({
		name: "J",
		age: 25,
		tags: ["developer"],
	})

	expect(invalidResult.success).toBe(false)
	if (!invalidResult.success) {
		expect(invalidResult.error.path).toEqual(["name"])
		expect(invalidResult.error.message).toBe(
			"String must be at least 2 characters",
		)
	}
})

test("integration - pipe functionality", () => {
	const parseNumberString = string().pipe(
		string().refine((str) => !isNaN(Number(str)), "Must be a valid number"),
	)

	expect(parseNumberString.parse("123")).toBe("123")
	expect(() => parseNumberString.parse("abc")).toThrow("Must be a valid number")
	expect(() => parseNumberString.parse(123)).toThrow("Expected string")
})
