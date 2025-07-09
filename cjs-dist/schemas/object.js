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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObjectSchema = void 0;
var schema_js_1 = require("../core/schema.js");
var ObjectSchema = /** @class */ (function (_super) {
    __extends(ObjectSchema, _super);
    function ObjectSchema(shape, path) {
        if (path === void 0) { path = []; }
        var _this = _super.call(this, "object", path) || this;
        _this.shape = shape;
        return _this;
    }
    ObjectSchema.prototype.compile = function () {
        // Ensure all field schemas are compiled
        for (var key in this.shape) {
            this.shape[key].compile();
        }
        var checks = [];
        // Type check
        checks.push('if (typeof value !== "object" || value === null) {');
        checks.push('  return { success: false, error: { path, message: "Expected object, got " + (value === null ? "null" : typeof value), data: value } };');
        checks.push('}');
        // Field validation
        checks.push('const result = {};');
        for (var key in this.shape) {
            checks.push("{");
            checks.push("  const fieldPath = [...path, \"".concat(key, "\"];"));
            checks.push("  const fieldValue = value[\"".concat(key, "\"];"));
            checks.push("  const fieldResult = this.shape[\"".concat(key, "\"].getCompiledParser()(fieldValue, fieldPath);"));
            checks.push("  if (!fieldResult.success) {");
            checks.push("    return fieldResult;");
            checks.push("  }");
            checks.push("  result[\"".concat(key, "\"] = fieldResult.data;"));
            checks.push("}");
        }
        checks.push('return { success: true, data: result };');
        try {
            this._compiledParse = new Function('value', 'path', checks.join('\n'));
        }
        catch (error) {
            // Fallback to regular parsing if compilation fails
            this._compiledParse = this._parse.bind(this);
        }
    };
    ObjectSchema.prototype._parse = function (value, path) {
        if (typeof value !== "object" || value === null) {
            return this.error("Expected object, got " + (value === null ? "null" : typeof value), path, value);
        }
        var result = {};
        for (var key in this.shape) {
            var fieldPath = __spreadArray(__spreadArray([], path, true), [key], false);
            var fieldSchema = this.shape[key];
            var fieldValue = value[key];
            var fieldResult = fieldSchema._parse(fieldValue, fieldPath);
            if (!fieldResult.success) {
                return fieldResult;
            }
            result[key] = fieldResult.data;
        }
        return this.success(result);
    };
    ObjectSchema.prototype.extend = function (shape) {
        return new ObjectSchema(__assign(__assign({}, this.shape), shape), this.path);
    };
    return ObjectSchema;
}(schema_js_1.Schema));
exports.ObjectSchema = ObjectSchema;
