type ColumnType = "string" | "number" | "boolean" | "date" | "json"
type RelationType =
	| "one-to-one"
	| "one-to-many"
	| "many-to-one"
	| "many-to-many"
type ConstraintType = "primaryKey" | "unique" | "index" | "nullable"

export interface ColumnDefinition {
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

export interface TableAST {
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
export interface SchemaAST {
	tables: {
		[tableName: string]: TableAST
	}
	version: number
}

// Base class for all column types
class Column {
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
	default(value: any): this {
		this.definition.defaultValue = value
		return this
	}

	// Reference another table
	references(target: string | Column, targetColumn: string = "id"): this {
		let tableName: string
		let columnName: string = targetColumn

		if (typeof target === "string") {
			tableName = target
		} else {
			tableName = target.tableName || ""
			columnName = target.columnName || columnName
		}

		this.definition.references = {
			table: tableName,
			column: columnName,
			type: "many-to-one",
		}

		return this
	}

	// Get column definition for AST
	_getDefinition(): ColumnDefinition {
		return { ...this.definition }
	}

	// Create an array relationship
	array(): ArrayRelationship {
		return new ArrayRelationship(this)
	}

	// Get tableName and columnName
	_getTableName(): string | undefined {
		return this.tableName
	}

	_getColumnName(): string | undefined {
		return this.columnName
	}
}

// For array (one-to-many) relationships
class ArrayRelationship {
	private column: Column

	constructor(column: Column) {
		this.column = column
	}

	// Reference a foreign column
	references(foreignColumn: Column): RelationshipDefinition {
		const sourceTable = this.column._getTableName() || ""
		const sourceColumn = this.column._getColumnName() || ""
		const targetTable = foreignColumn._getTableName() || ""
		const targetColumn = foreignColumn._getColumnName() || ""

		return {
			type: "one-to-many",
			table: sourceTable,
			column: sourceColumn,
			foreignTable: targetTable,
			foreignColumn: targetColumn,
		}
	}
}

// String column type
class StringColumn extends Column {
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
class NumberColumn extends Column {
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
class BooleanColumn extends Column {
	constructor() {
		super("boolean")
	}
}

// Date column type
class DateColumn extends Column {
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
class JsonColumn extends Column {
	constructor() {
		super("json")
	}
}

// Factory functions for column types
export function string(): StringColumn {
	return new StringColumn()
}

export function number(): NumberColumn {
	return new NumberColumn()
}

export function boolean(): BooleanColumn {
	return new BooleanColumn()
}

export function date(): DateColumn {
	return new DateColumn()
}

function json(): JsonColumn {
	return new JsonColumn()
}

// Type for table definition input
type TableInput = Record<string, Column | RelationshipDefinition>

// Table builder function
export function table(columns: TableInput): TableInput {
	return columns
}

// Main schema function
export function scope<T extends Record<string, TableInput>>(
	schemaBuilder: (scope: any) => T,
): T & { _ast: SchemaAST } {
	// Create a scope proxy for circular references
	const schemaScope: any = {}

	// Execute the builder function with the scope
	const schema = schemaBuilder(schemaScope)

	// Process the schema to build the AST
	const ast: SchemaAST = {
		tables: {},
		version: 1,
	}

	// First pass: register tables in scope
	for (const tableName in schema) {
		const table = schema[tableName]
		schemaScope[tableName] = table

		// Initialize the table in the AST
		ast.tables[tableName] = {
			name: tableName,
			columns: {},
			relationships: {},
		}
	}

	// Second pass: process columns and relationships
	for (const tableName in schema) {
		const table = schema[tableName]
		const tableAst = ast.tables[tableName]

		for (const key in table) {
			const value = table[key]

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
				tableAst.relationships[key] = value
			}
		}
	}

	// Return the original schema with the AST attached
	return {
		...schema,
		_ast: ast,
	}
}

const db = scope((s) => ({
	user: table({
		id: string().primaryKey(),
		name: string(),
		email: string().unique(),
		createdAt: date(),
	}),
	book: table({
		id: string().primaryKey(),
		title: string(),
		description: string().text(),
		rating: number().precision(3, 1),
		published: boolean(),
		ownedBy: string().references("user"),
	}),
}))
