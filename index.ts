interface StringSchema {
	type: "string"
	required?: boolean
	pattern?: RegExp
	minLength?: number
	maxLength?: number
}

interface NumberSchema {
	type: "number"
	required?: boolean
	minimum?: number
	maximum?: number
}

interface BooleanSchema {
	type: "boolean"
	required?: boolean
}

interface ArraySchema {
	type: "array"
	required?: boolean
	items?: Schema
}

interface ObjectSchema {
	type: "object"
	required?: boolean
	properties?: {
		[key: string]: Schema
	}
}

type Schema =
	| StringSchema
	| NumberSchema
	| BooleanSchema
	| ArraySchema
	| ObjectSchema
