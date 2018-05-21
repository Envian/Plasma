"use strict";
"use babel";
Object.defineProperty(exports, "__esModule", { value: true });
const project_js_1 = require("./project.js");
const atom_1 = require("atom");
const projectCache = new Map();
const emptyDirectories = new Set();
const PLASMA_FOLDERS = new Set(["src", "config"]);
function register(project) {
    const path = project.root.getPath();
    if (projectCache.has(path)) {
        throw Error("Project already exists.");
    }
    projectCache.set(path, project);
}
exports.register = register;
async function findProjectForFile(file) {
    const root = getRoot(file);
    if (root) {
        const existingProject = projectCache.get(root.getPath());
        if (existingProject)
            return existingProject;
        if (emptyDirectories.has(file.getParent().getPath())) {
            return null;
        }
        if (await root.getFile("config/plasma.json").exists()) {
            const project = new project_js_1.default(root);
            await project.load();
            return project;
        }
    }
    addEmptyDirectories(file.getParent());
    return null;
}
exports.findProjectForFile = findProjectForFile;
async function findProjectForDirectory(directory) {
    const root = getRoot(directory) || directory;
    const existingProject = projectCache.get(root.getPath());
    if (existingProject)
        return existingProject;
    if (emptyDirectories.has(root.getPath())) {
        return null;
    }
    if (await root.getFile("config/plasma.json").exists()) {
        const project = new project_js_1.default(root);
        await project.load();
        return project;
    }
    else {
        addEmptyDirectories(directory);
        return null;
    }
}
exports.findProjectForDirectory = findProjectForDirectory;
async function getProjectForFilesAndDirs(filesOrDirs) {
    if (!filesOrDirs.length)
        return null;
    const projects = await Promise.all(filesOrDirs.map(fileOrDir => (fileOrDir instanceof atom_1.File) ?
        findProjectForFile(fileOrDir) :
        findProjectForDirectory(fileOrDir)));
    const project = projects[0];
    for (let i = 1; i < projects.length; i++) {
        if (project !== projects[i]) {
            throw Error("Not all files and directories belong to the same project.");
        }
    }
    return project;
}
exports.getProjectForFilesAndDirs = getProjectForFilesAndDirs;
function getRoot(fileOrDir) {
    if (fileOrDir.isFile())
        fileOrDir = fileOrDir.getParent();
    while (!fileOrDir.isRoot()) {
        if (PLASMA_FOLDERS.has(fileOrDir.getBaseName())) {
            return fileOrDir.getParent();
        }
        fileOrDir = fileOrDir.getParent();
    }
    return null;
}
exports.getRoot = getRoot;
function addEmptyDirectories(fileOrDir) {
    if (fileOrDir.isFile())
        fileOrDir = fileOrDir.getParent();
    while (!fileOrDir.isRoot()) {
        emptyDirectories.add(fileOrDir.getPath());
        fileOrDir = fileOrDir.getParent();
    }
}
