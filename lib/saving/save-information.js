export default class SaveInformation {
    constructor(project, file, body) {
        this.path = project.srcFolder.relativize(file.getPath()).replace(/\\/g, "/");
        this.folder = this.path.substr(0, this.path.indexOf("/"));
        this.target = getTarget(this.path);
    }
}

function getTarget(path) {
    const subdir = path.indexOf("/") + 1;
    const nextdir = path.indexOf("/", subdir);
    const meta = path.indexOf("-meta.xml");

    if (nextdir === -1 && meta === -1) {
        return path;
    } else if (meta !== -1) {
        return path.substr(0, meta);
    } else {
        return path.substr(0, nextdir);
    }
}
