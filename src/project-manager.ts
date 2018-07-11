import Project from "./project.js";

import { File, Directory } from "atom";

const projectCache = new Map<string, Project>();
const emptyDirectories = new Set();
const PLASMA_FOLDERS = new Set(["src", "config"]);

export function register(project: Project): void {
    const path = project.root.getPath();
    if (projectCache.has(path)) {
        throw Error("Project already exists.");
    }
    projectCache.set(path, project);
}

// Retrieves an unloaded project for a given directory or file.
export async function findProjectForFile(file : File): Promise<Project | null> {
    const root = getRoot(file);
    if (root) {
        // check for an existing project before checking for a blacklisted folder just incase a project got created.
        const existingProject = projectCache.get(root.getPath());
        if (existingProject) return existingProject;

        if (emptyDirectories.has(file.getParent().getPath())) {
            return null;
        }

        if (await root.getFile("config/plasma.json").exists()) {
            const project = new Project(root);
            await project.load();
            return project;
        }
    }

    addEmptyDirectories(file.getParent());
    return null;
}

export async function findProjectForDirectory(directory: Directory): Promise<Project | null> {
    const root = getRoot(directory) || directory;

    // Check if a directory is the root directory and already known.
    const existingProject = projectCache.get(root.getPath());
    if (existingProject) return existingProject;
    if (emptyDirectories.has(root.getPath())) {
        return null;
    }

    if (await root.getFile("config/plasma.json").exists()) {
        const project = new Project(root);
        await project.load();
        return project;
    } else {
        addEmptyDirectories(directory);
        return null;
    }
}

export async function getProjectForFilesAndDirs(filesOrDirs: Array<File | Directory>): Promise<Project | null> {
    if (!filesOrDirs.length) return null;

    const projects = await Promise.all(filesOrDirs.map(
        fileOrDir => (fileOrDir instanceof File) ?
            findProjectForFile(fileOrDir) :
            findProjectForDirectory(fileOrDir)
    ));
    const project = projects[0];
    for (let i = 1; i < projects.length; i++) {
        if (project !== projects[i]) {
         throw Error("Not all files and directories belong to the same project.");
        }
    }
    return project;
}

export function getRoot(fileOrDir: File | Directory): Directory | null {
    if (fileOrDir.isFile()) fileOrDir = fileOrDir.getParent();

    while (!fileOrDir.isRoot()) {
        if (PLASMA_FOLDERS.has(fileOrDir.getBaseName())) {
            return fileOrDir.getParent();
        }
        fileOrDir = fileOrDir.getParent();
    }

    return null;
}

// When there is no project found, mark this and all parent directories as "known not-projects"
function addEmptyDirectories(fileOrDir: File | Directory) {
    if (fileOrDir.isFile()) fileOrDir = fileOrDir.getParent();
    while (!fileOrDir.isRoot()) {
        emptyDirectories.add(fileOrDir.getPath());
        fileOrDir = fileOrDir.getParent();
    }
}
