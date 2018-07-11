"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function sleep(milliseconds) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}
exports.sleep = sleep;
function mapby(array, evaluator) {
    return array.reduce((map, item) => {
        map.set(evaluator(item), item);
        return map;
    }, new Map());
}
exports.mapby = mapby;
function groupby(array, evaluator) {
    return array.reduce((map, item) => {
        const val = evaluator(item);
        const array = map.get(val) || [];
        map.set(val, array);
        array.push(item);
        return map;
    }, new Map());
}
exports.groupby = groupby;
function confirm(options) {
    return new Promise(resolve => {
        atom.confirm(options, result => resolve(result));
    });
}
exports.confirm = confirm;
function flatten(items) {
    return items.reduce((flat, item) => flat.concat(item), []);
}
exports.flatten = flatten;
function getError(error) {
    if (typeof (error) === "string")
        return error;
    if (error instanceof Array) {
        error = error[0];
    }
    return error.error_description || error.error || error.message || error;
}
exports.getError = getError;
