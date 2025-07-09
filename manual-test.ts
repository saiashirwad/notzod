// Simple manual test that can be run with TypeScript
// We'll just check if the compilation works and can be called

// Let's import the source directly and call compile manually
import { StringSchema } from './src/schemas/string.js'
import { NumberSchema } from './src/schemas/number.js'

console.log('Testing JIT compilation manually...')

// Test string schema compilation
const stringSchema = new StringSchema({ minLength: 3, maxLength: 10 })
console.log('String schema before compilation:', !!stringSchema._compiledParse)

stringSchema.compile()
console.log('String schema after compilation:', !!stringSchema._compiledParse)

// Test that compiled function works
try {
    const result = stringSchema.parse('hello')
    console.log('String test passed:', result)
} catch (e) {
    console.log('String test failed:', e.message)
}

try {
    stringSchema.parse('hi') // Should fail
    console.log('ERROR: String validation should have failed')
} catch (e) {
    console.log('String validation correctly failed:', e.message)
}

// Test number schema compilation
const numberSchema = new NumberSchema({ min: 0, max: 100 })
console.log('Number schema before compilation:', !!numberSchema._compiledParse)

numberSchema.compile()
console.log('Number schema after compilation:', !!numberSchema._compiledParse)

try {
    const result = numberSchema.parse(50)
    console.log('Number test passed:', result)
} catch (e) {
    console.log('Number test failed:', e.message)
}

try {
    numberSchema.parse(150) // Should fail
    console.log('ERROR: Number validation should have failed')
} catch (e) {
    console.log('Number validation correctly failed:', e.message)
}

console.log('Manual JIT compilation test completed!')