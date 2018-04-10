"use babel";

import jszip from "jszip";
import { File } from "atom";

import { sleep } from "../../helpers.js";
import { soapRequest, getText, getNode, getNodes, xmldom } from "../soap-helpers.js";

export default async function retrieve(project) {
    const packageXml = new DOMParser().parseFromString(await project.packageXml.read(true), "text/xml");

    const versionNode = getNode(packageXml, "//met:version")
    if (versionNode)  {
        versionNode.innerText = project.apiVersion;
    } else {
        versionNode.appendChild(xmldom("met:version", version));
    }

    const requestBody =
        xmldom("met:retrieve",
            xmldom("met:retrieveRequest",
                xmldom("met:singlePackage", true),
                xmldom("met:unpackaged", ... packageXml.firstChild.children)
            )
        );

    const asyncRequestId = getText(await soapRequest(project, requestBody), "//met:result/met:id");
    const checkStatusBody =
        xmldom("met:checkRetrieveStatus",
            xmldom("met:asyncProcessId", asyncRequestId),
            xmldom("met:zipFile", true)
        );

    let checkResponse;
    do {
        await sleep(4000);
        checkResponse = await soapRequest(project, checkStatusBody);
    } while (getText(checkResponse, "//met:result/met:status") === "Pending")

    if (getText(checkResponse, "//met:result/met:status") !== "Succeeded") {
        throw Error("Failed to retreive metadata\n" + getText(checkResponse, "//faultstring/text()"));
    }

    const files = getNodes(checkResponse, "//met:fileProperties").reduce((files, file) => {
        files[getText(file, "child::met:fileName")] = {
            id: getText(file, "child::met:id"),
            lastSyncDate: getText(file, "child::met:lastModifiedDate"),
            type: getText(file, "child::met:type")
        };
        return files;
    }, {});

    const zip = await jszip.loadAsync(getText(checkResponse, "//met:result/met:zipFile"), { base64: true });
    return { files, zip };
}
