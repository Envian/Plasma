"use babel";

import Project from "./project.js";

import { File, Directory } from "atom";

const projectCache = new Map();
const emptyDirectories = new Set();

export default {
    register(project) {
        projectCache.set(project.root.getPath(), project);
    },

    // Retrieves an unloaded project for a given directory or file.
    async findProject(fileOrDirectory) {
        if (typeof(fileOrDirectory) === "string") fileOrDirectory = new Directory(fileOrDirectory);

        // Check if a directory is the root directory and already known.
        if (fileOrDirectory.isDirectory()) {
            const existingProject = projectCache.get(fileOrDirectory.getPath());
            if (existingProject) return existingProject;
        }

        const root = getRoot(fileOrDirectory);
        if (root) {
            // if we find a possible root, check to see if its a known project, known empty, or if the config file exists.
            const existingProject = projectCache.get(root.getPath());
            if (existingProject) return existingProject;
            fileOrDirectory = root;
        }

        if (emptyDirectories.has(fileOrDirectory.getPath())) return null;
        if (await this.getConfigFile(fileOrDirectory).exists()) {
            const project = new Project(fileOrDirectory);
            await project.load();
            return project;
        } else {
            addEmptyDirectories(fileOrDirectory);
            return null;
        }
    },
    getConfigFile(fileOrDir) {
        fileOrDir = getRoot(fileOrDir) || fileOrDir;
        if (fileOrDir.getBaseName() === "plasma.json") return fileOrDir;
        if (fileOrDir.getBaseName() === "config") return fileOrDir.getFile("plasma.json");
        return fileOrDir.getSubdirectory("config").getFile("plasma.json");
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

function getRoot(fileOrDir) {
    if (fileOrDir.isFile()) fileOrDir = fileOrDir.getParent();

    while (!fileOrDir.isRoot()) {
        if (fileOrDir.getBaseName() === "src") {
            return fileOrDir.getParent();
        }
        fileOrDir = fileOrDir.getParent();
    }

    return null;
}
