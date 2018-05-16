"use babel";

import ToolingAPI from "../api/tooling.js";
import { sleep, transpose, mapby, groupby } from "../helpers.js";

import ApexSave from "./apex.js";
import VisualforceSave from "./visualforce.js";
import StaticResourceSave from "./staticresource.js";
import AuraSave from "./aura.js";

export default { saveFiles };

const TOOLING_FOLDERS = new Set([
    "aura", "classes", "components", "pages", "staticresources", "triggers"
]);

// Takes in a list of files objects. Files have the following fields.
//  path: (REQ) the file's path relative to src.
//  body: this file's body if available
// populates:
//  target (removes -meta.xml)
//  folder
async function saveFiles(project, files) {
    files.forEach(file => {
        file.path = project.srcFolder.relativize(file.path).replace(/\\/g, "/");
        file.folder = file.path.substr(0, file.path.indexOf("/"));
        file.target = getTarget(file.path);
    });

    if (files.every(file => TOOLING_FOLDERS.has(file.folder))) {
        saveTooling(project, files);
    } else {
        // TODO: Handle non-tooling file saves.
    }
}

async function deleteFiles(project, files) {
    files.forEach(file => {
        file.path = project.srcFolder.relativize(file.path).replace(/\\/g, "/");
        file.folder = file.path.substr(0, file.path.indexOf("/"));
        file.target = getTarget(file.path);
    });

    if (files.every(file => TOOLING_FOLDERS.has(file.folder))) {
        deleteTooling(project, files);
    } else {
        // TODO: Handle non-tooling file saves.
    }
}

async function saveTooling(project, files) {
    files = groupby(files, file => file.target);
    let containerSaves = [];
    let standaloneSaves = [];

    Object.entries(files).forEach(([path, savedFiles]) => {
        switch (path.substr(0, path.indexOf("/"))) {
            case "classes":
            case "triggers":
                containerSaves.push(new ApexSave(project, path, savedFiles));
                return;
            case "components":
            case "pages":
                containerSaves.push(new VisualforceSave(project, path, savedFiles));
                return;
            case "aura":
                standaloneSaves.push(new AuraSave(project, path, savedFiles));
                return;
            case "staticresources":
                standaloneSaves.push(new StaticResourceSave(project, path, savedFiles));
                return;
        }
    });

    const allRequests = containerSaves.concat(standaloneSaves);
    const conflictQueries = allRequests.map(save => save.getConflictQuery());
    await new ToolingAPI.CompositeRequest({ requests: conflictQueries }).send(project);
    await Promise.all(allRequests.map(request => request.checkConflicts()));

    containerSaves = containerSaves.filter(save => !save.skip);
    standaloneSaves = standaloneSaves.filter(save => !save.skip);

    await Promise.all(allRequests.map(request => request.loadFiles()));
    await Promise.all(allRequests.map(request => request.prepareSave()));


    if (containerSaves.length == 0 && standaloneSaves.length == 0) {
        atom.notifications.addInfo("No Files to save.");
        return;
    }

    const deploy = new ToolingAPI.CompositeRequest({});
    deploy.addAll(await getStandaloneSaves(standaloneSaves));

    const [metadataContainerRequest, deployRequest] = containerSaves.length ? getContainerRequests() : [];
    if (containerSaves.length) {
        deploy.add(metadataContainerRequest);
        for (const save of containerSaves) {
            deploy.addAll(save.getSaveRequest("MetadataContainer"));
        }
        deploy.add(deployRequest);
    }

    await deploy.send(project);
    await Promise.all(standaloneSaves.map(save => save.handleSaveResult()));

    if (containerSaves.length) {
        let saveResult;
        do {
            sleep(2000);
            saveResult = await new ToolingAPI.CRUDRequest({
                sobject: "ContainerAsyncRequest",
                method: "GET",
                id: (await deployRequest.result).id
            }).send(project);
        } while (saveResult.State === "Queued")

        const deleteRequest = new ToolingAPI.CRUDRequest({
            sobject: "MetadataContainer",
            method: "DELETE",
            id: (await metadataContainerRequest.result).id
        }).send(project);

        // TODO: Map by not name. name can change?
console.log(saveResult);

        const resultsByFile = groupby(saveResult.DeployDetails.allComponentMessages, result => result.fileName);
        await Promise.all(containerSaves.map(request => request.handleSaveResult(resultsByFile[request.source.path])));
        await deleteRequest;
    }
    if (containerSaves.concat(standaloneSaves).every(save => save.success)) {
        atom.notifications.addSuccess("Successfully saved to server");
    }
    await project.save();
}

async function deleteTooling(project, files) {
    files = groupby(files, file => file.target);

}

async function getStandaloneSaves(saves) {
    let requests = [];
    for (const save of saves) {
        requests = requests.concat(await save.getSaveRequest("MetadataContainer"));
    }
    return requests;
}

function getContainerRequests() {
    return [
        new ToolingAPI.CRUDRequest({
            sobject: "MetadataContainer",
            method: "POST",
            referenceId: "MetadataContainer",
            body: {
                Name: `Plasma-${Date.now().toString(36)}${Math.floor(Math.random() * (1 << 32)).toString(36)}`
            }
        }),
        new ToolingAPI.CRUDRequest({
            sobject: "ContainerAsyncRequest",
            method: "POST",
            body: {
                MetadataContainerId: "@{MetadataContainer.id}",
                IsCheckOnly: false
            }
        })
    ];
}

function getTarget(path) {
    const subdir = path.indexOf("/") + 1;
    const nextdir = path.indexOf("/", subdir);
    const meta = path.indexOf("-meta.xml");

    if (nextdir === -1 && meta === -1) {
        return path;
    } else if (meta !== -1) {
        return path.substr(0, meta);
    } else {
        return path.substr(0, nextdir);
    }
}
