# NotZod

A TypeScript-first schema validation library with static type inference, inspired by Zod.

## Features

- **TypeScript-first**: Built with TypeScript for excellent type safety and inference
- **Schema validation**: Validate strings, numbers, booleans, arrays, objects, literals, and unions
- **Chaining API**: Fluent API for building complex validation rules
- **Error handling**: Detailed error messages with path information
- **Optional/Nullable**: Support for optional and nullable fields
- **Refinement**: Custom validation functions for complex business logic
- **Pipe transformations**: Chain multiple schemas together
- **SafeParse**: Non-throwing validation with result objects

## Installation

```bash
bun add notzod
# or
npm install notzod
```

## Quick Start

```typescript
import { string, number, object, array, literal, union } from 'notzod'

// Basic validation
const name = string().min(2).max(50)
console.log(name.parse("John")) // "John"

// Object validation
const user = object({
  name: string().min(2),
  age: number().min(18),
  email: string().matches(/^[\w.-]+@[\w.-]+\.\w+$/),
  role: union([literal("admin"), literal("user")]),
  tags: array(string()).min(1).max(5)
})

const validUser = user.parse({
  name: "John Doe",
  age: 25,
  email: "john@example.com",
  role: "admin",
  tags: ["developer"]
})
```

## API Reference

### String Schema

```typescript
string()
  .min(5)              // minimum length
  .max(100)            // maximum length
  .matches(/^[a-z]+$/) // regex pattern
```

### Number Schema

```typescript
number()
  .min(0)        // minimum value
  .max(100)      // maximum value
  .positive()    // must be > 0
  .negative()    // must be < 0
```

### Boolean Schema

```typescript
boolean()
  .true()   // must be true
  .false()  // must be false
```

### Array Schema

```typescript
array(string())
  .min(1)   // minimum length
  .max(10)  // maximum length
```

### Object Schema

```typescript
object({
  name: string(),
  age: number()
})
```

### Union Schema

```typescript
union([string(), number()])
union([literal("admin"), literal("user")])
```

### Literal Schema

```typescript
literal("hello")  // must be exactly "hello"
literal(42)       // must be exactly 42
literal(true)     // must be exactly true
```

### Modifiers

```typescript
string().optional()  // string | undefined
string().nullable()  // string | null
string().refine(val => val.includes("@"), "Must contain @")
```

### Error Handling

```typescript
// Throwing validation
try {
  const result = schema.parse(data)
} catch (error) {
  console.log(error.message) // "field.path: error message"
}

// Non-throwing validation
const result = schema.safeParse(data)
if (result.success) {
  console.log(result.data)
} else {
  console.log(result.error.message)
  console.log(result.error.path)
}
```

## Architecture

The library is organized into separate modules:

- `src/core/schema.ts` - Base Schema class and core functionality
- `src/schemas/` - Individual schema implementations
- `src/factories/` - Factory functions for creating schemas
- `src/types/` - TypeScript type definitions

## Testing

Run tests with:

```bash
bun test
```

## Linting

Run linting with:

```bash
bun run lint
```

## License

MIT

not zod isn't zod
