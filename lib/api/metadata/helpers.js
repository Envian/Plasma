"use babel";

export const SOAP_NAMESPACES = {
    "soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
    "met": "http://soap.sforce.com/2006/04/metadata"
}

export async function soapCallout(fullUrl, body) {
    return new Promise(resolve => {
        const request = new XMLHttpRequest();
        request.onreadystatechange = () => {
            if (request.readyState === 4) {
                if (request.status === 200) {
                    resolve(request.responseXML);
                } else {
                    Promise.reject(Error("Soap Error: " + getText(request.responseXML, "//faultstring/text()")));
                }
            }
        };
        request.open("POST", fullUrl, true);
        request.setRequestHeader("content-type", "text/xml");
        request.setRequestHeader("SOAPAction", "\"\"");

        request.send(body);
    });
}

export async function awaitComplete(url, request, xpath, interval) {
    let response;
    do {
        response = await new Promise(resolve => {
            setTimeout(() => {
                resolve(soapCallout(url, request));
            }, interval);
        });
    } while (getText(response, xpath) === "Pending");
    return response;
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

export function buildRequest(token, ... children) {
    return xmldoc(
        xmldom("soapenv:Header",
            xmldom("met:SessionHeader",
                xmldom("met:sessionId", token)
            )
        ),
        xmldom("soapenv:Body", ... children)
    );
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
