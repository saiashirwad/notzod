"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.string = string;
exports.number = number;
exports.boolean = boolean;
exports.array = array;
exports.object = object;
exports.literal = literal;
exports.union = union;
var array_js_1 = require("../schemas/array.js");
var boolean_js_1 = require("../schemas/boolean.js");
var literal_js_1 = require("../schemas/literal.js");
var number_js_1 = require("../schemas/number.js");
var object_js_1 = require("../schemas/object.js");
var string_js_1 = require("../schemas/string.js");
var union_js_1 = require("../schemas/union.js");
function string(options) {
    return new string_js_1.StringSchema(options);
}
function number(options) {
    return new number_js_1.NumberSchema(options);
}
function boolean(options) {
    return new boolean_js_1.BooleanSchema(options);
}
function array(schema, options) {
    return new array_js_1.ArraySchema(schema, options);
}
function object(shape) {
    return new object_js_1.ObjectSchema(shape);
}
function literal(value) {
    return new literal_js_1.LiteralSchema(value);
}
function union(schemas) {
    return new union_js_1.UnionSchema(schemas);
}
