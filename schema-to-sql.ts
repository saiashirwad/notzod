import { type SchemaAST, type TableAST, type ColumnDefinition } from "./db"
import { scope, table, string, number, boolean, date } from "./db"

type SqlDialect = "postgres" | "mysql" | "sqlite" | "mssql"

interface SqlGeneratorOptions {
	dialect?: SqlDialect
	includeTimestamps?: boolean
	includeForeignKeys?: boolean
	tablePrefix?: string
}

/**
 * Converts a schema AST to SQL statements
 */
export function schemaToSql(
	ast: SchemaAST,
	options: SqlGeneratorOptions = {},
): string {
	const {
		dialect = "postgres",
		includeTimestamps = true,
		includeForeignKeys = true,
		tablePrefix = "",
	} = options

	const statements: string[] = []
	const foreignKeyStatements: string[] = []

	// Generate CREATE TABLE statements
	for (const tableName in ast.tables) {
		const table = ast.tables[tableName]
		const createTableSql = generateCreateTable(
			table,
			dialect,
			includeTimestamps,
			tablePrefix,
		)
		statements.push(createTableSql)

		// Generate foreign key constraints
		if (includeForeignKeys) {
			const fkStatements = generateForeignKeys(table, dialect, tablePrefix)
			foreignKeyStatements.push(...fkStatements)
		}
	}

	// Add foreign key statements after all tables are created
	statements.push(...foreignKeyStatements)

	// Generate index statements
	for (const tableName in ast.tables) {
		const table = ast.tables[tableName]
		const indexStatements = generateIndexes(table, dialect, tablePrefix)
		statements.push(...indexStatements)
	}

	return statements.join("\n\n")
}

/**
 * Generates a CREATE TABLE statement for a table
 */
function generateCreateTable(
	table: TableAST,
	dialect: SqlDialect,
	includeTimestamps: boolean,
	tablePrefix: string,
): string {
	const tableName = quoteIdentifier(tablePrefix + table.name, dialect)
	const columnDefinitions: string[] = []

	// Process each column
	for (const columnName in table.columns) {
		const column = table.columns[columnName]
		columnDefinitions.push(
			generateColumnDefinition(columnName, column, dialect),
		)
	}

	// Add timestamp columns if requested
	if (includeTimestamps) {
		if (dialect === "postgres") {
			columnDefinitions.push(
				`${quoteIdentifier("created_at", dialect)} TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`,
			)
			columnDefinitions.push(
				`${quoteIdentifier("updated_at", dialect)} TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`,
			)
		} else if (dialect === "mysql") {
			columnDefinitions.push(
				`${quoteIdentifier("created_at", dialect)} DATETIME DEFAULT CURRENT_TIMESTAMP`,
			)
			columnDefinitions.push(
				`${quoteIdentifier("updated_at", dialect)} DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
			)
		} else if (dialect === "sqlite") {
			columnDefinitions.push(
				`${quoteIdentifier("created_at", dialect)} TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
			)
			columnDefinitions.push(
				`${quoteIdentifier("updated_at", dialect)} TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
			)
		} else if (dialect === "mssql") {
			columnDefinitions.push(
				`${quoteIdentifier("created_at", dialect)} DATETIME2 DEFAULT GETDATE()`,
			)
			columnDefinitions.push(
				`${quoteIdentifier("updated_at", dialect)} DATETIME2 DEFAULT GETDATE()`,
			)
		}
	}

	// Add primary key constraints
	const primaryKeyColumns: string[] = []
	for (const columnName in table.columns) {
		const column = table.columns[columnName]
		if (column.constraints.includes("primaryKey")) {
			primaryKeyColumns.push(quoteIdentifier(columnName, dialect))
		}
	}

	// Add primary key constraint if there are multiple primary key columns
	if (primaryKeyColumns.length > 1) {
		columnDefinitions.push(`PRIMARY KEY (${primaryKeyColumns.join(", ")})`)
	}

	return `CREATE TABLE ${tableName} (\n  ${columnDefinitions.join(",\n  ")}\n);`
}

/**
 * Generates a column definition for SQL
 */
function generateColumnDefinition(
	columnName: string,
	column: ColumnDefinition,
	dialect: SqlDialect,
): string {
	const quotedName = quoteIdentifier(columnName, dialect)
	let definition = `${quotedName} ${getSqlType(column, dialect)}`

	// Add NOT NULL constraint
	if (!column.constraints.includes("nullable")) {
		definition += " NOT NULL"
	}

	// Add PRIMARY KEY constraint (only for single column primary keys)
	if (column.constraints.includes("primaryKey")) {
		definition += " PRIMARY KEY"
	}

	// Add UNIQUE constraint
	if (column.constraints.includes("unique")) {
		definition += " UNIQUE"
	}

	// Add DEFAULT value
	if (column.defaultValue !== undefined) {
		definition += ` DEFAULT ${formatSqlValue(column.defaultValue, column.type, dialect)}`
	}

	return definition
}

/**
 * Generates foreign key constraints for a table
 */
function generateForeignKeys(
	table: TableAST,
	dialect: SqlDialect,
	tablePrefix: string,
): string[] {
	const statements: string[] = []

	// Check columns for references
	for (const columnName in table.columns) {
		const column = table.columns[columnName]

		if (column.references) {
			const quotedTableName = quoteIdentifier(tablePrefix + table.name, dialect)
			const quotedColumnName = quoteIdentifier(columnName, dialect)
			const quotedRefTable = quoteIdentifier(
				tablePrefix + column.references.table,
				dialect,
			)
			const quotedRefColumn = quoteIdentifier(column.references.column, dialect)

			const constraintName = formatConstraintName(
				"fk",
				table.name,
				columnName,
				dialect,
			)

			let statement = ""

			if (dialect === "sqlite") {
				// In SQLite, foreign keys can only be defined in the CREATE TABLE statement
				// We're assuming the table was already created without them
				// The best we can do is create a new table with the constraints and copy data
				// This is complex and beyond our scope, so we'll skip SQLite foreign key constraints
				continue
			} else if (dialect === "postgres" || dialect === "mysql") {
				statement =
					`ALTER TABLE ${quotedTableName} ADD CONSTRAINT ${constraintName} ` +
					`FOREIGN KEY (${quotedColumnName}) ` +
					`REFERENCES ${quotedRefTable} (${quotedRefColumn});`
			} else if (dialect === "mssql") {
				statement =
					`ALTER TABLE ${quotedTableName} ` +
					`ADD CONSTRAINT ${constraintName} FOREIGN KEY (${quotedColumnName}) ` +
					`REFERENCES ${quotedRefTable} (${quotedRefColumn});`
			}

			statements.push(statement)
		}
	}

	// Process explicit relationships
	for (const relationName in table.relationships) {
		const relation = table.relationships[relationName]

		if (relation.type === "many-to-one" || relation.type === "one-to-one") {
			const quotedTableName = quoteIdentifier(tablePrefix + table.name, dialect)
			const quotedColumnName = quoteIdentifier(relation.column, dialect)
			const quotedRefTable = quoteIdentifier(
				tablePrefix + relation.foreignTable,
				dialect,
			)
			const quotedRefColumn = quoteIdentifier(relation.foreignColumn, dialect)

			const constraintName = formatConstraintName(
				"fk",
				table.name,
				relation.column,
				dialect,
			)

			let statement = ""

			if (dialect === "sqlite") {
				// Skip for SQLite for the same reason as above
				continue
			} else {
				statement =
					`ALTER TABLE ${quotedTableName} ADD CONSTRAINT ${constraintName} ` +
					`FOREIGN KEY (${quotedColumnName}) ` +
					`REFERENCES ${quotedRefTable} (${quotedRefColumn});`
			}

			statements.push(statement)
		}
	}

	return statements
}

/**
 * Generates index statements for a table
 */
function generateIndexes(
	table: TableAST,
	dialect: SqlDialect,
	tablePrefix: string,
): string[] {
	const statements: string[] = []

	for (const columnName in table.columns) {
		const column = table.columns[columnName]

		if (
			column.constraints.includes("index") &&
			!column.constraints.includes("primaryKey")
		) {
			const quotedTableName = quoteIdentifier(tablePrefix + table.name, dialect)
			const quotedColumnName = quoteIdentifier(columnName, dialect)

			const indexName = formatConstraintName(
				"idx",
				table.name,
				columnName,
				dialect,
			)

			let statement = ""

			if (
				dialect === "postgres" ||
				dialect === "mysql" ||
				dialect === "sqlite"
			) {
				statement = `CREATE INDEX ${indexName} ON ${quotedTableName} (${quotedColumnName});`
			} else if (dialect === "mssql") {
				statement = `CREATE INDEX ${indexName} ON ${quotedTableName} (${quotedColumnName});`
			}

			statements.push(statement)
		}
	}

	return statements
}

/**
 * Maps a schema type to a SQL type for the given dialect
 */
function getSqlType(column: ColumnDefinition, dialect: SqlDialect): string {
	const { type, meta = {} } = column

	switch (type) {
		case "string": {
			// Text type
			if (meta.text) {
				if (dialect === "postgres") return "TEXT"
				if (dialect === "mysql") return "TEXT"
				if (dialect === "sqlite") return "TEXT"
				if (dialect === "mssql") return "NVARCHAR(MAX)"
			}

			// String with max length
			const maxLength = meta.maxLength || 255
			if (dialect === "postgres") return `VARCHAR(${maxLength})`
			if (dialect === "mysql") return `VARCHAR(${maxLength})`
			if (dialect === "sqlite") return `VARCHAR(${maxLength})`
			if (dialect === "mssql") return `NVARCHAR(${maxLength})`

			// Default string type
			return "VARCHAR(255)"
		}

		case "number": {
			// Integer type
			if (meta.integer) {
				if (dialect === "postgres") return "INTEGER"
				if (dialect === "mysql") return "INT"
				if (dialect === "sqlite") return "INTEGER"
				if (dialect === "mssql") return "INT"
			}

			// Decimal with precision
			if (meta.precision) {
				const precision = meta.precision
				const scale = meta.scale || 2
				if (dialect === "postgres") return `DECIMAL(${precision}, ${scale})`
				if (dialect === "mysql") return `DECIMAL(${precision}, ${scale})`
				if (dialect === "sqlite") return "REAL" // SQLite doesn't support precision
				if (dialect === "mssql") return `DECIMAL(${precision}, ${scale})`
			}

			// Default number type
			if (dialect === "postgres") return "DOUBLE PRECISION"
			if (dialect === "mysql") return "DOUBLE"
			if (dialect === "sqlite") return "REAL"
			if (dialect === "mssql") return "FLOAT"
		}

		case "boolean": {
			if (dialect === "postgres") return "BOOLEAN"
			if (dialect === "mysql") return "TINYINT(1)"
			if (dialect === "sqlite") return "BOOLEAN"
			if (dialect === "mssql") return "BIT"
		}

		case "date": {
			// Timestamp with timezone
			if (meta.timestamptz) {
				if (dialect === "postgres") return "TIMESTAMP WITH TIME ZONE"
				if (dialect === "mysql") return "DATETIME"
				if (dialect === "sqlite") return "TIMESTAMP"
				if (dialect === "mssql") return "DATETIMEOFFSET"
			}

			// Date only
			if (meta.dateOnly) {
				if (dialect === "postgres") return "DATE"
				if (dialect === "mysql") return "DATE"
				if (dialect === "sqlite") return "DATE"
				if (dialect === "mssql") return "DATE"
			}

			// Default date type
			if (dialect === "postgres") return "TIMESTAMP"
			if (dialect === "mysql") return "DATETIME"
			if (dialect === "sqlite") return "TIMESTAMP"
			if (dialect === "mssql") return "DATETIME2"
		}

		case "json": {
			if (dialect === "postgres") return "JSONB"
			if (dialect === "mysql") return "JSON"
			if (dialect === "sqlite") return "TEXT"
			if (dialect === "mssql") return "NVARCHAR(MAX)"
		}

		default:
			return "VARCHAR(255)"
	}
}

/**
 * Formats a value for SQL based on its type and the dialect
 */
function formatSqlValue(value: any, type: string, dialect: SqlDialect): string {
	if (value === null) {
		return "NULL"
	}

	switch (type) {
		case "string":
			return `'${escapeString(value, dialect)}'`

		case "number":
			return String(value)

		case "boolean":
			if (dialect === "mysql") {
				return value ? "1" : "0"
			}
			return value ? "TRUE" : "FALSE"

		case "date":
			if (value instanceof Date) {
				if (dialect === "postgres") {
					return `'${value.toISOString()}'`
				}
				if (dialect === "mysql") {
					return `'${value.toISOString().replace("T", " ").replace("Z", "")}'`
				}
				if (dialect === "sqlite") {
					return `'${value.toISOString()}'`
				}
				if (dialect === "mssql") {
					return `'${value.toISOString()}'`
				}
			}
			return `'${escapeString(value, dialect)}'`

		case "json":
			const jsonStr = typeof value === "string" ? value : JSON.stringify(value)
			return `'${escapeString(jsonStr, dialect)}'`

		default:
			return `'${escapeString(value, dialect)}'`
	}
}

/**
 * Escapes a string for SQL to prevent SQL injection
 */
function escapeString(value: string, dialect: SqlDialect): string {
	if (typeof value !== "string") {
		return String(value)
	}

	// Replace single quotes with escaped quotes based on dialect
	if (dialect === "postgres" || dialect === "mysql" || dialect === "sqlite") {
		return value.replace(/'/g, "''")
	} else if (dialect === "mssql") {
		return value.replace(/'/g, "''")
	}

	return value
}

/**
 * Quotes an identifier (table or column name) based on dialect
 */
function quoteIdentifier(name: string, dialect: SqlDialect): string {
	if (dialect === "postgres") {
		return `"${name}"`
	} else if (dialect === "mysql") {
		return `\`${name}\``
	} else if (dialect === "sqlite") {
		return `"${name}"`
	} else if (dialect === "mssql") {
		return `[${name}]`
	}
	return name
}

/**
 * Formats a constraint name based on convention and dialect
 */
function formatConstraintName(
	prefix: string,
	tableName: string,
	columnName: string,
	dialect: SqlDialect,
): string {
	// Keep constraint names within typical length limits
	const maxTableNameLength = 10
	const maxColumnNameLength = 10
	const shortTableName =
		tableName.length > maxTableNameLength
			? tableName.substring(0, maxTableNameLength)
			: tableName
	const shortColumnName =
		columnName.length > maxColumnNameLength
			? columnName.substring(0, maxColumnNameLength)
			: columnName

	return `${prefix}_${shortTableName}_${shortColumnName}`
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

const sql = schemaToSql(db._ast, {
	dialect: "postgres",
	includeTimestamps: true,
})

console.log(sql)
