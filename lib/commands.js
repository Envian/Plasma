"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const opn = require("opn");
const atom_1 = require("atom");
const project_manager_js_1 = require("./project-manager.js");
const save_manager_js_1 = require("./saving/save-manager.js");
const project_js_1 = tslib_1.__importDefault(require("./project.js"));
const file_info_js_1 = tslib_1.__importDefault(require("./saving/file-info.js"));
class default_1 {
    constructor() { }
    static async newProject() {
        const selectedPaths = await new Promise((accept) => atom.pickFolder(accept));
        if (selectedPaths && selectedPaths.length) {
            const dir = new atom_1.Directory(selectedPaths[0]);
            const existingProject = await project_manager_js_1.findProjectForDirectory(dir);
            if (existingProject) {
                atom.notifications.addError("Project already defined at this location. Select a new directory for your project.");
                return;
            }
            const root = project_manager_js_1.getRoot(dir) || dir;
            const project = new project_js_1.default(root);
            await project.save();
            return atom.workspace.open("plasma://editProject?" + root.getPath());
        }
    }
    static async editProject() {
        const project = await getProjectForAction();
        if (project) {
            atom.workspace.open("plasma://editProject?" + project.root.getPath());
        }
        else {
            atom.notifications.addError("No active project to open.");
        }
    }
    static async autoSave(path, body) {
        const project = await getProjectForAction();
        if (project) {
            save_manager_js_1.saveFiles(project, [new file_info_js_1.default(project, path, body)]);
        }
    }
    static async saveToServer() {
        const files = getFilesFromTree();
        const project = await project_manager_js_1.getProjectForFilesAndDirs(files);
        if (project) {
            save_manager_js_1.saveFiles(project, files.map(file => new file_info_js_1.default(project, file.getPath())));
        }
        else {
            atom.notifications.addError("No project found.");
        }
    }
    static async refreshFromServer() {
        const project = await getProjectForAction();
        if (project) {
            return project.refreshFromServer();
        }
        else {
            atom.notifications.addError("No project found.");
        }
    }
    static async cleanProject() {
        const project = await getProjectForAction();
        if (project) {
            return project.cleanProject();
        }
        else {
            atom.notifications.addError("No project found.");
        }
    }
    static async deleteFromServer() {
        const files = getFilesFromTree();
        const project = await project_manager_js_1.getProjectForFilesAndDirs(files);
        if (project) {
        }
        else {
            atom.notifications.addError("No project found.");
        }
    }
    static async openSFDC() {
        const project = await getProjectForAction();
        if (project) {
            opn(project.connection.baseurl + "/secur/frontdoor.jsp?sid=" + await project.getToken());
        }
    }
}
exports.default = default_1;
async function getProjectForAction() {
    return project_manager_js_1.getProjectForFilesAndDirs(getFilesAndDirsForAction());
}
function getFilesAndDirsForAction() {
    const treeFilesAndDirs = getFilesAndDirsFromTree();
    if (treeFilesAndDirs.length) {
        return treeFilesAndDirs;
    }
    else {
        const editor = atom.workspace.getActiveTextEditor();
        return (editor && [new atom_1.File(editor.getPath())]) || [];
    }
}
function getFilesAndDirsFromTree() {
    const selectedDirectories = [...document.querySelectorAll(".tree-view:focus .directory.selected > .header > .name")];
    const selectedFiles = [...document.querySelectorAll(".tree-view:focus .file.selected > .name")];
    return selectedDirectories.map(dir => new atom_1.Directory(dir.dataset.path || ""))
        .concat(selectedFiles.map(file => new atom_1.File(file.dataset.path || "")));
}
function getFilesFromTree() {
    return [...document.querySelectorAll(".tree-view:focus .file.selected > .name, .tree-view:focus .selected .file > .name")
    ].map(element => new atom_1.File(element.dataset.path || ""));
}
