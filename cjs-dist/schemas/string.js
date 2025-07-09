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
exports.StringSchema = void 0;
var schema_js_1 = require("../core/schema.js");
var StringSchema = /** @class */ (function (_super) {
    __extends(StringSchema, _super);
    function StringSchema(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, "string", options.path) || this;
        _this.minLength = options.minLength;
        _this.maxLength = options.maxLength;
        _this.pattern = options.pattern;
        return _this;
    }
    StringSchema.prototype.compile = function () {
        var checks = [];
        // Type check
        checks.push('if (typeof value !== "string") {');
        checks.push('  return { success: false, error: { path, message: "Expected string, got " + typeof value, data: value } };');
        checks.push('}');
        // Min length check
        if (this.minLength !== undefined) {
            checks.push("if (value.length < ".concat(this.minLength, ") {"));
            checks.push("  return { success: false, error: { path, message: \"String must be at least ".concat(this.minLength, " characters\", data: value } };"));
            checks.push('}');
        }
        // Max length check
        if (this.maxLength !== undefined) {
            checks.push("if (value.length > ".concat(this.maxLength, ") {"));
            checks.push("  return { success: false, error: { path, message: \"String must be at most ".concat(this.maxLength, " characters\", data: value } };"));
            checks.push('}');
        }
        // Pattern check
        if (this.pattern !== undefined) {
            // We need to serialize the regex in a way that can be reconstructed
            var regexStr = this.pattern.toString();
            checks.push("if (!".concat(regexStr, ".test(value)) {"));
            checks.push('  return { success: false, error: { path, message: "String does not match pattern", data: value } };');
            checks.push('}');
        }
        checks.push('return { success: true, data: value };');
        try {
            this._compiledParse = new Function('value', 'path', checks.join('\n'));
        }
        catch (error) {
            // Fallback to regular parsing if compilation fails
            this._compiledParse = this._parse.bind(this);
        }
    };
    StringSchema.prototype._parse = function (value, path) {
        if (typeof value !== "string") {
            return this.error("Expected string, got " + typeof value, path, value);
        }
        if (this.minLength !== undefined && value.length < this.minLength) {
            return this.error("String must be at least ".concat(this.minLength, " characters"), path, value);
        }
        if (this.maxLength !== undefined && value.length > this.maxLength) {
            return this.error("String must be at most ".concat(this.maxLength, " characters"), path, value);
        }
        if (this.pattern !== undefined && !this.pattern.test(value)) {
            return this.error("String does not match pattern", path, value);
        }
        return this.success(value);
    };
    StringSchema.prototype.min = function (length) {
        return new StringSchema({
            minLength: length,
            maxLength: this.maxLength,
            pattern: this.pattern,
            path: this.path,
        });
    };
    StringSchema.prototype.max = function (length) {
        return new StringSchema({
            minLength: this.minLength,
            maxLength: length,
            pattern: this.pattern,
            path: this.path,
        });
    };
    StringSchema.prototype.matches = function (pattern) {
        return new StringSchema({
            minLength: this.minLength,
            maxLength: this.maxLength,
            pattern: pattern,
            path: this.path,
        });
    };
    return StringSchema;
}(schema_js_1.Schema));
exports.StringSchema = StringSchema;
