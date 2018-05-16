"use babel";

import opn from "opn";

import { File, Directory } from "atom";

import ProjectManager from "./project-manager.js";
import SaveManager from "./saving/save-manager.js";

export default {
    autoSave,
    refreshFromServer,
    newProject,
    editProject,
    saveToServer,
    deleteFromServer,
    openSFDC
}

export async function newProject(event) {
    const project = await getProjectForAction();

    // Don't create projects over others.
    if (project) {
        return atom.workspace.open("plasma://editProject", "");
    }

    const target = getElementForEvent(event);
    console.log(target);
    if (target) {
        const root = ProjectManager.getRoot(new Directory(target.dataset.path));
        return atom.workspace.open("plasma://editProject", root && root.getPath() || target.dataset.path);
    }

    return atom.workspace.open("plasma://editProject", "");
}

export async function editProject(event) {
    const project = await getProjectForAction();

    if (project) {
        atom.workspace.open("plasma://editProject", project);
    } else {
        atom.notifications.addError("No active project to open.");
    }
}



export async function autoSave(event, body) {
    return; // TEMP: Disabling auto save.

    const project = await ProjectManager.findProjectForFile(new File(event.path));
    if (project) {
        SaveManager.saveFiles(project, [{ path: event.path, body }]);
    }
}

export async function saveToServer() {
    const files = getFilesFromTree();
    const project = await ProjectManager.getProjectForFilesAndDirs(files);
    if (project) {
        SaveManager.saveFiles(project, files.map(file => ({ path: file.getPath() })));
    } else {
        atom.notifications.addError("No project found.");
    }
}

export async function refreshFromServer() {
    // TODO: Refresh specific files from the server.
    const project = await getProjectForAction();
    if (project) {
        return project.refreshFromServer();
    } else {
        atom.notifications.addError("No project found.");
    }
}

export async function deleteFromServer() {
    const files = getFilesFromTree();
    const project = await ProjectManager.getProjectForFilesAndDirs(files);
    if (project) {
        SaveManager.deleteFiles(project, files.map(file => ({ path: file.getPath() })));
    } else {
        atom.notifications.addError("No project found.");
    }
}

export async function openSFDC(event) {
    // TODO: Add an authentication check. Otherwise, it will ask the user to log in. No Bueno.

    const project = await getProjectForAction();
    if (project) {
        opn(project.connection.baseurl + "/secur/frontdoor.jsp?sid=" + await project.getToken())
    }
}




async function getProjectForAction() {
    return ProjectManager.getProjectForFilesAndDirs(getFilesAndDirsForAction());
}

function getFilesAndDirsForAction() {
    const treeFilesAndDirs = getFilesAndDirsFromTree();
    if (treeFilesAndDirs.length) {
        return treeFilesAndDirs;
    } else {
        const editor = atom.workspace.getActiveTextEditor();
        return (editor && [new File(editor.getPath())]) || [];
    }
}

function getFilesAndDirsFromTree() {
    const selectedDirectories = [... document.querySelectorAll(".tree-view:focus .directory.selected > .header > .name")];
    const selectedFiles = [... document.querySelectorAll(".tree-view:focus .file.selected > .name")];
    const treeFilesAndDirs = selectedDirectories.map(dir => new Directory(dir.dataset.path))
        .concat(selectedFiles.map(file => new File(file.dataset.path)));
    return treeFilesAndDirs;
}

function getFilesFromTree() {
    return [... document.querySelectorAll(
        ".tree-view:focus .file.selected > .name, .tree-view:focus .selected .file > .name")
    ].map(element => new File(element.dataset.path));
}
