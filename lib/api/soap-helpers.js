"use babel";

const INVALID_SESSION = "INVALID_SESSION";
const SOAP_NAMESPACES = {
    "soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
    "met": "http://soap.sforce.com/2006/04/metadata"
}

export async function soapRequest(project, body) {
    const soapRequest = xmldoc(
        xmldom("soapenv:Header",
            xmldom("met:SessionHeader",
                xmldom("met:sessionId", await project.getToken())
            )
        ),
        xmldom("soapenv:Body", ... (body instanceof Array ? body : [body]))
    );

    try {
        return await soapWrapper(`${project.connection.baseurl}/services/Soap/m/${project.apiVersion}`, soapRequest);
    } catch (error) {
        if (error === INVALID_SESSION) {
            try {
                await project.reauthenticate();
            } catch (authError) {
                throw Error("Session Expired. Please Reauthenticate.");
            }
            return soapWrapper(`${project.connection.baseurl}/services/Soap/m/${project.apiVersion}`, soapRequest);
        }
        throw error;
    }
}

async function soapWrapper(fullUrl, body) {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.onreadystatechange = () => {
            if (request.readyState === 4) {
                switch (request.status) {
                    case 200:
                    case 201:
                        return resolve(request.responseXML);
                    case 204:
                        return resolve(null);
                    default:
                        console.log(request.responseXML);
                        if (getText(request.responseXML, "//faultcode/text()") === "sf:INVALID_SESSION_ID") {
                            return reject(INVALID_SESSION);
                        } else {
                            return reject(Error(getText(request.responseXML, "//faultstring/text()")));
                        }
                }
            }
        };
        request.open("POST", fullUrl, true);
        request.setRequestHeader("content-type", "text/xml");
        request.setRequestHeader("SOAPAction", "\"\"");

        request.send(body);
    });
}

export function getText(dom, path) {
    const doc = dom.ownerDocument || dom;
    return doc.evaluate(path, dom, (prefix) => SOAP_NAMESPACES[prefix], XPathResult.STRING_TYPE, null).stringValue;
}

export function getNode(dom, path) {
    const doc = dom.ownerDocument || dom;
    return doc.evaluate(path, dom, (prefix) => SOAP_NAMESPACES[prefix], XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

export function getNodes(dom, path) {
    const doc = dom.ownerDocument || dom;
    const search = doc.evaluate(path, dom, (prefix) => SOAP_NAMESPACES[prefix], XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
    const returnVal = [];
    let element;
    while (element = search.iterateNext()) {
        returnVal.push(element);
    }
    return returnVal;
}

export function xmldoc(... children) {
    const doc = document.implementation.createDocument("http://schemas.xmlsoap.org/soap/envelope/", "soapenv:Envelope");

    for (const [namespace, url] of Object.entries(SOAP_NAMESPACES)) {
        const attribute = doc.createAttribute("xmlns:" + namespace);
        attribute.value = url;
        doc.firstChild.setAttributeNode(attribute);
    }

    for (const child of children) {
        doc.firstChild.append(child);
    }

    return doc;
}

export function xmldom(name, ... children) {
    const parts = name.split(":");
    const elem = parts.length == 1 ? document.createElementNS(null, name) : document.createElementNS(SOAP_NAMESPACES[parts[0]], name);

    for (const child of children) {
        elem.append(child);
    }

    return elem;
}
