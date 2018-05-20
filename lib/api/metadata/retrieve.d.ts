export default function retrieve(project: any): Promise<RetreiveResult>;
export interface RetreiveResult {
    zip: any;
    files: {
        [key: string]: any;
    };
}
