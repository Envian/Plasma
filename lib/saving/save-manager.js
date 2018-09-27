"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const helpers_js_1 = require("../helpers.js");
const composite_request_js_1 = tslib_1.__importDefault(require("../api/tooling/composite-request.js"));
const apex_js_1 = tslib_1.__importDefault(require("./apex.js"));
const visualforce_js_1 = tslib_1.__importDefault(require("./visualforce.js"));
const aura_js_1 = tslib_1.__importDefault(require("./aura.js"));
const staticresource_js_1 = tslib_1.__importDefault(require("./staticresource.js"));
const crud_sobject_js_1 = tslib_1.__importDefault(require("../api/tooling/crud-sobject.js"));
async function saveFiles(project, files) {
    if (files.every(file => file.isTooling)) {
        await toolingSave(project, files);
    }
    else {
        throw Error("Metadata saving not yet implemented");
    }
}
exports.saveFiles = saveFiles;
async function deleteFiles(project, files) {
}
exports.deleteFiles = deleteFiles;
async function toolingSave(project, files) {
    const filesByFolder = helpers_js_1.groupby(files, file => file.folderName);
    const containerSaves = getContainerSaves(project, filesByFolder);
    const standaloneSaves = getStandaloneSaves(project, filesByFolder);
    const allSaves = containerSaves.concat(standaloneSaves);
    if (!allSaves.length) {
        atom.notifications.addInfo("No files to save.");
        return;
    }
    const conflictRequest = new composite_request_js_1.default(false, allSaves.map(save => save.getConflictQuery()));
    await conflictRequest.send(project);
    await Promise.all(allSaves.map(save => save.handleQueryResult()));
    if (allSaves.every(save => save.skip)) {
        atom.notifications.addInfo("No files to save.");
        return;
    }
    const results = await Promise.all([
        saveToolingStandalone(project, standaloneSaves.filter(save => !save.skip)),
        saveToolingContainer(project, containerSaves.filter(save => !save.skip))
    ]);
    if (results.every(result => !!result)) {
        atom.notifications.addSuccess("Files have successfully saved to server.");
    }
    await project.save();
}
async function saveToolingStandalone(project, saves) {
    if (!saves.length)
        return true;
    await Promise.all(helpers_js_1.chunk(25, helpers_js_1.flatten(await Promise.all(saves.map(save => save.getSaveRequests()))))
        .map(saveChunk => new composite_request_js_1.default(false, saveChunk).send(project)));
    await Promise.all(saves.map(save => save.handleSaveResult()));
    const errorMessages = saves.filter(save => save.errorMessage).map(save => save.errorMessage).join("\n\n");
    if (errorMessages) {
        atom.notifications.addError("Failed to save Lightning Components and/or Static Resources.", {
            detail: errorMessages,
            dismissable: true
        });
        return false;
    }
    else {
        return true;
    }
}
async function saveToolingContainer(project, saves) {
    if (!saves.length)
        return true;
    const containerRequest = getNewContainerRequest();
    const compileRequest = getContainerAsyncRequest();
    const saveRequests = [
        containerRequest,
        ...helpers_js_1.flatten(await Promise.all(saves.map(save => save.getSaveRequests("MetadataContainer")))),
        compileRequest
    ];
    await new composite_request_js_1.default(true, saveRequests).send(project);
    console.log(saveRequests);
    const containerId = containerRequest.result.id;
    const asyncRequestId = compileRequest.result.id;
    let saveResult;
    do {
        helpers_js_1.sleep(2000);
        saveResult = await getContainerCheckRequest(asyncRequestId).send(project);
    } while (saveResult.State === "Queued");
    await getContainerDeleteRequest(containerId).send(project);
    const resultsByFile = helpers_js_1.groupby(saveResult.DeployDetails.allComponentMessages, result => result.fileName);
    await Promise.all(saves.map(save => save.handleSaveResult(resultsByFile.get(save.entity) || [])));
    return saveResult.DeployDetails.componentFailures.length == 0;
}
function getContainerSaves(project, filesByFolder) {
    const apex = helpers_js_1.groupby((filesByFolder.get("classes") || []).concat(filesByFolder.get("triggers") || []), file => file.entity);
    const visualforce = helpers_js_1.groupby((filesByFolder.get("components") || []).concat(filesByFolder.get("pages") || []), file => file.entity);
    return Array.from(apex, ([entity, files]) => new apex_js_1.default(project, entity, files))
        .concat(Array.from(visualforce, ([entity, files]) => new visualforce_js_1.default(project, entity, files)));
}
function getStandaloneSaves(project, filesByFolder) {
    const aura = helpers_js_1.groupby(filesByFolder.get("aura") || [], file => file.entity);
    const staticresource = helpers_js_1.groupby(filesByFolder.get("staticresources") || [], file => file.entity);
    return Array.from(aura, ([entity, files]) => new aura_js_1.default(project, entity, files))
        .concat(Array.from(staticresource, ([entity, files]) => new staticresource_js_1.default(project, entity, files)));
}
function getNewContainerRequest() {
    return new crud_sobject_js_1.default({
        sobject: "MetadataContainer",
        method: "POST",
        referenceId: "MetadataContainer",
        body: {
            Name: `Plasma-${Date.now().toString(36)}${Math.floor(Math.random() * (1 << 32)).toString(36)}`
        }
    });
}
function getContainerAsyncRequest() {
    return new crud_sobject_js_1.default({
        sobject: "ContainerAsyncRequest",
        method: "POST",
        body: {
            MetadataContainerId: "@{MetadataContainer.id}",
            IsCheckOnly: false
        }
    });
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
