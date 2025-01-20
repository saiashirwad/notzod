const BrandTypeId: unique symbol = Symbol.for("effect/Brand")

export interface Brand<in out ID extends string | symbol> {
	readonly [BrandTypeId]: {
		readonly [id in ID]: ID
	}
}

// type ProductId = number & Brand<"ProductId">

// // Define a UserId type branded similarly
// type UserId = number & Brand<"UserId">
