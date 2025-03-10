// Type definitions
type ColumnType = "string" | "number" | "boolean" | "date" | "json"
type RelationType =
	| "one-to-one"
	| "one-to-many"
	| "many-to-one"
	| "many-to-many"
type ConstraintType = "primaryKey" | "unique" | "index" | "nullable"

// Basic column definition
interface ColumnDefinition {
	type: ColumnType
	constraints: ConstraintType[]
	references?: {
		table: string
		column: string
		type: RelationType
	}
	defaultValue?: any
	meta?: {
		[key: string]: any
	}
}

// Relationship definition
interface RelationshipDefinition {
	type: RelationType
	table: string
	column: string
	foreignTable: string
	foreignColumn: string
}

// Table AST representation
interface TableAST {
	name: string
	columns: {
		[columnName: string]: ColumnDefinition
	}
	relationships: {
		[relationshipName: string]: RelationshipDefinition
	}
	meta?: {
		[key: string]: any
	}
}

// Schema AST
interface SchemaAST {
	tables: {
		[tableName: string]: TableAST
	}
	version: number
}

// Generic type to extract inferred column types from table definition
type InferColumnType<T> = T extends Column<infer U> ? U : never

// Make all properties of T optional
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

// Base class for all column types with better typing
class Column<T> {
	protected definition: ColumnDefinition
	protected columnName?: string
	protected tableName?: string

	constructor(type: ColumnType) {
		this.definition = {
			type,
			constraints: [],
		}
	}

	// Internal method to set column and table name
	_setNames(tableName: string, columnName: string): this {
		this.tableName = tableName
		this.columnName = columnName
		return this
	}

	// Make this a primary key
	primaryKey(): this {
		if (!this.definition.constraints.includes("primaryKey")) {
			this.definition.constraints.push("primaryKey")
		}
		return this
	}

	// Make this column unique
	unique(): this {
		if (!this.definition.constraints.includes("unique")) {
			this.definition.constraints.push("unique")
		}
		return this
	}

	// Add an index to this column
	index(): this {
		if (!this.definition.constraints.includes("index")) {
			this.definition.constraints.push("index")
		}
		return this
	}

	// Make this column nullable
	nullable(): this {
		if (!this.definition.constraints.includes("nullable")) {
			this.definition.constraints.push("nullable")
		}
		return this
	}

	// Set a default value
	default(value: T): this {
		this.definition.defaultValue = value
		return this
	}

	// Get column definition for AST
	_getDefinition(): ColumnDefinition {
		return { ...this.definition }
	}

	// Get tableName and columnName
	_getTableName(): string | undefined {
		return this.tableName
	}

	_getColumnName(): string | undefined {
		return this.columnName
	}
}

// String column type
class StringColumn extends Column<string> {
	constructor() {
		super("string")
	}

	// Set maximum length
	maxLength(length: number): this {
		this.definition.meta = {
			...this.definition.meta,
			maxLength: length,
		}
		return this
	}

	// Set as text type
	text(): this {
		this.definition.meta = {
			...this.definition.meta,
			text: true,
		}
		return this
	}
}

// Number column type
class NumberColumn extends Column<number> {
	constructor() {
		super("number")
	}

	// Set as integer
	integer(): this {
		this.definition.meta = {
			...this.definition.meta,
			integer: true,
		}
		return this
	}

	// Set decimal precision
	precision(precision: number, scale?: number): this {
		this.definition.meta = {
			...this.definition.meta,
			precision,
			scale: scale !== undefined ? scale : 2,
		}
		return this
	}
}

// Boolean column type
class BooleanColumn extends Column<boolean> {
	constructor() {
		super("boolean")
	}
}

// Date column type
class DateColumn extends Column<Date> {
	constructor() {
		super("date")
	}

	// Set as timestamp with timezone
	timestamptz(): this {
		this.definition.meta = {
			...this.definition.meta,
			timestamptz: true,
		}
		return this
	}

	// Set as date only
	dateOnly(): this {
		this.definition.meta = {
			...this.definition.meta,
			dateOnly: true,
		}
		return this
	}
}

// JSON column type
class JsonColumn extends Column<Record<string, any>> {
	constructor() {
		super("json")
	}
}

// Type for a complete table definition
type TableColumns = Record<string, Column<any>>

// TableInput is what gets returned by the table() function
type TableInput<T extends TableColumns> = {
	[K in keyof T]: T[K]
} & {
	_tableMeta?: {
		name?: string
		timestamps?: boolean
		softDeletes?: boolean
	}

	// Method to define a relationship with a field
	withField<FK extends string>(name: FK): T & { [k in FK]: StringColumn }
}

// Enhanced type-safe table building function
function table<T extends TableColumns>(columns: T): TableInput<T> {
	const tableInput = { ...columns } as TableInput<T>

	// Add metadata
	tableInput._tableMeta = {
		timestamps: true,
		softDeletes: false,
	}

	// Add withField method for relationships
	tableInput.withField = function <FK extends string>(
		this: TableInput<T>,
		fieldName: FK,
	) {
		// Create a string column for the foreign key
		const foreignKeyColumn = new StringColumn()

		// Add the column to the table
		const newColumns = {
			...this,
			[fieldName]: foreignKeyColumn,
		}

		return newColumns as T & { [k in FK]: StringColumn }
	}

	return tableInput
}

// Type for the final schema result
type SchemaResult<T extends Record<string, TableInput<any>>> = {
	[K in keyof T]: T[K]
} & {
	_ast: SchemaAST
}

// Type for table reference in scope
type TableReference<T extends TableInput<any>> = T & {
	// Reference methods that can be called on a table
	array(): {
		references(foreignKey: Column<any>): RelationshipDefinition
	}
}

// Type for scope object
type SchemaScope<T extends Record<string, TableInput<any>>> = {
	[K in keyof T]: TableReference<T[K]>
}

// Main schema function with improved type safety
function scope<T extends Record<string, TableInput<any>>>(
	schemaBuilder: (scope: SchemaScope<T>) => T,
): SchemaResult<T> {
	// Create a scope proxy that will be populated with tables
	const schemaScope: any = {}

	// Execute the builder function with the scope
	const schema = schemaBuilder(schemaScope as SchemaScope<T>)

	// Process the schema to build the AST
	const ast: SchemaAST = {
		tables: {},
		version: 1,
	}

	// First pass: register tables in scope
	for (const tableName in schema) {
		const tableInput = schema[tableName]

		// Skip internal properties
		if (tableName.startsWith("_")) continue

		// Initialize the table in the AST
		ast.tables[tableName] = {
			name: tableName,
			columns: {},
			relationships: {},
		}

		// Make sure table has its name set in metadata
		if (tableInput._tableMeta) {
			tableInput._tableMeta.name = tableName
		}

		// Create a reference object for this table
		schemaScope[tableName] = {
			...tableInput,

			// Add array method for one-to-many relationships
			array() {
				return {
					references(foreignKey: Column<any>): RelationshipDefinition {
						const sourceTable = tableName
						const targetTable = foreignKey._getTableName() || ""
						const targetColumn = foreignKey._getColumnName() || ""

						// Create a relationship definition
						return {
							type: "one-to-many",
							table: sourceTable,
							column: "id", // Typically references the primary key
							foreignTable: targetTable,
							foreignColumn: targetColumn,
						}
					},
				}
			},
		}
	}

	// Second pass: process columns and relationships
	for (const tableName in schema) {
		// Skip internal properties
		if (tableName.startsWith("_")) continue

		const tableInput = schema[tableName]
		const tableAst = ast.tables[tableName]

		for (const key in tableInput) {
			// Skip special properties like _tableMeta and methods
			if (key.startsWith("_") || typeof tableInput[key] === "function") continue

			const value = tableInput[key]

			if (value instanceof Column) {
				// Set the table and column name for the column
				value._setNames(tableName, key)

				// Add column to AST
				tableAst.columns[key] = value._getDefinition()
			} else if (
				typeof value === "object" &&
				value.type &&
				value.type.includes("-to-")
			) {
				// Add relationship to AST
				tableAst.relationships[key] = value as RelationshipDefinition
			}
		}
	}

	// Return the original schema with the AST attached
	return {
		...schema,
		_ast: ast,
	}
}

// Factory functions for column types
function string(): StringColumn {
	return new StringColumn()
}

function number(): NumberColumn {
	return new NumberColumn()
}

function boolean(): BooleanColumn {
	return new BooleanColumn()
}

function date(): DateColumn {
	return new DateColumn()
}

function json(): JsonColumn {
	return new JsonColumn()
}

// Example usage
const db = scope((s) => ({
	user: table({
		id: string().primaryKey(),
		name: string(),
		email: string().unique(),
	}),
	book: table({
		id: string().primaryKey(),
		title: string(),
		// The new syntax for foreign key references
		// This creates a field called ownedById, not ownedBy
		...s.user.withField("ownedById"),
	}),
}))

// The schema is now available as db.user, db.book
// The AST is available as db._ast

// Type-checking examples:
// db.user.id; // StringColumn
// db.book.title; // StringColumn
// db.book.ownedById; // StringColumn

// Example with relationships
const blogDb = scope((s) => ({
	author: table({
		id: string().primaryKey(),
		name: string(),
		email: string().unique(),
	}),
	article: table({
		id: string().primaryKey(),
		title: string(),
		content: string().text(),
		// Create a authorId field that references author
		...s.author.withField("authorId"),
		// Relationship field for one-to-many (won't create a column)
		comments: s.comment.array().references(s.comment.articleId),
	}),
	comment: table({
		id: string().primaryKey(),
		content: string().text(),
		// Create articleId field that references article
		...s.article.withField("articleId"),
		// Create userId field that references user
		...s.author.withField("authorId"),
	}),
}))

console.log(blogDb)
