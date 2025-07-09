"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipeSchema = exports.RefinementSchema = exports.NullableSchema = exports.OptionalSchema = exports.Schema = exports.ValidationErrorImpl = void 0;
var ValidationErrorImpl = /** @class */ (function (_super) {
    __extends(ValidationErrorImpl, _super);
    function ValidationErrorImpl(error) {
        var _this = this;
        var pathStr = error.path.length ? error.path.join(".") : "<root>";
        _this = _super.call(this, "".concat(pathStr, ": ").concat(error.message)) || this;
        _this.error = error;
        _this.name = "ValidationError";
        return _this;
    }
    return ValidationErrorImpl;
}(Error));
exports.ValidationErrorImpl = ValidationErrorImpl;
var Schema = /** @class */ (function () {
    function Schema(type, path) {
        if (path === void 0) { path = []; }
        this.type = type;
        this.path = path;
    }
    /**
     * Compile the schema into a fast parsing function using JIT compilation
     */
    Schema.prototype.compile = function () {
        // Default implementation - can be overridden by subclasses
        this._compiledParse = this._parse.bind(this);
    };
    /**
     * Get the compiled parser, compiling if not already done
     */
    Schema.prototype.getCompiledParser = function () {
        if (!this._compiledParse) {
            this.compile();
        }
        return this._compiledParse;
    };
    Schema.prototype.parse = function (value) {
        var result = this.getCompiledParser()(value, this.path);
        if (!result.success) {
            throw new ValidationErrorImpl(result.error);
        }
        return result.data;
    };
    Schema.prototype.safeParse = function (value) {
        return this.getCompiledParser()(value, this.path);
    };
    Schema.prototype.optional = function () {
        return new OptionalSchema(this);
    };
    Schema.prototype.nullable = function () {
        return new NullableSchema(this);
    };
    Schema.prototype.refine = function (refineFn, errorMessage) {
        if (errorMessage === void 0) { errorMessage = "Failed refinement check"; }
        return new RefinementSchema(this, refineFn, errorMessage);
    };
    Schema.prototype.success = function (data) {
        return { success: true, data: data };
    };
    Schema.prototype.error = function (message, path, data) {
        return {
            success: false,
            error: {
                path: path,
                message: message,
                data: data,
            },
        };
    };
    Schema.prototype.pipe = function (schema) {
        return new PipeSchema(this, schema);
    };
    return Schema;
}());
exports.Schema = Schema;
var OptionalSchema = /** @class */ (function (_super) {
    __extends(OptionalSchema, _super);
    function OptionalSchema(schema) {
        var _this = _super.call(this, "optional", schema.path) || this;
        _this.schema = schema;
        return _this;
    }
    OptionalSchema.prototype.compile = function () {
        // Ensure the wrapped schema is compiled
        this.schema.compile();
        var checks = [];
        checks.push('if (value === undefined) {');
        checks.push('  return { success: true, data: undefined };');
        checks.push('}');
        checks.push('return this.schema.getCompiledParser()(value, path);');
        try {
            this._compiledParse = new Function('value', 'path', checks.join('\n'));
        }
        catch (error) {
            // Fallback to regular parsing if compilation fails
            this._compiledParse = this._parse.bind(this);
        }
    };
    OptionalSchema.prototype._parse = function (value, path) {
        if (value === undefined) {
            return this.success(undefined);
        }
        return this.schema._parse(value, path);
    };
    return OptionalSchema;
}(Schema));
exports.OptionalSchema = OptionalSchema;
var NullableSchema = /** @class */ (function (_super) {
    __extends(NullableSchema, _super);
    function NullableSchema(schema) {
        var _this = _super.call(this, "nullable", schema.path) || this;
        _this.schema = schema;
        return _this;
    }
    NullableSchema.prototype.compile = function () {
        // Ensure the wrapped schema is compiled
        this.schema.compile();
        var checks = [];
        checks.push('if (value === null) {');
        checks.push('  return { success: true, data: null };');
        checks.push('}');
        checks.push('return this.schema.getCompiledParser()(value, path);');
        try {
            this._compiledParse = new Function('value', 'path', checks.join('\n'));
        }
        catch (error) {
            // Fallback to regular parsing if compilation fails
            this._compiledParse = this._parse.bind(this);
        }
    };
    NullableSchema.prototype._parse = function (value, path) {
        if (value === null) {
            return this.success(null);
        }
        return this.schema._parse(value, path);
    };
    return NullableSchema;
}(Schema));
exports.NullableSchema = NullableSchema;
var RefinementSchema = /** @class */ (function (_super) {
    __extends(RefinementSchema, _super);
    function RefinementSchema(schema, refineFn, errorMessage) {
        var _this = _super.call(this, "refinement", schema.path) || this;
        _this.schema = schema;
        _this.refineFn = refineFn;
        _this.errorMessage = errorMessage;
        return _this;
    }
    RefinementSchema.prototype.compile = function () {
        // Ensure the wrapped schema is compiled
        this.schema.compile();
        var checks = [];
        checks.push('const result = this.schema.getCompiledParser()(value, path);');
        checks.push('if (!result.success) {');
        checks.push('  return result;');
        checks.push('}');
        checks.push('if (!this.refineFn(result.data)) {');
        checks.push("  return { success: false, error: { path, message: ".concat(JSON.stringify(this.errorMessage), ", data: result.data } };"));
        checks.push('}');
        checks.push('return result;');
        try {
            this._compiledParse = new Function('value', 'path', checks.join('\n'));
        }
        catch (error) {
            // Fallback to regular parsing if compilation fails
            this._compiledParse = this._parse.bind(this);
        }
    };
    RefinementSchema.prototype._parse = function (value, path) {
        var result = this.schema._parse(value, path);
        if (!result.success) {
            return result;
        }
        if (!this.refineFn(result.data)) {
            return this.error(this.errorMessage, path, result.data);
        }
        return result;
    };
    return RefinementSchema;
}(Schema));
exports.RefinementSchema = RefinementSchema;
var PipeSchema = /** @class */ (function (_super) {
    __extends(PipeSchema, _super);
    function PipeSchema(inputSchema, outputSchema) {
        var _this = _super.call(this, "pipe", inputSchema.path) || this;
        _this.inputSchema = inputSchema;
        _this.outputSchema = outputSchema;
        return _this;
    }
    PipeSchema.prototype.compile = function () {
        // Ensure both schemas are compiled
        this.inputSchema.compile();
        this.outputSchema.compile();
        var checks = [];
        checks.push('const result = this.inputSchema.getCompiledParser()(value, path);');
        checks.push('if (!result.success) {');
        checks.push('  return result;');
        checks.push('}');
        checks.push('return this.outputSchema.getCompiledParser()(result.data, path);');
        try {
            this._compiledParse = new Function('value', 'path', checks.join('\n'));
        }
        catch (error) {
            // Fallback to regular parsing if compilation fails
            this._compiledParse = this._parse.bind(this);
        }
    };
    PipeSchema.prototype._parse = function (value, path) {
        var result = this.inputSchema._parse(value, path);
        if (!result.success) {
            return result;
        }
        return this.outputSchema._parse(result.data, path);
    };
    return PipeSchema;
}(Schema));
exports.PipeSchema = PipeSchema;
