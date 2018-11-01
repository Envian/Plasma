import Project from "../project.js";
import FileInfo from "./file-info.js";
import ToolingContainerSave from "./tooling-container.js";
export default class ApexSave extends ToolingContainerSave {
    constructor(project: Project, entity: string, savedFiles: Array<FileInfo>);
    getDefaultMetadata(): string;
}
