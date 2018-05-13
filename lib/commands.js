"use babel";

import opn from "opn";

import { File, Directory } from "atom";

import { getFilesAndDirectoriesForAction } from "./helpers.js";

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
    const project = await getProjectFromTree(event);

    // Don't create projects over others.
    if (project) {
        return atom.workspace .open("plasma://editProject", "");
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
    const project = await getProjectForEvent(event);

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

export async function saveToServer(event) {
    const project = await getProjectForEvent(event);
    const file = getFileFromEventOrActive(event);
    if (project) {
        SaveManager.saveFiles(project, [{ path: file }]);
    }
}

export async function refreshFromServer(event) {
    const project = await getProjectForEvent(event);
    if (project) {
        return project.refreshFromServer();
    } else {
        atom.notifications.addError("No project found.");
    }
}

export async function deleteFromServer() {
    const selectedFiles = getFilesAndDirectoriesForAction();
    console.log(selectedFiles);
    console.log(await ProjectManager.getProjectForFilesAndDirs(selectedFiles));
}

export async function openSFDC(event) {
    const project = await getProjectForEvent(event);
    if (project) {
        opn(project.connection.baseurl + "/secur/frontdoor.jsp?sid=" + await project.getToken())
    }
}




function getProjectForEvent(event) {
    return getProjectFromTree(event) || getProjectFromActive() || getProjectFromProject();
}

function getProjectFromTree(event) {
    const target = getElementForEvent(event);

    if (target && target.dataset.path) {
        if (target.parentElement.parentElement.classList.contains("directory")) {
            return ProjectManager.findProjectForDirectory(target.dataset.path);
        } else if (target.parentElement.classList.contains("file")) {
            return ProjectManager.findProjectForFile(target.dataset.path);
        }
    }
    return null;
}

function getProjectFromActive() {
    const editor = atom.workspace.getActiveTextEditor();
    if (editor) {
        return ProjectManager.findProjectForFile(editor.getPath());
    }
}

function getProjectFromProject() {
    // TODO: Search the atom project for a project folder.
}

function getFileFromEventOrActive(event) {
    const selectedFromTree = getSelectedFilesAndDirectories();
    if (selectedFromTree) return selectedFromTree;

    const element = getElementForEvent(event);
    const editor = atom.workspace.getActiveTextEditor();
    return element && element.dataset.path || editor && editor.getPath();
}
