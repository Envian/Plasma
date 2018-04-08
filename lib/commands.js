"use babel";

import { File, Directory } from "atom";

import ProjectManager from "./project-manager.js";
import SaveManager from "./saving/save-manager.js";

export async function autoSave(path, body) {
    const project = await ProjectManager.findProject(new File(path));
    if (project) {
        SaveManager.saveFiles(project, [{ path, body }]);
    }
}

export async function refreshFromServer(event) {
    const editor = atom.workspace.getActiveTextEditor();
    const path = getTargetFile(event) || (editor && editor.getPath());
    const project = await ProjectManager.findProject(path);
    if (project) {
        return project.refreshFromServer();
    } else {
        atom.notifications.addError("No project found.");
    }
}

export async function newProject(event) {
    let path = getTargetFile(event);
    if (path) {
        const project = await ProjectManager.findProject(path);
        if (project) path = ""; // don't new project over an existing one
    }

    // Predict the root directory
    if (path) {
        let dir = new Directory(path);
        while (!dir.isRoot()) {
            if (dir.getBaseName() === "src") {
                path = dir.getParent().getPath();
                break;
            }
            dir = dir.getParent();
        }
    }

    atom.workspace.open("plasma://editProject", path);
}

export async function editProject(event) {
    const path = getTargetFile(event);

    if (path) {
        const project = await ProjectManager.findProject(path);
        if (project) {
            atom.workspace.open("plasma://editProject", project);
        } else {
            atom.notifications.addError("No project found.");
        }
    } else {
        atom.notifications.addError("No active project to open.");
    }
}

function getTargetFile(event) {
    if (event && event.target && event.target.nodeName === "LI" && event.target.lastChild && event.target.lastChild.dataset.path) return event.target.lastChild.dataset.path;
    if (event && event.target && event.target.dataset.path) return event.target.dataset.path;

    const editor = atom.workspace.getActiveTextEditor();
    return editor && editor.getPath() || "";
}
