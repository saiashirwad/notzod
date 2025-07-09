// Compile TypeScript to CommonJS first
const { execSync } = require('child_process');
const fs = require('fs');

console.log('Compiling TypeScript to CommonJS...');
execSync('npx tsc --module commonjs --outDir cjs-dist src/index.ts', { cwd: __dirname });

// Now test the implementation
const { string, number, boolean, object, array, literal, union } = require('./cjs-dist/index.js');

console.log('Testing JIT compilation...');

try {
    // Test string schema
    const stringSchema = string({ minLength: 3, maxLength: 10 });
    console.log('String test passed:', stringSchema.parse('hello')); // Should work
    
    try {
        stringSchema.parse('hi'); // Should fail
        console.log('ERROR: String validation should have failed');
    } catch (e) {
        console.log('String validation correctly failed:', e.message);
    }

    // Test number schema
    const numberSchema = number({ min: 0, max: 100 });
    console.log('Number test passed:', numberSchema.parse(50)); // Should work
    
    try {
        numberSchema.parse(150); // Should fail
        console.log('ERROR: Number validation should have failed');
    } catch (e) {
        console.log('Number validation correctly failed:', e.message);
    }

    // Test boolean schema
    const booleanSchema = boolean();
    console.log('Boolean test passed:', booleanSchema.parse(true)); // Should work
    
    try {
        booleanSchema.parse('not a boolean'); // Should fail
        console.log('ERROR: Boolean validation should have failed');
    } catch (e) {
        console.log('Boolean validation correctly failed:', e.message);
    }

    // Test literal schema
    const literalSchema = literal('admin');
    console.log('Literal test passed:', literalSchema.parse('admin')); // Should work
    
    try {
        literalSchema.parse('user'); // Should fail
        console.log('ERROR: Literal validation should have failed');
    } catch (e) {
        console.log('Literal validation correctly failed:', e.message);
    }

    // Test object schema
    const objectSchema = object({
        name: string({ minLength: 2 }),
        age: number({ min: 18 })
    });
    console.log('Object test passed:', objectSchema.parse({ name: 'Alice', age: 25 })); // Should work
    
    try {
        objectSchema.parse({ name: 'A', age: 15 }); // Should fail
        console.log('ERROR: Object validation should have failed');
    } catch (e) {
        console.log('Object validation correctly failed:', e.message);
    }

    console.log('All JIT compilation tests passed!');

} catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
}