import { ConfirmationOptions } from "atom";
export declare function sleep(milliseconds: number): Promise<void>;
export declare function mapby<K, V>(array: Array<V>, evaluator: (val: V) => K): Map<K, V>;
export declare function groupby<K, V>(array: Array<V>, evaluator: (val: V) => K): Map<K, Array<V>>;
export declare function confirm(options: ConfirmationOptions): Promise<number>;
export declare function flatten<T>(items: Array<Array<T>>): Array<T>;
export declare function getError(error: any): any;
