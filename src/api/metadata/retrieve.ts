"use babel";

import { loadAsync } from "jszip";
import { sleep } from "../../helpers.js";
import { soapRequest, getText, getNode, getNodes, xmldom } from "../soap-helpers.js";

// TODO: Fix project typing
export default async function retrieve(project : any) : Promise<RetreiveResult> {
    // TODO: Support a missing package xml.
    const packageXml = new DOMParser().parseFromString(await project.packageXml.read(true), "text/xml");
    const rootNode = packageXml.firstChild as Element;

    const versionNode = getNode(packageXml, "//met:version")
    if (versionNode)  {
        versionNode.textContent = project.apiVersion;
    } else {
        rootNode.appendChild(xmldom("met:version", project.apiVersion));
    }

    const requestBody =
        xmldom("met:retrieve",
            xmldom("met:retrieveRequest",
                xmldom("met:singlePackage", true),
                xmldom("met:unpackaged", ... rootNode.children)
            )
        );

    const asyncRequestId = getText(await soapRequest(project, requestBody), "//met:result/met:id");
    const checkStatusBody =
        xmldom("met:checkRetrieveStatus",
            xmldom("met:asyncProcessId", asyncRequestId),
            xmldom("met:zipFile", true)
        );

    let checkResponse, status;
    do {
        // TODO: Better polling?
        await sleep(4000);
        checkResponse = await soapRequest(project, checkStatusBody);
        status = getText(checkResponse, "//met:result/met:status");
    } while (status === "Queued" || status === "InProgress")

    if (status !== "Succeeded") {
        throw Error("Failed to retreive metadata\n" + getText(checkResponse, "//faultstring/text()"));
    }

    const files = getNodes(checkResponse, "//met:fileProperties").reduce((files: { [key: string]: any } , file) => {
        files[getText(file, "child::met:fileName")] = {
            id: getText(file, "child::met:id"),
            lastSyncDate: getText(file, "child::met:lastModifiedDate"),
            type: getText(file, "child::met:type")
        };
        return files;
    }, {});

    const zip = await loadAsync(getText(checkResponse, "//met:result/met:zipFile"), { base64: true });
    return { files, zip };
}

export interface RetreiveResult {
    zip: any, // TODO: Fix JSZip Typing
    files: { [key: string]: any } // TODO: Use file status interface
}
