import opn = require("opn");

import { File, Directory } from "atom";

import { getRoot, getProjectForFilesAndDirs, findProjectForDirectory } from "./project-manager.js";
import { saveFiles } from "./saving/save-manager.js";
import Project from "./project.js";
import FileInfo from "./saving/file-info.js";

export default class {
    private constructor() {}

    static async newProject(): Promise<object | void> {
        const selectedPaths = await new Promise((accept: (value: string[] | null) => void) => atom.pickFolder(accept));
        if (selectedPaths && selectedPaths.length) {
            const dir = new Directory(selectedPaths[0]);
            const existingProject = await findProjectForDirectory(dir);

            if (existingProject) {
                atom.notifications.addError("Project already defined at this location. Select a new directory for your project.");
                return;
            }

            const root = getRoot(dir) || dir;
            const project = new Project(root);
            await project.save();

            // Typing fix. project will just be passed through and ignored.
            return atom.workspace.open("plasma://editProject?" + root.getPath());
        }
    }

    static async editProject(): Promise<void> {
        const project = await getProjectForAction();

        if (project) {
            atom.workspace.open("plasma://editProject?" + project.root.getPath());
        } else {
            atom.notifications.addError("No active project to open.");
        }
    }



    static async autoSave(path: string, body: string): Promise<void> {
        const project = await getProjectForAction();
        if (project) {
            saveFiles(project, [new FileInfo(project, path, body)]);
        }
    }

    static async saveToServer(): Promise<void> {
        const files = getFilesFromTree();
        const project = await getProjectForFilesAndDirs(files);
        if (project) {
            saveFiles(project, files.map(file => new FileInfo(project, file.getPath())));
        } else {
            atom.notifications.addError("No project found.");
        }
    }

    static async refreshFromServer(): Promise<void> {
        // TODO: Refresh specific files from the server.
        const project = await getProjectForAction();
        if (project) {
            return project.refreshFromServer();
        } else {
            atom.notifications.addError("No project found.");
        }
    }

    static async deleteFromServer(): Promise<void> {
        const files = getFilesFromTree();
        const project = await getProjectForFilesAndDirs(files);
        if (project) {
            // TODO: Delete Files
            //SaveManager.deleteFiles(project, files.map(file => ({ path: file.getPath() })));
        } else {
            atom.notifications.addError("No project found.");
        }
    }

    static async openSFDC(): Promise<void> {
        // TODO: Add an authentication check. Otherwise, it will ask the user to log in. No Bueno.

        const project = await getProjectForAction();
        if (project) {
            opn(project.connection.baseurl + "/secur/frontdoor.jsp?sid=" + await project.getToken())
        }
    }
}



async function getProjectForAction(): Promise<Project | null> {
    return getProjectForFilesAndDirs(getFilesAndDirsForAction());
}

function getFilesAndDirsForAction(): Array<File | Directory> {
    const treeFilesAndDirs = getFilesAndDirsFromTree();
    if (treeFilesAndDirs.length) {
        return treeFilesAndDirs;
    } else {
        const editor = atom.workspace.getActiveTextEditor();
        return (editor && [new File(editor.getPath() as string)]) || [];
    }
}

function getFilesAndDirsFromTree(): Array<File | Directory> {
    const selectedDirectories = [... document.querySelectorAll(".tree-view:focus .directory.selected > .header > .name")];
    const selectedFiles = [... document.querySelectorAll(".tree-view:focus .file.selected > .name")];
    return (selectedDirectories.map(dir => new Directory((dir as HTMLElement).dataset.path || "")) as Array<File | Directory>)
        .concat(selectedFiles.map(file => new File((file as HTMLElement).dataset.path || "")));
}

function getFilesFromTree(): Array<File> {
    return [... document.querySelectorAll(
        ".tree-view:focus .file.selected > .name, .tree-view:focus .selected .file > .name")
    ].map(element => new File((element as HTMLElement).dataset.path || ""));
}
