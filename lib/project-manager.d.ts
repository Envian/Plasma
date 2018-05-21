import Project from "./project.js";
import { File, Directory } from "atom";
export declare function register(project: Project): void;
export declare function findProjectForFile(file: File): Promise<Project | null>;
export declare function findProjectForDirectory(directory: Directory): Promise<Project | null>;
export declare function getProjectForFilesAndDirs(filesOrDirs: Array<File | Directory>): Promise<Project | null>;
export declare function getRoot(fileOrDir: File | Directory): Directory | null;
