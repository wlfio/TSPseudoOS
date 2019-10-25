import sha1 from "sha1";
import Identity from "./Identity";
import { IAppMessageType } from "../App/libOS";

const generateBlobURL: Function = (data: string, type: string): string => {
    const blob: Blob = new Blob([data], { type: type });
    return URL.createObjectURL(blob);
};

const blobs: { [s: string]: { [s: string]: string } } = {

};

const getBlobURL: Function = (data: string, type: string): string => {
    const sha: string = sha1(data);
    if (!blobs.hasOwnProperty(type)) {
        blobs[type] = {};
    }
    if (!blobs[type].hasOwnProperty(sha)) {
        blobs[type][sha] = generateBlobURL(data, type);
    }
    return blobs[type][sha];
};

const getJSBlobURL: Function = (data: string) => getBlobURL(data, "text/javascript");

const getAppHtml: Function = (data: Array<string>) => {
    if (!(data instanceof Array)) { data = [data]; }
    let html: string = "<html><head><meta charset = \"UTF-8\">";
    data.forEach(d => html += ["<script src=\"", d, "\"></scr", "ipt>"].join(""));
    html += "</head><body></body></html>";
    return getBlobURL(html, "text/html");
};



export default class Process {
    id: number;
    exec: string;
    params: Array<string>;
    identity: Identity;
    parent: any;
    container: HTMLIFrameElement | null;
    bin: Array<string>;
    dead: boolean;

    constructor(id: number, exec: string, params: Array<string>, identity: Identity, parent: any) {
        this.id = id;
        this.exec = exec;
        this.params = params;
        this.identity = identity.clone();
        this.parent = parent || null;
        this.container = null;
        this.bin = [];
        this.dead = false;
    }

    hasParent(): boolean {
        return this.parent !== null;
    }

    intoParent(data: any): void {
        console.log("pump into parent", data);
    }

    loadBin(bin: string): Process {
        this.bin.push(getJSBlobURL(bin));
        return this;
    }

    spawn(container: HTMLIFrameElement): void {
        container.src = getAppHtml(this.bin);
        this.container = container;
    }

    isSource(source: Window): boolean {
        if (this.container === null) { return false; }
        return source === this.container.contentWindow;
    }

    message(typea: Array<string>, data: any, id?: string): boolean {
        if (this.container !== null) {
            const window: Window | null = this.container.contentWindow;
            if (window === null) { return false; }
            const type: IAppMessageType = { service: typea[0], func: typea[1] };
            window.postMessage({ type: type, data: data, id: id }, location.origin);
            return true;
        }
        return false;
    }

    respond(data: any, id?: string): void {
        this.message(["response"], data, id);
    }

    kill(): void {
        this.dead = true;
        if (this.container === null) { return; }
        const parent: Node | null = this.container.parentNode;
        if (parent === null) { return; }
        parent.removeChild(this.container);
    }
}