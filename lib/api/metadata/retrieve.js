"use babel";

import jszip from "jszip";
import { File } from "atom";

import { xmldom, buildRequest, soapCallout, awaitComplete, getText, getNode, getNodes, SOAP_NAMESPACES } from "./helpers.js";

export default async function retrieve(baseUrl, version, token, packageXml) {
    if (packageXml instanceof File) {
        packageXml = new DOMParser().parseFromString(await packageXml.read(), "text/xml");
    }

    const versionNode = getNode(packageXml, "//met:version")
    if (versionNode)  {
        versionNode.innerText = version;
    } else {
        versionNode.appendChild(xmldom("met:version", version));
    }

     const requestBody = buildRequest(token,
         xmldom("met:retrieve",
             xmldom("met:retrieveRequest",
                 xmldom("met:singlePackage", true),
                 xmldom("met:unpackaged", ... packageXml.firstChild.children)
             )
        )
    );

    const metadataUrl = `${baseUrl}/services/Soap/m/${version}`;
    const requestResponse = await soapCallout(metadataUrl, requestBody);
    const checkStatusBody = buildRequest(token,
        xmldom("met:checkRetrieveStatus",
            xmldom("met:asyncProcessId", getText(requestResponse, "//met:result/met:id")),
            xmldom("met:zipFile", true)
        )
    );
    const retrieveResponse = await awaitComplete(metadataUrl, checkStatusBody, "//met:result/met:status", 1000);

    if (getText(retrieveResponse, "//met:result/met:status") !== "Succeeded") {
        throw Error("Failed to retreive metadata.");
    }

    const files = getNodes(retrieveResponse, "//met:fileProperties").reduce((files, file) => {
        files[getText(file, "child::met:fileName")] = {
            id: getText(file, "child::met:id"),
            lastSyncDate: getText(file, "child::met:lastModifiedDate"),
            type: getText(file, "child::met:type")
        };
        return files;
    }, {});

    const zip = await jszip.loadAsync(getText(retrieveResponse, "//met:result/met:zipFile"), { base64: true });
    return { files, zip };
}
