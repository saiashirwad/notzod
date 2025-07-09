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
exports.LiteralSchema = void 0;
var schema_js_1 = require("../core/schema.js");
var LiteralSchema = /** @class */ (function (_super) {
    __extends(LiteralSchema, _super);
    function LiteralSchema(value, path) {
        if (path === void 0) { path = []; }
        var _this = _super.call(this, "literal", path) || this;
        _this.value = value;
        return _this;
    }
    LiteralSchema.prototype.compile = function () {
        var expectedValue = JSON.stringify(this.value);
        var checks = [];
        checks.push("if (value !== ".concat(expectedValue, ") {"));
        checks.push("  return { success: false, error: { path, message: \"Expected ".concat(expectedValue, ", got \" + JSON.stringify(value), data: value } };"));
        checks.push('}');
        checks.push("return { success: true, data: ".concat(expectedValue, " };"));
        try {
            this._compiledParse = new Function('value', 'path', checks.join('\n'));
        }
        catch (error) {
            // Fallback to regular parsing if compilation fails
            this._compiledParse = this._parse.bind(this);
        }
    };
    LiteralSchema.prototype._parse = function (value, path) {
        if (value !== this.value) {
            return this.error("Expected ".concat(JSON.stringify(this.value), ", got ").concat(JSON.stringify(value)), path, value);
        }
        return this.success(this.value);
    };
    return LiteralSchema;
}(schema_js_1.Schema));
exports.LiteralSchema = LiteralSchema;
