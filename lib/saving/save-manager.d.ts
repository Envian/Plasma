import Project from "../project.js";
import FileInfo from "./file-info.js";
export declare function saveFiles(project: Project, files: Array<FileInfo>): Promise<void>;
export declare function deleteFiles(project: Project, files: Array<FileInfo>): Promise<void>;
export interface ComponentMessage {
    fileName: string;
    id: string;
    createdDate: string;
    componentType: string;
    lineNumber: number;
    success: boolean;
    problem: string;
}
