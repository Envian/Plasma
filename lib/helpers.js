"use babel";

import { File, Directory } from "atom";

// Sleeps for some number of milliseconds.
export async function sleep(milliseconds) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

// Combines a series of arrays into a single array with an element for each passed in array.
// Or, takes in an array of arrays and swaps their dimensions.
export function transpose() {
    const args = [...arguments];
    return new Array(args.reduce(Math.max)).map((_, x) => args.map(y => y[x]));
}

export function mapby(array, eval) {
    return array.reduce((acc, item) => {
        acc[eval(item)] = item;
        return acc;
    }, {});
}

export function groupby(array, eval) {
    return array.reduce((acc, item) => {
        const val = eval(item);
        const array = acc[val] || [];
        acc[val] = array;
        array.push(item);
        return acc;
    }, {});
}

export async function confirm(options) {
    return new Promise(resolve => {
        atom.confirm(options, result => resolve(result));
    });
}

export function getError(error) {
    if (typeof(error) === "string") return error;
    if (error instanceof Array) {
        error = error[0];
    }
    return error.error_description || error.error || error.message || error;
}
