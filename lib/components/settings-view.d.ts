import Project from "../project.js";
import SettingsModel from "./settings-model.js";
declare global {
    namespace JSX {
        interface Element {
        }
        interface IntrinsicElements {
            [key: string]: any;
        }
    }
}
export default class SettingsView {
    private model;
    private api;
    private type;
    private refs;
    readonly element?: HTMLElement;
    constructor(model: SettingsModel);
    onSave(project: Project): void;
    onLoad(project: Project): void;
    onAuthenticate(project: Project): void;
    update(): Promise<void>;
    destroy(): Promise<void>;
    render(): JSX.Element;
    doAuthenticate(): Promise<void>;
    doUpdateAPI(): Promise<void>;
    doSave(): Promise<void>;
}
