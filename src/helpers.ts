import { ConfirmationOptions, TextEditor, RangeCompatible, File, Directory } from "atom";

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

export function chunk<T>(count: number, items: Array<T>): Array<Array<T>> {
    const results = [] as Array<Array<T>>;
    do {
        results.push(items.splice(0, count));
    } while (items.length)
    return results;
}

// TODO: Deprecate this.
export function getError(error: any) {
    if (typeof(error) === "string") return error;
    if (error instanceof Array) {
        error = error[0];
    }
    return error.error_description || error.error || error.message || error;
}

export function addErrorMarker(editors: Array<TextEditor>, line: number): void {
    if (line == null || !editors || !editors.length) return;

    for (const editor of editors) {
        const range: RangeCompatible = [[line, 0], [line, editor.getBuffer().getLines()[line].length]];
        editor.decorateMarker(editor.markBufferRange(range, {
            plasma: "compile-error",
            maintainHistory: true,
            persistent: false,
            invalidate: "touch"
        } as any), {
            type: "line",
            class: "plasma-error"
        });

        editor.decorateMarker(editor.markBufferRange(range, {
            plasma: "compile-error",
            maintainHistory: true,
            persistent: false,
            invalidate: "never"
        } as any), {
            type: "line-number",
            class: "plasma-error"
        });
    }
}

export function clearMarkers(editors: Array<TextEditor>): void {
    for (const editor of editors) {
        // Markers support custom properties but TypeScript does not.
        for (const marker of editor.findMarkers({ plasma: "compile-error" } as any)) {
            marker.destroy();
        }
    }
}

export async function getEntries(rootDir: Directory): Promise<Array<Directory|File>> {
    return new Promise((resolve, reject) => {
        rootDir.getEntries((error: Error | null, entries: Array<Directory | File>) => {
            if (error) reject(error);
            resolve(entries);
        });
    }) as Promise<Array<Directory|File>>;
}

export async function getEntriesRecusively(rootDir: Directory): Promise<Array<File|Directory>> {
    const entries = await getEntries(rootDir);
    const directories = entries.filter(entry => entry.isDirectory()) as Array<Directory>;
    return entries.concat(flatten(await Promise.all(directories.map(getEntriesRecusively))));
}
