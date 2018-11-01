"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const INVALID_SESSION = "INVALID_SESSION";
const SOAP_NAMESPACES = {
    "soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
    "met": "http://soap.sforce.com/2006/04/metadata"
};
const NAMESPACE_RESOLVER = {
    lookupNamespaceURI: prefix => SOAP_NAMESPACES[prefix] || ""
};
async function soapRequest(project, body) {
    console.log(body);
    const sessionElement = xmldom("met:sessionId", await project.getToken());
    const requestBody = xmldoc(xmldom("soapenv:Header", xmldom("met:SessionHeader", sessionElement)), xmldom("soapenv:Body", ...(body instanceof Array ? body : [body])));
    try {
        return await soapWrapper(`${project.connection.baseurl}/services/Soap/m/${project.apiVersion}`, requestBody);
    }
    catch (error) {
        if (error === INVALID_SESSION) {
            try {
                await project.reauthenticate();
            }
            catch (authError) {
                throw Error("Session Expired. Please Reauthenticate.");
            }
            sessionElement.textContent = await project.getToken();
            return soapWrapper(`${project.connection.baseurl}/services/Soap/m/${project.apiVersion}`, requestBody);
        }
        throw error;
    }
}
exports.soapRequest = soapRequest;
function getText(dom, path) {
    const doc = dom.ownerDocument || dom;
    return doc.evaluate(path, dom, NAMESPACE_RESOLVER, XPathResult.STRING_TYPE, null).stringValue;
}
exports.getText = getText;
function getNode(dom, path) {
    const doc = dom.ownerDocument || dom;
    return doc.evaluate(path, dom, NAMESPACE_RESOLVER, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}
exports.getNode = getNode;
function getNodes(dom, path) {
    const doc = dom.ownerDocument || dom;
    const search = doc.evaluate(path, dom, NAMESPACE_RESOLVER, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
    const returnVal = [];
    let element;
    while (element = search.iterateNext()) {
        returnVal.push(element);
    }
    return returnVal;
}
exports.getNodes = getNodes;
function xmldoc(...children) {
    const doc = document.implementation.createDocument("http://schemas.xmlsoap.org/soap/envelope/", "soapenv:Envelope", null);
    for (const [namespace, url] of Object.entries(SOAP_NAMESPACES)) {
        const attribute = doc.createAttribute("xmlns:" + namespace);
        attribute.value = url;
        doc.firstChild.setAttributeNode(attribute);
    }
    for (let child of children) {
        if (!(child instanceof Element))
            child = doc.createTextNode(child.toString());
        doc.firstChild.appendChild(child);
    }
    return doc;
}
exports.xmldoc = xmldoc;
function xmldom(name, ...children) {
    const parts = name.split(":");
    const elem = parts.length == 1 ?
        document.createElementNS(null, name) :
        document.createElementNS(SOAP_NAMESPACES[parts[0]] || null, name);
    for (let child of children) {
        if (!(child instanceof Element))
            child = document.createTextNode(child.toString());
        elem.appendChild(child);
    }
    return elem;
}
exports.xmldom = xmldom;
function soapWrapper(fullUrl, body) {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.onreadystatechange = () => {
            if (request.readyState === 4) {
                switch (request.status) {
                    case 200:
                    case 201:
                        return resolve(request.responseXML);
                    case 204:
                        return resolve(document.implementation.createDocument(null, null, null));
                    default:
                        if (getText(request.responseXML, "//faultcode/text()") === "sf:INVALID_SESSION_ID") {
                            return reject(INVALID_SESSION);
                        }
                        else {
                            return reject(Error(getText(request.responseXML, "//faultstring/text()") || undefined));
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
