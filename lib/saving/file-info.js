"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const atom_1 = require("atom");
const TOOLING_FOLDERS = new Set([
    "aura", "classes", "components", "pages", "staticresources", "triggers"
]);
class FileInfo {
    constructor(project, path, body) {
        path = ((path instanceof atom_1.File) ? path.getPath() : path).replace(/\\/g, "/");
        this.project = project;
        this.path = project.srcFolder.relativize(path);
        this.entity = getEntityName(this.path);
        this.folderName = this.path.substr(0, this.path.indexOf("/"));
        this.isTooling = TOOLING_FOLDERS.has(this.folderName);
        this.isMetadata = this.path.endsWith("-meta.xml");
        this.body = body;
    }
    async read() {
        if (this.body == undefined) {
            this.body = await this.project.srcFolder.getFile(this.path).read(true) || "";
        }
        return this.body;
    }
    async write(body) {
        this.body = body;
        await this.project.srcFolder.getFile(this.path).write(body);
    }
}
exports.default = FileInfo;
function getEntityName(path) {
    const subdir = path.indexOf("/") + 1;
    const nextdir = path.indexOf("/", subdir);
    const meta = path.indexOf("-meta.xml");
    if (nextdir >= 0) {
        return path.substr(0, nextdir);
    }
    else if (meta >= 0) {
        return path.substr(0, meta);
    }
    else {
        return path;
    }
}
