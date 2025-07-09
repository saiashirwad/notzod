# JIT Compilation Implementation

This implementation adds JIT (Just-In-Time) compilation using `new Function()` to all validator schemas in the notzod library. 

## Key Changes

### 1. Base Schema Class
- Added `_compiledParse` property to store compiled validation functions
- Added `compile()` method that subclasses can override
- Added `getCompiledParser()` method that ensures compilation happens before use
- Modified `parse()` and `safeParse()` to use compiled functions

### 2. Schema Implementations
All schema classes now include JIT compilation:

#### StringSchema
- Compiles type checks, minLength, maxLength, and pattern validations into a single function
- Example generated code:
```javascript
if (typeof value !== "string") {
  return { success: false, error: { path, message: "Expected string, got " + typeof value, data: value } };
}
if (value.length < 3) {
  return { success: false, error: { path, message: "String must be at least 3 characters", data: value } };
}
return { success: true, data: value };
```

#### NumberSchema  
- Compiles type checks, min/max bounds, and positive/negative constraints
- Avoids repeated conditionals at runtime

#### BooleanSchema
- Compiles type checks and strict true/false validations

#### LiteralSchema
- Compiles exact value comparison into optimized function

#### ArraySchema
- Compiles array type check and length validations
- Ensures element schema is also compiled for optimal performance

#### ObjectSchema
- Compiles object type check and property validations
- Pre-compiles all property schemas

#### UnionSchema
- Compiles union logic to try each schema efficiently
- Pre-compiles all union member schemas

### 3. Wrapper Schemas
All wrapper schemas also support JIT compilation:
- `OptionalSchema` - Compiles undefined check + wrapped schema
- `NullableSchema` - Compiles null check + wrapped schema  
- `RefinementSchema` - Compiles schema validation + refinement function
- `PipeSchema` - Compiles input schema -> output schema pipeline

## Performance Benefits

1. **Reduced Function Call Overhead**: Instead of multiple method calls, validation logic is inlined
2. **Eliminated Conditional Branches**: Validation rules are baked into the function at compile time
3. **Optimized Type Checks**: Type checking logic is pre-generated based on schema configuration
4. **Cached Compilation**: Functions are compiled once and reused for all subsequent validations

## Backward Compatibility

- All existing APIs remain unchanged
- Compilation happens automatically when schemas are used
- Fallback to regular parsing if compilation fails
- No breaking changes to public interfaces

## Usage

The JIT compilation is transparent to users:

```typescript
const schema = string({ minLength: 3, maxLength: 10 })
// Compilation happens automatically on first parse() call
const result = schema.parse("hello") // Uses compiled function
```

For advanced users who want to pre-compile:
```typescript
const schema = string({ minLength: 3 })
schema.compile() // Explicit compilation
```

This implementation provides significant performance improvements for validation-heavy applications while maintaining full backward compatibility.