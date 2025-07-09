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
exports.NumberSchema = void 0;
var schema_js_1 = require("../core/schema.js");
var NumberSchema = /** @class */ (function (_super) {
    __extends(NumberSchema, _super);
    function NumberSchema(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, "number", options.path) || this;
        _this._min = options.min;
        _this._max = options.max;
        _this.isPositive = options.isPositive;
        _this.isNegative = options.isNegative;
        return _this;
    }
    NumberSchema.prototype.compile = function () {
        var checks = [];
        // Type check
        checks.push('if (typeof value !== "number" || Number.isNaN(value)) {');
        checks.push('  return { success: false, error: { path, message: "Expected number, got " + typeof value, data: value } };');
        checks.push('}');
        // Min check
        if (this._min !== undefined) {
            checks.push("if (value < ".concat(this._min, ") {"));
            checks.push("  return { success: false, error: { path, message: \"Number must be at least ".concat(this._min, "\", data: value } };"));
            checks.push('}');
        }
        // Max check
        if (this._max !== undefined) {
            checks.push("if (value > ".concat(this._max, ") {"));
            checks.push("  return { success: false, error: { path, message: \"Number must be at most ".concat(this._max, "\", data: value } };"));
            checks.push('}');
        }
        // Positive check
        if (this.isPositive) {
            checks.push('if (value <= 0) {');
            checks.push('  return { success: false, error: { path, message: "Number must be positive", data: value } };');
            checks.push('}');
        }
        // Negative check
        if (this.isNegative) {
            checks.push('if (value >= 0) {');
            checks.push('  return { success: false, error: { path, message: "Number must be negative", data: value } };');
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
    NumberSchema.prototype._parse = function (value, path) {
        if (typeof value !== "number" || Number.isNaN(value)) {
            return this.error("Expected number, got " + typeof value, path, value);
        }
        if (this._min !== undefined && value < this._min) {
            return this.error("Number must be at least ".concat(this._min), path, value);
        }
        if (this._max !== undefined && value > this._max) {
            return this.error("Number must be at most ".concat(this._max), path, value);
        }
        if (this.isPositive && value <= 0) {
            return this.error("Number must be positive", path, value);
        }
        if (this.isNegative && value >= 0) {
            return this.error("Number must be negative", path, value);
        }
        return this.success(value);
    };
    NumberSchema.prototype.min = function (val) {
        return new NumberSchema({
            min: val,
            max: this._max,
            isPositive: this.isPositive,
            isNegative: this.isNegative,
            path: this.path,
        });
    };
    NumberSchema.prototype.max = function (val) {
        return new NumberSchema({
            min: this._min,
            max: val,
            isPositive: this.isPositive,
            isNegative: this.isNegative,
            path: this.path,
        });
    };
    NumberSchema.prototype.positive = function () {
        return new NumberSchema({
            min: this._min,
            max: this._max,
            isPositive: true,
            isNegative: false,
            path: this.path,
        });
    };
    NumberSchema.prototype.negative = function () {
        return new NumberSchema({
            min: this._min,
            max: this._max,
            isPositive: false,
            isNegative: true,
            path: this.path,
        });
    };
    return NumberSchema;
}(schema_js_1.Schema));
exports.NumberSchema = NumberSchema;
