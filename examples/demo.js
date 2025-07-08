import { string, number, boolean, array, object, literal, union } from "../src/index.js"

// Basic usage examples
console.log("=== Basic Schema Examples ===")

// String schema
const nameSchema = string().min(2).max(50)
console.log("Valid name:", nameSchema.parse("John Doe"))

// Number schema
const ageSchema = number().min(0).max(120)
console.log("Valid age:", ageSchema.parse(25))

// Boolean schema
const activeSchema = boolean()
console.log("Valid active:", activeSchema.parse(true))

// Array schema
const tagsSchema = array(string().min(2)).min(1).max(5)
console.log("Valid tags:", tagsSchema.parse(["developer", "admin"]))

// Object schema
const userSchema = object({
	name: string().min(2),
	age: number().min(18),
	email: string().matches(/^[\w.-]+@[\w.-]+\.\w+$/),
	role: union([literal("admin"), literal("user"), literal("guest")]),
	tags: array(string()).min(1).max(10),
	profile: object({
		bio: string().optional(),
		website: string().matches(/^https?:\/\//).optional(),
	}),
	active: boolean(),
})

console.log("\n=== Complex Schema Example ===")
const validUser = {
	name: "John Doe",
	age: 25,
	email: "john@example.com",
	role: "admin",
	tags: ["developer", "admin"],
	profile: {
		bio: "Software developer",
		website: "https://johndoe.com",
	},
	active: true,
}

console.log("Valid user:", userSchema.parse(validUser))

// SafeParse example
console.log("\n=== SafeParse Example ===")
const result = userSchema.safeParse({
	name: "J", // Too short
	age: 25,
	email: "john@example.com",
	role: "admin",
	tags: ["developer"],
	profile: {},
	active: true,
})

if (result.success) {
	console.log("Parsed successfully:", result.data)
} else {
	console.log("Validation failed:", result.error)
}

// Refinement example
console.log("\n=== Refinement Example ===")
const passwordSchema = string()
	.min(8)
	.refine((value) => /[A-Z]/.test(value), "Must contain uppercase letter")
	.refine((value) => /[a-z]/.test(value), "Must contain lowercase letter")
	.refine((value) => /\d/.test(value), "Must contain number")

try {
	console.log("Valid password:", passwordSchema.parse("MyPass123"))
} catch (error) {
	console.log("Password validation error:", error.message)
}

try {
	passwordSchema.parse("mypass123") // Missing uppercase
} catch (error) {
	console.log("Password validation error:", error.message)
}

// Optional and nullable
console.log("\n=== Optional and Nullable Examples ===")
const optionalSchema = string().optional()
console.log("Optional string (undefined):", optionalSchema.parse(undefined))
console.log("Optional string (value):", optionalSchema.parse("hello"))

const nullableSchema = string().nullable()
console.log("Nullable string (null):", nullableSchema.parse(null))
console.log("Nullable string (value):", nullableSchema.parse("hello"))

// Pipe example
console.log("\n=== Pipe Example ===")
const trimmedString = string().pipe(
	string().refine((str) => str.trim().length > 0, "Must not be empty after trimming")
)

console.log("Pipe validation:", trimmedString.parse("  hello  "))