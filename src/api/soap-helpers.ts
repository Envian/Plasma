"use babel";

const INVALID_SESSION = "INVALID_SESSION";
const SOAP_NAMESPACES: {[index:string]: string} = {
    "soapenv": "http://schemas.xmlsoap.org/soap/envelope/",
    "met": "http://soap.sforce.com/2006/04/metadata"
}
const NAMESPACE_RESOLVER: XPathNSResolver = {
    lookupNamespaceURI: prefix => SOAP_NAMESPACES[prefix] || ""
};

// TODO: Fix project typing
export async function soapRequest(project: any, body: Element | Array<Element>): Promise<Document> {
console.log(body);
    const sessionElement = xmldom("met:sessionId", await project.getToken());
    const requestBody = xmldoc(
        xmldom("soapenv:Header",
            xmldom("met:SessionHeader",
                sessionElement
            )
        ),
        xmldom("soapenv:Body", ... (body instanceof Array ? body: [body]))
    );

    try {
        return await soapWrapper(`${project.connection.baseurl}/services/Soap/m/${project.apiVersion}`, requestBody);
    } catch (error) {
        if (error === INVALID_SESSION) {
            try {
                await project.reauthenticate();
            } catch (authError) {
                throw Error("Session Expired. Please Reauthenticate.");
            }

            sessionElement.textContent = await project.getToken();
            return soapWrapper(`${project.connection.baseurl}/services/Soap/m/${project.apiVersion}`, requestBody);
        }
        throw error;
    }
}

export function getText(dom: Node, path: string): string {
    const doc = dom.ownerDocument || dom;
    return doc.evaluate(path, dom, NAMESPACE_RESOLVER, XPathResult.STRING_TYPE, null).stringValue;
}

export function getNode(dom: Node, path: string): Node {
    const doc = dom.ownerDocument || dom;
    return doc.evaluate(path, dom, NAMESPACE_RESOLVER, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

export function getNodes(dom: Node, path: string): Array<Node> {
    const doc = dom.ownerDocument || dom;
    const search = doc.evaluate(path, dom, NAMESPACE_RESOLVER, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null);
    const returnVal = [];
    let element;
    while (element = search.iterateNext()) {
        returnVal.push(element);
    }
    return returnVal;
}

export function xmldoc(... children: Array<any>): Document {
    const doc = document.implementation.createDocument("http://schemas.xmlsoap.org/soap/envelope/", "soapenv:Envelope", null);

    for (const [namespace, url] of Object.entries(SOAP_NAMESPACES)) {
        const attribute = doc.createAttribute("xmlns:" + namespace);
        attribute.value = url;
        (doc.firstChild as Element).setAttributeNode(attribute);
    }

    for (let child of children) {
        if (!(child instanceof Element)) child = doc.createTextNode(child.toString());
        (doc.firstChild as Element).appendChild(child);
    }

    return doc;
}

export function xmldom(name: string, ... children: Array<any>): Element {
    const parts = name.split(":");
    const elem = parts.length == 1 ?
        document.createElementNS(null, name) :
        document.createElementNS(SOAP_NAMESPACES[parts[0]] || null, name);

        for (let child of children) {
            if (!(child instanceof Element)) child = document.createTextNode(child.toString());
            elem.appendChild(child);
        }


    return elem;
}

function soapWrapper(fullUrl: string, body: Document): Promise<Document> {
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.onreadystatechange = () => {
            if (request.readyState === 4) {
                switch (request.status) {
                    case 200:
                    case 201:
                        return resolve(request.responseXML as Document);
                    case 204:
                        return resolve(document.implementation.createDocument(null, null, null));
                    default:
                        if (getText(request.responseXML as Document, "//faultcode/text()") === "sf:INVALID_SESSION_ID") {
                            return reject(INVALID_SESSION);
                        } else {
                            return reject(Error(getText(request.responseXML as Document, "//faultstring/text()") || undefined));
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
