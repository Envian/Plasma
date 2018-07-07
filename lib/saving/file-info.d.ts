import { File } from "atom";
import Project from "../project.js";
export default class FileInfo {
    readonly project: Project;
    readonly path: string;
    readonly entity: string;
    readonly folderName: string;
    readonly isTooling: boolean;
    readonly isMetadata: boolean;
    body?: string;
    constructor(project: Project, path: File | string, body?: string);
    read(): Promise<string>;
    write(body: string): Promise<void>;
}
