import { FileStatus } from "../../project.js";
export default function retrieve(project: any): Promise<RetreiveResult>;
export interface RetreiveResult {
    zip: any;
    files: FileStatus;
}
