import Project, { ConnectionInfo } from "../project.js";
import { ServerType } from "./auth-view.js";
export default class SettingsModel {
    connection: ConnectionInfo;
    project?: Project;
    private authResult?;
    constructor(state?: string | Project);
    authenticate(type: ServerType): Promise<void>;
    getAPIVersions(): Promise<void>;
    save(api: string, path: string): Promise<void>;
    serialize(): any;
    getTitle(): string;
    destroy(): void;
}
