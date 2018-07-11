import { ConfirmationOptions } from "atom";

export function sleep(milliseconds: number): Promise<void> {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

export function mapby<K, V>(array: Array<V>, evaluator: (val: V) => K): Map<K, V> {
    return array.reduce((map, item) => {
        map.set(evaluator(item), item);
        return map;
    }, new Map<K, V>());
}

export function groupby<K, V>(array: Array<V>, evaluator: (val: V) => K): Map<K, Array<V>> {
    return array.reduce((map, item) => {
        const val = evaluator(item);
        const array = map.get(val) || [];
        map.set(val, array);
        array.push(item);
        return map;
    }, new Map<K, Array<V>>());
}

export function confirm(options: ConfirmationOptions): Promise<number> {
    return new Promise(resolve => {
        atom.confirm(options, result => resolve(result));
    });
}

export function flatten<T>(items: Array<Array<T>>): Array<T> {
    return items.reduce((flat, item) => flat.concat(item), []);
}

// TODO: Deprecate this.
export function getError(error: any) {
    if (typeof(error) === "string") return error;
    if (error instanceof Array) {
        error = error[0];
    }
    return error.error_description || error.error || error.message || error;
}
