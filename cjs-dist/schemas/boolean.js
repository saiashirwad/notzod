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
exports.BooleanSchema = void 0;
var schema_js_1 = require("../core/schema.js");
var BooleanSchema = /** @class */ (function (_super) {
    __extends(BooleanSchema, _super);
    function BooleanSchema(options) {
        if (options === void 0) { options = {}; }
        var _this = _super.call(this, "boolean", options.path) || this;
        _this.strictTrue = options.strictTrue;
        _this.strictFalse = options.strictFalse;
        return _this;
    }
    BooleanSchema.prototype.compile = function () {
        var checks = [];
        // Type check
        checks.push('if (typeof value !== "boolean") {');
        checks.push('  return { success: false, error: { path, message: "Expected boolean, got " + typeof value, data: value } };');
        checks.push('}');
        // Strict true check
        if (this.strictTrue) {
            checks.push('if (value !== true) {');
            checks.push('  return { success: false, error: { path, message: "Boolean must be true", data: value } };');
            checks.push('}');
        }
        // Strict false check
        if (this.strictFalse) {
            checks.push('if (value !== false) {');
            checks.push('  return { success: false, error: { path, message: "Boolean must be false", data: value } };');
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
    BooleanSchema.prototype._parse = function (value, path) {
        if (typeof value !== "boolean") {
            return this.error("Expected boolean, got " + typeof value, path, value);
        }
        if (this.strictTrue && value !== true) {
            return this.error("Boolean must be true", path, value);
        }
        if (this.strictFalse && value !== false) {
            return this.error("Boolean must be false", path, value);
        }
        return this.success(value);
    };
    BooleanSchema.prototype.true = function () {
        return new BooleanSchema({
            strictTrue: true,
            strictFalse: undefined,
            path: this.path,
        });
    };
    BooleanSchema.prototype.false = function () {
        return new BooleanSchema({
            strictTrue: undefined,
            strictFalse: true,
            path: this.path,
        });
    };
    return BooleanSchema;
}(schema_js_1.Schema));
exports.BooleanSchema = BooleanSchema;
