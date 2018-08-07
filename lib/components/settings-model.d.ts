/// <reference types="node" />
import { EventEmitter } from "events";
import Project from "../project.js";
import { ServerType } from "./auth-view.js";
export default class SettingsModel extends EventEmitter {
    path: string;
    project?: Project;
    constructor(state?: string | Project);
    authenticate(type: ServerType): Promise<void>;
    refreshAPIVersions(): Promise<void>;
    save(api: string): Promise<void>;
    serialize(): any;
    getTitle(): string;
    destroy(): void;
}
