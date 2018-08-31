import Project, { FileStatus } from "../../project.js";
export default function retrieve(project: Project): Promise<RetreiveResult>;
export interface RetreiveResult {
    zip: any;
    files: FileStatus;
}
