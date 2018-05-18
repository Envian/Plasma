export declare function soapRequest(project: any, body: Element | Array<Element>): Promise<Document | null>;
export declare function getText(dom: Element | Document, path: string): string | null;
export declare function getNode(dom: Element | Document, path: string): Node | null;
export declare function getNodes(dom: Element | Document, path: string): Array<Node> | null;
export declare function xmldoc(...children: Array<any>): Document;
export declare function xmldom(name: string, ...children: Array<any>): Element;
