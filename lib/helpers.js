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
function chunk(count, items) {
    const results = [];
    do {
        results.push(items.splice(0, count));
    } while (items.length);
    return results;
}
exports.chunk = chunk;
function getError(error) {
    if (typeof (error) === "string")
        return error;
    if (error instanceof Array) {
        error = error[0];
    }
    return error.error_description || error.error || error.message || error;
}
exports.getError = getError;
function addErrorMarker(editors, line) {
    if (line == null || !editors || !editors.length)
        return;
    for (const editor of editors) {
        const range = [[line, 0], [line, editor.getBuffer().getLines()[line].length]];
        editor.decorateMarker(editor.markBufferRange(range, {
            plasma: "compile-error",
            maintainHistory: true,
            persistent: false,
            invalidate: "touch"
        }), {
            type: "line",
            class: "plasma-error"
        });
        editor.decorateMarker(editor.markBufferRange(range, {
            plasma: "compile-error",
            maintainHistory: true,
            persistent: false,
            invalidate: "never"
        }), {
            type: "line-number",
            class: "plasma-error"
        });
    }
}
exports.addErrorMarker = addErrorMarker;
function clearMarkers(editors) {
    for (const editor of editors) {
        for (const marker of editor.findMarkers({ plasma: "compile-error" })) {
            marker.destroy();
        }
    }
}
exports.clearMarkers = clearMarkers;
