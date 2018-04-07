"use babel";

import ToolingAPI from "../api/tooling.js";
import { sleep, transpose, mapby, groupby } from "../helpers.js";

import ApexSave from "./apex.js";
import VisualforceSave from "./visualforce.js";

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
        file.path = project.srcFolder.relativize(file.path).replace("\\", "/");
        file.folder = file.path.substr(0, file.path.indexOf("/"));
        file.target = file.path.endsWith("-meta.xml") ? file.path.substr(file.path.indexOf("-meta.xml")) : file.path;
    });

    if (files.every(file => TOOLING_FOLDERS.has(file.folder))) {
        saveTooling(project, files);
    } else {
        // what do ?
    }
}

async function saveTooling(project, files) {
    files = groupby(files, file => file.target);
    let saveRequests = Object.entries(files).map(([name, savedFiles]) => {
        switch (name.substr(0, name.indexOf("/"))) {
            case "classes":
            case "triggers":
                return new ApexSave(project, name, savedFiles);
            case "components":
            case "pages":
                return new VisualforceSave(project, name, savedFiles);
            case "arua":
                // TODO
            case "staticresources":
                //TODO
        }
    });

    const conflictQueries = await Promise.all(saveRequests.map(save => save.getConflictQuery()));
    await new ToolingAPI.CompositeRequest({ requests: conflictQueries }).send(project);
    await Promise.all(saveRequests.map(request => request.checkConflicts()));
    saveRequests = saveRequests.filter(file => !file.skip);

    if (saveRequests.length) {
        const deploy = new ToolingAPI.CompositeRequest({});
        const metadataContainerRequest = new ToolingAPI.CRUDRequest({
            sobject: "MetadataContainer",
            method: "POST",
            referenceId: "MetadataContainer",
            body: {
                Name: `Plasma-${Date.now().toString(36)}${Math.floor(Math.random() * (1 << 32)).toString(36)}`
            }
        });
        const deployRequest = new ToolingAPI.CRUDRequest({
            sobject: "ContainerAsyncRequest",
            method: "POST",
            body: {
                MetadataContainerId: "@{MetadataContainer.id}",
                IsCheckOnly: false
            }
        });

        deploy.add(metadataContainerRequest);
        deploy.addAll(saveRequests.map(save => save.getSaveRequest("MetadataContainer")));
        deploy.add(deployRequest);
        await deploy.send(project);

        let saveResult;
        do {
            sleep(1000);
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

        const resultsByFile = groupby(saveResult.DeployDetails.allComponentMessages, result => result.fileName);
        const status = await Promise.all(saveRequests.map(request => request.handleSaveResult(resultsByFile[request.source.path])));
        if (status.every(status => status)) {
            atom.notifications.addSuccess("Successfully saved to server");
        }
        await project.save();
        await deleteRequest;
    } else {
        atom.notifications.addInfo("No Files to save.");
    }
}
