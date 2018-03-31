"use babel";

import Project from "../../Project.js"
import { buildCallout, buildSubrequest } from "./helpers.js";

export default async function(project, query) {
    const callout = buildCallout(project);
    if (typeof(query) === "string") {
        return (await callout({
            path: "/query/?q=" + encodeURIComponent(query.replace(/\s+/g, " ").trim())
        })).records;
    } else if (query instanceof Array) {
        const subrequestBuilder = buildSubrequest(project);
        const batchedQueries = [];
        while (query.length) {
            batchedQueries.push(query.splice(0, 25));
        }
        const results = await Promise.all(batchedQueries.map(queries => callout({
            path: "/composite",
            method: "POST",
            body: {
                allOrNone: true,
                compositeRequest: queries.map((singleQuery, index) => subrequestBuilder({
                    path: "/query/?q=" + encodeURIComponent(singleQuery.replace(/\s+/g, " ").trim()),
                    referenceId: "UnnamedVariable" + index
                }))
            }
        })));
        const resultList = [];
        for (const resultGroup of results) {
            for (const result of resultGroup.compositeResponse) {
                resultList.push(result.body.records);
            }
        }
        return resultList;
    }
}
