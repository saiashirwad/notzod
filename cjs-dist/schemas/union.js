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
exports.UnionSchema = void 0;
var schema_js_1 = require("../core/schema.js");
var UnionSchema = /** @class */ (function (_super) {
    __extends(UnionSchema, _super);
    function UnionSchema(schemas, path) {
        if (path === void 0) { path = []; }
        var _this = _super.call(this, "union", path) || this;
        _this.schemas = schemas;
        return _this;
    }
    UnionSchema.prototype.compile = function () {
        // Ensure all schemas are compiled
        for (var _i = 0, _a = this.schemas; _i < _a.length; _i++) {
            var schema = _a[_i];
            schema.compile();
        }
        var checks = [];
        checks.push('const errors = [];');
        checks.push('for (let i = 0; i < this.schemas.length; i++) {');
        checks.push('  const result = this.schemas[i].getCompiledParser()(value, path);');
        checks.push('  if (result.success) {');
        checks.push('    return result;');
        checks.push('  }');
        checks.push('  errors.push(result);');
        checks.push('}');
        checks.push('return { success: false, error: { path, message: "Value does not match any schema in union: " + errors.map(e => e.error.message).join("; "), data: value } };');
        try {
            this._compiledParse = new Function('value', 'path', checks.join('\n'));
        }
        catch (error) {
            // Fallback to regular parsing if compilation fails
            this._compiledParse = this._parse.bind(this);
        }
    };
    UnionSchema.prototype._parse = function (value, path) {
        var errors = [];
        for (var _i = 0, _a = this.schemas; _i < _a.length; _i++) {
            var schema = _a[_i];
            var result = schema._parse(value, path);
            if (result.success) {
                return result;
            }
            errors.push(result);
        }
        return this.error("Value does not match any schema in union: " +
            errors.map(function (e) { return e.error.message; }).join("; "), path, value);
    };
    return UnionSchema;
}(schema_js_1.Schema));
exports.UnionSchema = UnionSchema;
