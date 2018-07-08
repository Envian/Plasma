"use babel";

//import ToolingAPI from "../api/tooling.js";
import { sleep, groupby, flatten } from "../helpers.js";

import Project from "../project.js";
import FileInfo from "./file-info.js";

import CompositeRequest from "../api/tooling/composite-request.js";
import ToolingRequest from "../api/tooling/tooling-request.js";
import CRUDRequest from "../api/tooling/crud-sobject.js";

import ToolingSave from "./tooling-save.js";
import ApexSave from "./apex.js";
import AuraSave from "./aura.js";
import StaticResourceSave from "./staticresource.js";
import VisualforceSave from "./visualforce.js";

export default async function(project: Project, files: Array<FileInfo>): Promise<void> {
    if (files.every(file => file.isTooling)) {
        toolingSave(project, files);
    } else {
        //TODO: metadataSave(project, files);
        throw Error("Metadata saving not yet implemented");
    }
}

// TODO: This needs to handle >25 saves at once. Somehow.
async function toolingSave(project: Project, files: Array<FileInfo>): Promise<void> {
    const filesByFolder = groupby(files, file => file.folderName);
    let containerSaves = getContainerSaves(project, filesByFolder);
    let standaloneSaves = getStandaloneSaves(project, filesByFolder);
    let allSaves = containerSaves.concat(standaloneSaves);

    // Check for conflicts with the server
    const conflictRequest = new CompositeRequest(false, allSaves.map(save => save.getConflictQuery()));
    await conflictRequest.send(project); // Results are handled via the indiviaual requests.
    await Promise.all(allSaves.map(save => save.handleConflicts()));

    containerSaves = containerSaves.filter(save => !save.skip);
    standaloneSaves = standaloneSaves.filter(save => !save.skip);
    allSaves = allSaves.filter(save => !save.skip);

    if (!allSaves.length) {
        atom.notifications.addInfo("No files to save.");
        return;
    }

    // Standalone saves come first. Then, if we have a container save, add the requirements for that.
    let requests = flatten(await Promise.all(standaloneSaves.map(save => save.getSaveRequest("MetadataContainer"))));
    let containerAsyncRequest: CRUDRequest<any> | undefined;
    if (containerSaves.length) {
        const containerRequests = buildContainerRequests(
            flatten(await Promise.all(containerSaves.map(save => save.getSaveRequest("MetadataContainer"))))
        );
        requests = requests.concat(containerRequests[0]);
        containerAsyncRequest = requests[1];
    }

    await new CompositeRequest(true, requests).send(project);

    // Standalone saves can be handled without further work.
    await Promise.all(standaloneSaves.map(save => save.handleSaveResult()));

    // Container saves need to poll for results.
    if (containerSaves.length && containerAsyncRequest) {
        const asyncRequestId = (await containerAsyncRequest.getResult()).Id;
        let saveResult;
        do {
            sleep(2000);
            saveResult = await getContainerCheckRequest(asyncRequestId).send(project);
        } while (saveResult.State === "Queued");

        // Get the delete request started now, incase of any errors.
        const deleteRequest = getContainerDeleteRequest(asyncRequestId).send(project);

        // TODO: Get statuses and assign them to the various save requests.


        await deleteRequest;
    }

    await project.save();
}

function getContainerSaves(project: Project, filesByFolder: Map<string, Array<FileInfo>>): Array<ToolingSave> {
    const apex = groupby((filesByFolder.get("classes") || []).concat(filesByFolder.get("triggers") || []), file => file.entity);
    const visualforce = groupby((filesByFolder.get("components") || []).concat(filesByFolder.get("pages") || []), file => file.entity);

    return Object.entries(apex).map(([entity, files]) => new ApexSave(project, entity, files) as ToolingSave)
        .concat(Object.entries(visualforce).map(([entity, files]) => new VisualforceSave(project, entity, files)));
}

function getStandaloneSaves(project: Project, filesByFolder: Map<string, Array<FileInfo>>): Array<ToolingSave> {
    const aura = groupby(filesByFolder.get("aura") || [], file => file.entity);
    const staticresource = groupby(filesByFolder.get("staticresources") || [], file => file.entity);

    return Object.entries(aura).map(([entity, files]) => new AuraSave(project, entity, files) as ToolingSave)
        .concat(Object.entries(staticresource).map(([entity, files]) => new StaticResourceSave(project, entity, files)));
    return [];
}

function buildContainerRequests(saves: Array<ToolingRequest<any>>): [Array<CRUDRequest<any>>, CRUDRequest<any>] {
    const asyncRequest = new CRUDRequest({
        sobject: "ContainerAsyncRequest",
        method: "POST",
        body: {
            MetadataContainerId: "@{MetadataContainer.id}",
            IsCheckOnly: false
        }
    });
    return [[
        new CRUDRequest({
            sobject: "MetadataContainer",
            method: "POST",
            referenceId: "MetadataContainer",
            body: {
                Name: `Plasma-${Date.now().toString(36)}${Math.floor(Math.random() * (1 << 32)).toString(36)}`
            }
        }),
        ...saves,
        asyncRequest
    ], asyncRequest];
}

function getContainerCheckRequest(metadataId: string): CRUDRequest<any> {
    return new CRUDRequest({
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
