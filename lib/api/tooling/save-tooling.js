"use babel";

import { DIR_TO_OBJECT, buildCallout, buildSubrequest } from "./helpers.js";

// Takes in a list of files. Files are defined as a JSON object with the following properties:
//  path: the file's path relative to src.
//  state: This is the state of the object, which contains the id, type, and lastSyncDate. id required for updates. type required.
//  metadata: a metadata object containing this file's metadata. This will be the -meta.xml file correlating to the main file.
//  body: the text body of this component
export default async function(project, files) {
    if (files.length < 23) {
        return saveFilesSingular(project, files);
    } else {
        atom.notifications.addError("Unable to save more than 23 files at once.");
        return;
    }
}

// Accepts a small number (<23) of files to be saved.
async function saveFilesSingular(project, files) {
    const subrequestBuilder = buildSubrequest(project);
    const callout = buildCallout(project);
    const fileCalls = files.map((file, index) => subrequestBuilder({
        path: `/sobjects/${file.state.type}Member/`,
        method: "POST",
        body: {
            Body: file.body,
            ContentEntityId: file.state.id,
            MetadataContainerId: "@{metadataContainer.id}",
            FullName: file.state.id ? undefined : file.path.substring(file.path.lastIndexOf("/") + 1, file.path.indexOf(".")),
            Content: file.metadata
        },
        referenceId: "file-" + index
    }));

    const enqueueResult = await callout({
        path: "/composite",
        method: "POST",
        body: {
            allOrNone: true,
            compositeRequest: [
                subrequestBuilder({
                    path: "/sobjects/MetadataContainer/",
                    method: "POST",
                    body: {
                        Name: `Plasma-${Date.now()}-${Math.floor(Math.random() * (1 << 32)).toString(36)}`
                    },
                    referenceId: "metadataContainer"
                }),
                ... fileCalls,
                subrequestBuilder({
                    path: "/sobjects/ContainerAsyncRequest",
                    method: "POST",
                    body: {
                        MetadataContainerId: "@{metadataContainer.id}",
                        IsCheckOnly: false
                    },
                    referenceId: "asyncRequest"
                })
            ]
        }
    });
    const asyncRequestId = enqueueResult.compositeResponse[enqueueResult.compositeResponse.length - 1].body.id;
    let saveResult;
    do {
        await new Promise(resolve => setTimeout(resolve, 1000));
        saveResult = await callout({
            path: `/sobjects/ContainerAsyncRequest/${asyncRequestId}/`,
            method: "GET"
        });
    } while (saveResult.State === "Queued")

    await callout({
        path: `/sobjects/MetadataContainer/${enqueueResult.compositeResponse[0].body.id}/`,
        method: "DELETE"
    });

    return saveResult.DeployDetails.allComponentMessages;
}
