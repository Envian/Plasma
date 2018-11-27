export default class {
    private constructor();
    static newProject(): Promise<object | void>;
    static editProject(): Promise<void>;
    static autoSave(path: string, body: string): Promise<void>;
    static saveToServer(): Promise<void>;
    static refreshFromServer(): Promise<void>;
    static cleanProject(): Promise<void>;
    static deleteFromServer(): Promise<void>;
    static openSFDC(): Promise<void>;
}
