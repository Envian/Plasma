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
    openSFDC
}

export async function autoSave(event, body) {
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

export async function newProject(event) {
    const project = await getProjectFromTree(event);

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
    const project = await getProjectForEvent(event);

    if (project) {
        atom.workspace.open("plasma://editProject", project);
    } else {
        atom.notifications.addError("No active project to open.");
    }
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

function getElementForEvent(event) {
    if (!event || !event.target) return null;

    if (event.target.classList.contains("name")) return event.target;
    else if (event.target.classList.contains("file")) return event.target.lastChild;
    else if (event.target.classList.contains("header")) return event.target.lastChild;
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
    const element = getElementForEvent(event);
    const editor = atom.workspace.getActiveTextEditor();
    return element && element.dataset.path || editor && editor.getPath();
}
