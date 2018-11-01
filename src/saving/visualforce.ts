import Project from "../project.js";
import FileInfo from './file-info.js';
import ToolingContainerSave from './tooling-container.js';

export default class VisualforceSave extends ToolingContainerSave {
    constructor(project: Project, entity: string, savedFiles: Array<FileInfo>) {
        super(project, entity, savedFiles, "Markup");
    }

    getDefaultMetadata(): string {
        return `<?xml version="1.0" encoding="UTF-8"?>
<${this.type} xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>${this.project.apiVersion}</apiVersion>
    <label>${this.name}</label>
</${this.type}>`;
    }
}
