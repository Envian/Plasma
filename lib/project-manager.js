"use babel";

import Project from "./project.js";

import { File, Directory } from "atom";

const projectCache = new Map();
const emptyDirectories = new Set();
const PLASMA_FOLDERS = new Set(["src", "config"]);

export default {
    register(project) {
        projectCache.set(project.root.getPath(), project);
    },

    // Retrieves an unloaded project for a given directory or file.
    async findProjectForFile(file) {
        if (typeof(file) === "string") file = new File(file);
        if (file instanceof Directory) throw Error("Expected a File got a Directory.");

        const root = this.getRoot(file);
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
    },

    async findProjectForDirectory(directory) {
        if (typeof(directory) === "string") directory = new Directory(directory);
        if (directory instanceof File) throw Error("Expected a Directory got a File.");

        const root = this.getRoot(directory) || directory;

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
    },

    async getProjectForFilesAndDirs(filesOrDirs) {
        let project;
        for (const fileOrDir of filesOrDirs) {
            const foundProject = (fileOrDir instanceof File) ?
                await this.findProjectForFile(fileOrDir) :
                await this.findProjectForDirectory(fileOrDir);

            if (foundProject) {
                if (project && project !== foundProject) {
                    throw Error("Selected files or directories have different projects.")
                }
                project = foundProject;
            }
        }
        return project;
    },

    getRoot(fileOrDir) {
        if (fileOrDir.isFile()) fileOrDir = fileOrDir.getParent();

        while (!fileOrDir.isRoot()) {
            if (PLASMA_FOLDERS.has(fileOrDir.getBaseName())) {
                return fileOrDir.getParent();
            }
            fileOrDir = fileOrDir.getParent();
        }

        return null;
    }
}

// When there is no project found, mark this and all parent directories as "known not-projects"
function addEmptyDirectories(fileOrDir) {
    if (fileOrDir.isFile()) fileOrDir = fileOrDir.getParent();
    while (!fileOrDir.isRoot()) {
        emptyDirectories.add(fileOrDir.getPath());
        fileOrDir = fileOrDir.getParent();
    }
}
