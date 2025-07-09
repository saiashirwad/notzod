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
exports.ArraySchema = void 0;
var schema_js_1 = require("../core/schema.js");
var ArraySchema = /** @class */ (function (_super) {
    __extends(ArraySchema, _super);
    function ArraySchema(elementSchema, options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, "array", options.path) || this;
        _this.elementSchema = elementSchema;
        _this.options = options;
        return _this;
    }
    ArraySchema.prototype.compile = function () {
        // Ensure the element schema is compiled
        this.elementSchema.compile();
        var checks = [];
        // Type check
        checks.push('if (!Array.isArray(value)) {');
        checks.push('  return { success: false, error: { path, message: "Expected array, got " + typeof value, data: value } };');
        checks.push('}');
        // Min length check
        if (this.options.minLength !== undefined) {
            checks.push("if (value.length < ".concat(this.options.minLength, ") {"));
            checks.push("  return { success: false, error: { path, message: \"Array must have at least ".concat(this.options.minLength, " elements\", data: value } };"));
            checks.push('}');
        }
        // Max length check
        if (this.options.maxLength !== undefined) {
            checks.push("if (value.length > ".concat(this.options.maxLength, ") {"));
            checks.push("  return { success: false, error: { path, message: \"Array must have at most ".concat(this.options.maxLength, " elements\", data: value } };"));
            checks.push('}');
        }
        // Element validation loop
        checks.push('const result = [];');
        checks.push('for (let i = 0; i < value.length; i++) {');
        checks.push('  const elementPath = [...path, i.toString()];');
        checks.push('  const elementResult = this.elementSchema.getCompiledParser()(value[i], elementPath);');
        checks.push('  if (!elementResult.success) {');
        checks.push('    return elementResult;');
        checks.push('  }');
        checks.push('  result.push(elementResult.data);');
        checks.push('}');
        checks.push('return { success: true, data: result };');
        try {
            this._compiledParse = new Function('value', 'path', checks.join('\n'));
        }
        catch (error) {
            // Fallback to regular parsing if compilation fails
            this._compiledParse = this._parse.bind(this);
        }
    };
    ArraySchema.prototype._parse = function (value, path) {
        if (!Array.isArray(value)) {
            return this.error("Expected array, got " + typeof value, path, value);
        }
        if (this.options.minLength !== undefined &&
            value.length < this.options.minLength) {
            return this.error("Array must have at least ".concat(this.options.minLength, " elements"), path, value);
        }
        if (this.options.maxLength !== undefined &&
            value.length > this.options.maxLength) {
            return this.error("Array must have at most ".concat(this.options.maxLength, " elements"), path, value);
        }
        var result = [];
        for (var i = 0; i < value.length; i++) {
            var elementPath = __spreadArray(__spreadArray([], path, true), [i.toString()], false);
            var elementResult = this.elementSchema._parse(value[i], elementPath);
            if (!elementResult.success) {
                return elementResult;
            }
            result.push(elementResult.data);
        }
        return this.success(result);
    };
    ArraySchema.prototype.min = function (length) {
        return new ArraySchema(this.elementSchema, __assign(__assign({}, this.options), { minLength: length, path: this.path }));
    };
    ArraySchema.prototype.max = function (length) {
        return new ArraySchema(this.elementSchema, __assign(__assign({}, this.options), { maxLength: length, path: this.path }));
    };
    return ArraySchema;
}(schema_js_1.Schema));
exports.ArraySchema = ArraySchema;
