export type ValidationSuccess<T> = { success: true; data: T }

export type ValidationError = {
	success: false
	error: {
		path: string[]
		message: string
		data?: unknown
	}
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationError

export type Infer<S> = S extends {
	_parse(value: unknown, path: string[]): ValidationResult<infer T>
}
	? T
	: never
