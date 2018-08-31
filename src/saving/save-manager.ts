//import ToolingAPI from "../api/tooling.js";
import { groupby, flatten, chunk } from "../helpers.js";

import Project from "../project.js";
import FileInfo from "./file-info.js";

import CompositeRequest from "../api/tooling/composite-request.js";
//import CRUDRequest, { CRUDResult } from "../api/tooling/crud-sobject.js";

import ToolingSave from "./tooling-save.js";
import ApexSave from "./apex.js";
import VisualforceSave from "./visualforce.js";
import AuraSave from "./aura.js";
import StaticResourceSave from "./staticresource.js";
import ToolingStandaloneSave from './tooling-standalone.js';

export async function saveFiles(project: Project, files: Array<FileInfo>): Promise<void> {
    if (files.every(file => file.isTooling)) {
        toolingSave(project, files);
    } else {
        //TODO: metadataSave(project, files);
        throw Error("Metadata saving not yet implemented");
    }
}

export async function deleteFiles(project: Project, files: Array<FileInfo>): Promise<void> {
    // TODO: Implement
}

// TODO: This needs to handle >25 saves at once. Somehow.
async function toolingSave(project: Project, files: Array<FileInfo>): Promise<void> {
    const filesByFolder = groupby(files, file => file.folderName);
    const containerSaves = getContainerSaves(project, filesByFolder);
    const standaloneSaves = getStandaloneSaves(project, filesByFolder);
    const allSaves = containerSaves.concat(standaloneSaves);

    if (!allSaves.length) {
        atom.notifications.addInfo("No files to save.");
        return;
    }

    // Check for conflicts with the server
    const conflictRequest = new CompositeRequest(false, allSaves.map(save => save.getConflictQuery()));
    await conflictRequest.send(project); // Results are handled via the indiviaual requests.
    await Promise.all(allSaves.map(save => save.handleConflicts()));

    if (allSaves.every(save => save.skip)) {
        atom.notifications.addInfo("No files to save.");
        return;
    }

    // Break standalone and container saves in half. Its easier this way
    const results = await Promise.all([
        saveToolingStandalone(project, standaloneSaves.filter(save => !save.skip)),
    ]);
    if (results.every(result => result)) {
        atom.notifications.addSuccess("Files have successfully saved to server.");
    }
    await project.save();

    //
    // if (!allSaves.length) {
    //     atom.notifications.addInfo("No files to save.");
    //     return;
    // }
    //
    // // Standalone saves come first. Then, if we have a container save, add the requirements for that.
    // let requests = flatten(await Promise.all(standaloneSaves.map(save => save.getSaveRequest("MetadataContainer"))));
    // let containerRequest, containerAsyncRequest : CRUDRequest<any> | undefined;
    // if (containerSaves.length) {
    //     containerRequest = getNewContainerRequest();
    //     containerAsyncRequest = getContainerAsyncRequest();
    //
    //     requests.push(containerRequest);
    //     requests = requests.concat(flatten(await Promise.all(containerSaves.map(save => save.getSaveRequest("MetadataContainer")))));
    //     requests.push(containerAsyncRequest);
    // }
    //
    // await new CompositeRequest(true, requests).send(project);
    //
    // await handleStandaloneSaveResults(standaloneSaves);
    // if (containerSaves.length) {
    //
    // }
}

async function saveToolingStandalone(project: Project, saves: Array<ToolingStandaloneSave>): Promise<boolean> {
    if (!saves.length) return true;

    await Promise.all(chunk(25, flatten(await Promise.all(saves.map(save => save.getSaveRequests()))))
        .map(saveChunk => new CompositeRequest(false, saveChunk).send(project)));
    await Promise.all(saves.map(save => save.handleSaveResult()));

    const errorMessages = saves.filter(save => save.errorMessage).map(save => save.errorMessage).join("\n\n");
    if (errorMessages) {
        atom.notifications.addError("Failed to save Lightning Components and/or Static Resources.", {
            detail: errorMessages,
            dismissable: true
        });
        return false;
    } else {
        return true;
    }
}

// async function handleContainerSaveResults(project: Project, saveRequests: Array<ToolingSave>, requestId: string, containerId: string) {
//     let saveResult;
//     do {
//         sleep(2000);
//         saveResult = await getContainerCheckRequest(requestId).send(project);
//     } while (saveResult.State === "Queued")
//
//     const deleteRequest = getContainerDeleteRequest(containerId);
//
//
//     return deleteRequest;
//
//
//
//     const resultsByFile = groupby(saveResult.DeployDetails.allComponentMessages, result => result.fileName);
//     await Promise.all(containerSaves.map(request => request.handleSaveResult(resultsByFile[request.source.path])));
//     await deleteRequest;
// }

function getContainerSaves(project: Project, filesByFolder: Map<string, Array<FileInfo>>): Array<ToolingSave> {
    const apex = groupby((filesByFolder.get("classes") || []).concat(filesByFolder.get("triggers") || []), file => file.entity);
    const visualforce = groupby((filesByFolder.get("components") || []).concat(filesByFolder.get("pages") || []), file => file.entity);

    return Array.from(apex, ([entity, files]) => new ApexSave(project, entity, files) as ToolingSave)
        .concat(Array.from(visualforce, ([entity, files]) => new VisualforceSave(project, entity, files)));
}

function getStandaloneSaves(project: Project, filesByFolder: Map<string, Array<FileInfo>>): Array<ToolingStandaloneSave> {
    const aura = groupby(filesByFolder.get("aura") || [], file => file.entity);
    const staticresource = groupby(filesByFolder.get("staticresources") || [], file => file.entity);

    return Array.from(aura, ([entity, files]) => new AuraSave(project, entity, files) as ToolingStandaloneSave)
        .concat(Array.from(staticresource, ([entity, files]) => new StaticResourceSave(project, entity, files)));
}

// function getNewContainerRequest(): CRUDRequest<any> {
//     return new CRUDRequest({
//         sobject: "MetadataContainer",
//         method: "POST",
//         referenceId: "MetadataContainer",
//         body: {
//             Name: `Plasma-${Date.now().toString(36)}${Math.floor(Math.random() * (1 << 32)).toString(36)}`
//         }
//     });
// }
//
// function getContainerAsyncRequest(): CRUDRequest<any> {
//     return new CRUDRequest({
//         sobject: "ContainerAsyncRequest",
//         method: "POST",
//         body: {
//             MetadataContainerId: "@{MetadataContainer.id}",
//             IsCheckOnly: false
//         }
//     });
// }
//
// function getContainerCheckRequest(metadataId: string): CRUDRequest<ContainerStatusResult> {
//     return new CRUDRequest<ContainerStatusResult>({
//         sobject: "ContainerAsyncRequest",
//         method: "GET",
//         id: metadataId
//     })
// }
//
// function getContainerDeleteRequest(metadataId: string): CRUDRequest<any> {
//     return new CRUDRequest({
//         sobject: "MetadataContainer",
//         method: "DELETE",
//         id: metadataId
//     })
// }

// interface ContainerStatusResult extends CRUDResult {
//     State: string,
//     DeployDetails: DeployDetails
// }

// interface DeployDetails {
//     allComponentMessages: Array<ComponentMessage>,
//     componentFailures: Array<ComponentMessage>,
//     componentSuccesses: Array<ComponentMessage>
// }
//
// interface ComponentMessage {
//     fileName: string,
//     id: string,
//     lineNumber: number,
//     problem: string,
//     success: boolean
// }
