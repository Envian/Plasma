"use strict";
"use babel";
Object.defineProperty(exports, "__esModule", { value: true });
const opn = require("opn");
const atom_1 = require("atom");
const project_manager_js_1 = require("./project-manager.js");
const save_manager_js_1 = require("./saving/save-manager.js");
const file_info_js_1 = require("./saving/file-info.js");
class default_1 {
    static async newProject() {
        const project = await getProjectForAction();
        if (project) {
            return atom.workspace.open("plasma://editProject");
        }
        const target = getFilesAndDirsForAction();
        if (target && target.length === 1) {
            const root = project_manager_js_1.getRoot(target[0]) || target[0];
            return atom.workspace.open("plasma://editProject?" + root.getPath());
        }
        return atom.workspace.open("plasma://editProject");
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
            save_manager_js_1.default(project, [new file_info_js_1.default(project, path, body)]);
        }
    }
    static async saveToServer() {
        const files = getFilesFromTree();
        const project = await project_manager_js_1.getProjectForFilesAndDirs(files);
        if (project) {
            save_manager_js_1.default(project, files.map(file => new file_info_js_1.default(project, file.getPath())));
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
