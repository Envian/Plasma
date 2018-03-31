"use babel";

import { File, Directory } from "atom";

import ProjectManager from "./project-manager.js";
import ToolingAPI from "./api/tooling.js";


const TOOLING_FOLDERS = new Set([
    "classes", "components", "pages", "triggers"
]);

const FOLDER_TO_TOOLING_TYPE = {
    "classes": "ApexClass",
    "components": "ApexComponent",
    "pages": "ApexPage",
    "triggers": "ApexTrigger"
};

const TYPE_TO_MEMBER = {
    "AuraDefinitionBundle": "AuraDefinition",
    "ApexClass": "ApexClassMember",
    "ApexComponent": "ApexComponentMember",
    "ApexPage": "ApexPageMember",
    "ApexTrigger": "ApexTriggerMember"
};

const TYPE_TO_CONTENT = {
    "ApexClass": "Body",
    "ApexComponent": "Markup",
    "ApexPage": "Markup",
    "ApexTrigger": "Body"
}

export default {
    async saveFile(event) {
        // TODO: Save specific and/or groups of files to the server here
        console.log(event);
        atom.notifications.addError("Not Implemented");
    },

    async autoSaveFile(path, content) {
        const project = await ProjectManager.findProject(path);
        if (project) {
            return saveFiles(project, [{
                path: path,
                content: content
            }]);
        }
    }
}

// Files is a list of Objects, with the following properties:
//  path: full path to the file
//  content: content of the file
// The following are auto populated:
//  relativeFile, relative to project src
//  folder under src.
//  isMetadata: true if this is a -meta.xml file
//  targetFile: the file this metadata describes if this is metadata, otherwise same as relative path,
//  metadata: the xml from the meta xml file
//  name: name of this entity
//  state: an object containing the following fields:
//    Id: object (or 000000000000000AAA if undefined)
//    LastSyncDate,
//    type (API Type)
async function saveFiles(project, files) {
    files = files.map(file => {
        const relativeFile = project.srcFolder.relativize(file.path).replace("\\", "/");
        const folder = relativeFile.substr(0, relativeFile.indexOf("/"));
        const isMetadata = relativeFile.endsWith("-meta.xml")
        const targetFile = isMetadata ? relativeFile.substr(0, relativeFile.indexOf("-meta.xml")) : relativeFile;
        const nameIndex = targetFile.lastIndexOf("/") + 1;

        return {
            path: file.path,
            content: file.content,
            relativeFile,
            targetFile,
            name: targetFile.substring(nameIndex, targetFile.indexOf(".", nameIndex)),
            isMetadata,
            folder,
            state: project.metadata[targetFile]
        };
    });

    if (files.every(file => !file.isMetadata && TOOLING_FOLDERS.has(file.folder))) {
        return saveTooling(project, files);
    } else {
        atom.notifications.addWarning("Unable to save files: Not Supported.");
    }
}

async function saveTooling(project, files) {
    const fileData = (await Promise.all(files.map(async file => {
        if (!file.content) {
            file.content = await new File(file.path).read(true);
        }
        const fileType = FOLDER_TO_TOOLING_TYPE[file.folder];

        let overwrite = false;
        let serverFile;
        if (file.state) {
            [serverFile] = await ToolingAPI.query(project, `
                SELECT Id, LastModifiedDate, LastModifiedById, LastModifiedBy.Name, ${TYPE_TO_CONTENT[fileType]}
                FROM ${fileType}
                WHERE Id = '${file.state.id}'
            `);
            if (serverFile) {
                overwrite = Date.parse(file.state.lastSyncDate) < Date.parse(serverFile.LastModifiedDate);
            } else {
                // What do we do if we have the Id it doesn't exist?
                throw Error("File does not exist: " + file.targetFile);
            }
        } else {
            atom.notifications.addError("Unable to save " + file.name, {
                description: "Refresh From Server to save this file"
            });
        }

        if (overwrite) {
            const response = atom.confirm({
                message: "Overwrite File",
                detailedMessage: `The file ${file.targetFile} has been modified on the server by ${serverFile.LastModifiedBy.Name} on ${new Date(serverFile.lastSyncDate).toLocaleString()}. Do you want to overwrite the file?`,
                buttons: ["Cancel", "Overwrite", "Use Server Copy"]
            });
            switch (response) {
            case 2:
                await project.srcFolder.getFile(file.targetFile).write(serverFile[TYPE_TO_CONTENT[fileType]]);
                project.metadata[file.targetFile] = Object.assign(project.metadata[file.targetFile] || {}, {
                    id: serverFile.Id,
                    lastSyncDate: serverFile.LastModifiedDate,
                    type: fileType
                });
            case 0:
                return null;
            case 1:
                project.metadata[file.targetFile] = Object.assign(project.metadata[file.targetFile] || {}, {
                    id: serverFile.Id,
                    lastSyncDate: serverFile.LastModifiedDate,
                    type: fileType
                });
            }
        }

        return {
            path: file.targetFile,
            state: file.state,
            body: file.content,
            metadata: file.metadata
        };
    }))).filter(file => file);

    if (fileData.length) {
        const saveResults = await ToolingAPI.saveToServer(project, fileData);
        const openEditors = atom.workspace.getTextEditors();

        saveResults.forEach(saveResult => {
            if (saveResult.success) {
                project.metadata[saveResult.fileName] = Object.assign(project.metadata[saveResult.fileName] || {}, {
                    id: saveResult.id,
                    lastSyncDate: saveResult.createdDate,
                    type: saveResult.componentType
                });
            } else {
                const fullPath = project.srcFolder.getFile(saveResult.fileName).getPath();
                openEditors.filter(editor => editor.getPath() === fullPath).forEach(editor => {
                    if (saveResult.lineNumber === undefined) return;

                    const line = editor.getBuffer().getLines()[saveResult.lineNumber - 1] || "";
                    const range = [[saveResult.lineNumber - 1, (saveResult.columnNumber || 0) - 1], [saveResult.lineNumber - 1, line.length]];
                    editor.decorateMarker(editor.markBufferRange(range, {
                        plasma: "compile-error",
                        maintainHistory: true,
                        persistent: false,
                        invalidate: "touch"
                    }), {
                        type: "line",
                        class: "plasma-error"
                    });

                    editor.decorateMarker(editor.markBufferRange(range, {
                        plasma: "compile-error",
                        maintainHistory: true,
                        persistent: false,
                        invalidate: "never"
                    }), {
                        type: "line-number",
                        class: "plasma-error"
                    });

                    atom.notifications.addError(`Failed to save ${saveResult.fullName}`, {
                        description: `Error on line ${saveResult.lineNumber}`,
                        detail: saveResult.problem,
                        dismissable: true
                    });
                });
            }
        });

        if (saveResults.every(result => result.success)) {
            atom.notifications.addSuccess("Successfully saved to server");
            openEditors.forEach(editor => editor.findMarkers({plasma: "compile-error"}).forEach(marker => marker.destroy()));
        }
    }

    project.save();
}
