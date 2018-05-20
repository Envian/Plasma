"use strict";
"use babel";
Object.defineProperty(exports, "__esModule", { value: true });
const jszip_1 = require("jszip");
const helpers_js_1 = require("../../helpers.js");
const soap_helpers_js_1 = require("../soap-helpers.js");
async function retrieve(project) {
    const packageXml = new DOMParser().parseFromString(await project.packageXml.read(true), "text/xml");
    const rootNode = packageXml.firstChild;
    const versionNode = soap_helpers_js_1.getNode(packageXml, "//met:version");
    if (versionNode) {
        versionNode.textContent = project.apiVersion;
    }
    else {
        rootNode.appendChild(soap_helpers_js_1.xmldom("met:version", project.apiVersion));
    }
    const requestBody = soap_helpers_js_1.xmldom("met:retrieve", soap_helpers_js_1.xmldom("met:retrieveRequest", soap_helpers_js_1.xmldom("met:singlePackage", true), soap_helpers_js_1.xmldom("met:unpackaged", ...rootNode.children)));
    const asyncRequestId = soap_helpers_js_1.getText(await soap_helpers_js_1.soapRequest(project, requestBody), "//met:result/met:id");
    const checkStatusBody = soap_helpers_js_1.xmldom("met:checkRetrieveStatus", soap_helpers_js_1.xmldom("met:asyncProcessId", asyncRequestId), soap_helpers_js_1.xmldom("met:zipFile", true));
    let checkResponse, status;
    do {
        await helpers_js_1.sleep(4000);
        checkResponse = await soap_helpers_js_1.soapRequest(project, checkStatusBody);
        status = soap_helpers_js_1.getText(checkResponse, "//met:result/met:status");
    } while (status === "Queued" || status === "InProgress");
    if (status !== "Succeeded") {
        throw Error("Failed to retreive metadata\n" + soap_helpers_js_1.getText(checkResponse, "//faultstring/text()"));
    }
    const files = soap_helpers_js_1.getNodes(checkResponse, "//met:fileProperties").reduce((files, file) => {
        files[soap_helpers_js_1.getText(file, "child::met:fileName")] = {
            id: soap_helpers_js_1.getText(file, "child::met:id"),
            lastSyncDate: soap_helpers_js_1.getText(file, "child::met:lastModifiedDate"),
            type: soap_helpers_js_1.getText(file, "child::met:type")
        };
        return files;
    }, {});
    const zip = await jszip_1.loadAsync(soap_helpers_js_1.getText(checkResponse, "//met:result/met:zipFile"), { base64: true });
    return { files, zip };
}
exports.default = retrieve;
