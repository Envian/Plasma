"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const helpers_js_1 = require("../helpers.js");
const composite_request_js_1 = tslib_1.__importDefault(require("../api/tooling/composite-request.js"));
const crud_sobject_js_1 = tslib_1.__importDefault(require("../api/tooling/crud-sobject.js"));
const apex_js_1 = tslib_1.__importDefault(require("./apex.js"));
const aura_js_1 = tslib_1.__importDefault(require("./aura.js"));
const staticresource_js_1 = tslib_1.__importDefault(require("./staticresource.js"));
const visualforce_js_1 = tslib_1.__importDefault(require("./visualforce.js"));
async function default_1(project, files) {
    if (files.every(file => file.isTooling)) {
        toolingSave(project, files);
    }
    else {
        throw Error("Metadata saving not yet implemented");
    }
}
exports.default = default_1;
async function toolingSave(project, files) {
    const filesByFolder = helpers_js_1.groupby(files, file => file.folderName);
    let containerSaves = getContainerSaves(project, filesByFolder);
    let standaloneSaves = getStandaloneSaves(project, filesByFolder);
    let allSaves = containerSaves.concat(standaloneSaves);
    const conflictRequest = new composite_request_js_1.default(false, allSaves.map(save => save.getConflictQuery()));
    await conflictRequest.send(project);
    await Promise.all(allSaves.map(save => save.handleConflicts()));
    containerSaves = containerSaves.filter(save => !save.skip);
    standaloneSaves = standaloneSaves.filter(save => !save.skip);
    allSaves = allSaves.filter(save => !save.skip);
    if (!allSaves.length) {
        atom.notifications.addInfo("No files to save.");
        return;
    }
    let requests = helpers_js_1.flatten(await Promise.all(standaloneSaves.map(save => save.getSaveRequest("MetadataContainer"))));
    let containerAsyncRequest;
    if (containerSaves.length) {
        const containerRequests = buildContainerRequests(helpers_js_1.flatten(await Promise.all(containerSaves.map(save => save.getSaveRequest("MetadataContainer")))));
        requests = requests.concat(containerRequests[0]);
        containerAsyncRequest = requests[1];
    }
    await new composite_request_js_1.default(true, requests).send(project);
    await Promise.all(standaloneSaves.map(save => save.handleSaveResult()));
    if (containerSaves.length && containerAsyncRequest) {
        const asyncRequestId = (await containerAsyncRequest.getResult()).Id;
        let saveResult;
        do {
            helpers_js_1.sleep(2000);
            saveResult = await getContainerCheckRequest(asyncRequestId).send(project);
        } while (saveResult.State === "Queued");
        const deleteRequest = getContainerDeleteRequest(asyncRequestId).send(project);
        await deleteRequest;
    }
    await project.save();
}
function getContainerSaves(project, filesByFolder) {
    const apex = helpers_js_1.groupby((filesByFolder.get("classes") || []).concat(filesByFolder.get("triggers") || []), file => file.entity);
    const visualforce = helpers_js_1.groupby((filesByFolder.get("components") || []).concat(filesByFolder.get("pages") || []), file => file.entity);
    return Object.entries(apex).map(([entity, files]) => new apex_js_1.default(project, entity, files))
        .concat(Object.entries(visualforce).map(([entity, files]) => new visualforce_js_1.default(project, entity, files)));
}
function getStandaloneSaves(project, filesByFolder) {
    const aura = helpers_js_1.groupby(filesByFolder.get("aura") || [], file => file.entity);
    const staticresource = helpers_js_1.groupby(filesByFolder.get("staticresources") || [], file => file.entity);
    return Object.entries(aura).map(([entity, files]) => new aura_js_1.default(project, entity, files))
        .concat(Object.entries(staticresource).map(([entity, files]) => new staticresource_js_1.default(project, entity, files)));
}
function buildContainerRequests(saves) {
    const asyncRequest = new crud_sobject_js_1.default({
        sobject: "ContainerAsyncRequest",
        method: "POST",
        body: {
            MetadataContainerId: "@{MetadataContainer.id}",
            IsCheckOnly: false
        }
    });
    return [[
            new crud_sobject_js_1.default({
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
function getContainerCheckRequest(metadataId) {
    return new crud_sobject_js_1.default({
        sobject: "ContainerAsyncRequest",
        method: "GET",
        id: metadataId
    });
}
function getContainerDeleteRequest(metadataId) {
    return new crud_sobject_js_1.default({
        sobject: "MetadataContainer",
        method: "DELETE",
        id: metadataId
    });
}
