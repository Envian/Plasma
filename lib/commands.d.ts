export default class {
    private constructor();
    static newProject(): Promise<object>;
    static editProject(): Promise<void>;
    static autoSave(path: string, body: string): Promise<void>;
    static saveToServer(): Promise<void>;
    static refreshFromServer(): Promise<void>;
    static deleteFromServer(): Promise<void>;
    static openSFDC(): Promise<void>;
}
