//import ToolingAPI from "../api/tooling.js";
import { groupby, flatten, chunk, sleep } from "../helpers.js";

import Project from "../project.js";
import FileInfo from "./file-info.js";

import CompositeRequest from "../api/tooling/composite-request.js";
//import CRUDRequest, { CRUDResult } from "../api/tooling/crud-sobject.js";

import ApexSave from "./apex.js";
import VisualforceSave from "./visualforce.js";
import AuraSave from "./aura.js";
import StaticResourceSave from "./staticresource.js";
import ToolingStandaloneSave from "./tooling-standalone.js";
import ToolingContainerSave from "./tooling-container.js";
import CRUDRequest, { CRUDResult } from "../api/tooling/crud-sobject.js";
import ToolingSave from "./tooling-save.js";

export async function saveFiles(project: Project, files: Array<FileInfo>): Promise<void> {
    if (files.every(file => file.isTooling)) {
        await toolingSave(project, files);
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
    const allSaves = (containerSaves as Array<ToolingSave>).concat(standaloneSaves);

    if (!allSaves.length) {
        atom.notifications.addInfo("No files to save.");
        return;
    }

    // Check for conflicts with the server
    const conflictRequest = new CompositeRequest(false, allSaves.map(save => save.getConflictQuery()));
    await conflictRequest.send(project); // Results are handled via the indiviaual requests.
    await Promise.all(allSaves.map(save => save.handleQueryResult()));

    if (allSaves.every(save => save.skip)) {
        atom.notifications.addInfo("No files to save.");
        return;
    }

    // Break standalone and container saves in half. Its easier this way
    const results = await Promise.all([
        saveToolingStandalone(project, standaloneSaves.filter(save => !save.skip)),
        saveToolingContainer(project, containerSaves.filter(save => !save.skip))
    ]);
    if (results.every(result => !!result)) {
        atom.notifications.addSuccess("Files have successfully saved to server.");
    }
    await project.save();
}

async function saveToolingStandalone(project: Project, saves: Array<ToolingStandaloneSave>): Promise<boolean> {
    if (!saves.length) return true;

    // TODO: This tries to bulkify standalone saves but this will break bundles if too many try to save at once.
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

async function saveToolingContainer(project: Project, saves: Array<ToolingContainerSave>) {
    if (!saves.length) return true;

    const containerRequest = getNewContainerRequest();
    const compileRequest = getContainerAsyncRequest();
    const saveRequests = [
        containerRequest,
        ... flatten(await Promise.all(saves.map(save => save.getSaveRequests("MetadataContainer")))),
        compileRequest
    ];
    await new CompositeRequest(true, saveRequests).send(project);

    console.log(saveRequests);
    const containerId = containerRequest.result.id;
    const asyncRequestId = compileRequest.result.id;

    let saveResult: ContainerStatusResult;
    do {
        sleep(2000); // TODO: Allow sleep time to be configured
        saveResult = await getContainerCheckRequest(asyncRequestId).send(project) as ContainerStatusResult;
    } while (saveResult.State === "Queued")

    // Dont' let the container stick around after we're done
    await getContainerDeleteRequest(containerId).send(project);

    // TODO: If a file saves, but has a diferent name than what we have locally (A file named MyClass.cls containing a class called myService)
    // it will not be possible to link any errors back to it (unless order is preserved in the results)
    const resultsByFile = groupby(saveResult.DeployDetails.allComponentMessages, result => result.fileName);
    await Promise.all(saves.map(save => save.handleSaveResult(resultsByFile.get(save.entity) || [])));

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

function getContainerSaves(project: Project, filesByFolder: Map<string, Array<FileInfo>>): Array<ToolingContainerSave> {
    const apex = groupby((filesByFolder.get("classes") || []).concat(filesByFolder.get("triggers") || []), file => file.entity);
    const visualforce = groupby((filesByFolder.get("components") || []).concat(filesByFolder.get("pages") || []), file => file.entity);

    return Array.from(apex, ([entity, files]) => new ApexSave(project, entity, files) as ToolingContainerSave)
        .concat(Array.from(visualforce, ([entity, files]) => new VisualforceSave(project, entity, files)));
}

function getStandaloneSaves(project: Project, filesByFolder: Map<string, Array<FileInfo>>): Array<ToolingStandaloneSave> {
    const aura = groupby(filesByFolder.get("aura") || [], file => file.entity);
    const staticresource = groupby(filesByFolder.get("staticresources") || [], file => file.entity);

    return Array.from(aura, ([entity, files]) => new AuraSave(project, entity, files) as ToolingStandaloneSave)
        .concat(Array.from(staticresource, ([entity, files]) => new StaticResourceSave(project, entity, files)));
}

function getNewContainerRequest(): CRUDRequest<any> {
    return new CRUDRequest({
        sobject: "MetadataContainer",
        method: "POST",
        referenceId: "MetadataContainer",
        body: {
            Name: `Plasma-${Date.now().toString(36)}${Math.floor(Math.random() * (1 << 32)).toString(36)}`
        }
    });
}

function getContainerAsyncRequest(): CRUDRequest<any> {
    return new CRUDRequest({
        sobject: "ContainerAsyncRequest",
        method: "POST",
        body: {
            MetadataContainerId: "@{MetadataContainer.id}",
            IsCheckOnly: false
        }
    });
}

function getContainerCheckRequest(metadataId: string): CRUDRequest<ContainerStatusResult> {
    return new CRUDRequest<ContainerStatusResult>({
        sobject: "ContainerAsyncRequest",
        method: "GET",
        id: metadataId
    })
}

function getContainerDeleteRequest(metadataId: string): CRUDRequest<any> {
    return new CRUDRequest({
        sobject: "MetadataContainer",
        method: "DELETE",
        id: metadataId
    })
}

interface ContainerStatusResult extends CRUDResult {
    State: string,
    DeployDetails: DeployDetails
}

interface DeployDetails {
    allComponentMessages: Array<ComponentMessage>,
    componentFailures: Array<ComponentMessage>,
    componentSuccesses: Array<ComponentMessage>
}

export interface ComponentMessage {
    fileName: string;
    id: string;
    createdDate: string;
    componentType: string;
    lineNumber: number;
    success: boolean;
    problem: string;
}
