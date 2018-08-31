import { File } from "atom";

import Project from "../project.js";

const TOOLING_FOLDERS = new Set([
    "aura", "classes", "components", "pages", "staticresources", "triggers"
]);

export default class FileInfo {
    public readonly project: Project;
    public readonly path: string;
    public readonly entity: string;
    public readonly folderName: string;
    public readonly isTooling: boolean;
    public readonly isMetadata: boolean;


    public body?: string;

    constructor(project: Project, path: File | string, body?: string) {
        path = ((path instanceof File) ? path.getPath() : path).replace(/\\/g, "/");
        this.project = project;
        this.path = project.srcFolder.relativize(path).replace(/\\/g, "/");
        this.entity = getEntityName(this.path);
        this.folderName = this.path.substr(0, this.path.indexOf("/"));
        this.isTooling = TOOLING_FOLDERS.has(this.folderName);
        this.isMetadata = this.path.endsWith("-meta.xml");
        this.body = body;
    }

    async read(): Promise<string> {
        if (this.body == undefined) {
            this.body = await this.project.srcFolder.getFile(this.path).read(true) || "";
        }
        return this.body;
    }

    async write(body: string): Promise<void> {
        this.body = body;
        await this.project.srcFolder.getFile(this.path).write(body);
    }
}

// Gets the entity name this file belongs to from the path.
// For most files. this will be, for example: apex/myClass.cls
// For aura bundles, this will be aura/myBundle
function getEntityName(path: string): string {
    const subdir = path.indexOf("/") + 1;
    const nextdir = path.indexOf("/", subdir);
    const meta = path.indexOf("-meta.xml");

    if (nextdir >= 0) {
        // all aura bundles are just aura/name
        return path.substr(0, nextdir);
    } else if (meta >= 0) {
        // all metadata files simply remove -meta.xml
        return path.substr(0, meta);
    } else {
        // all other files just return the string.
        return path;
    }
}
