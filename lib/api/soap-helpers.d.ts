import Project from "../project";
export declare function soapRequest(project: Project, body: Element | Array<Element>): Promise<Document>;
export declare function getText(dom: Node, path: string): string;
export declare function getNode(dom: Node, path: string): Node;
export declare function getNodes(dom: Node, path: string): Array<Node>;
export declare function xmldoc(...children: Array<any>): Document;
export declare function xmldom(name: string, ...children: Array<any>): Element;
