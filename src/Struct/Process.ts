import sha1 from "sha1";
import Identity from "./Identity";
import { IAppMessageType, IAppMessage } from "../App/libOS";

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

const getAppHtml: Function = (data: string[], params: {}) => {
    if (!(data instanceof Array)) { data = [data]; }
    let html: string = "<html><head><meta charset = \"UTF-8\">";
    html += ["<scrip", "t>window.START_PARAMS = ", JSON.stringify(params), ";</scr", "ipt>"].join("");
    data.forEach(d => html += ["<script src=\"", d, "\"></scr", "ipt>"].join(""));
    html += "</head><body></body></html>";
    return getBlobURL(html, "text/html");
};

const getIdentity: Function = (ident: Identity | null, parent: any): Identity => {
    if (!(ident instanceof Identity)) {
        if (parent.hasOwnProperty("identity")) {
            ident = parent.identity;
        }
    }
    if (ident instanceof Identity) {
        return ident.clone();
    } else {
        throw ["Process Start Failed", "Missing Identity", "None passed or on parent"];
    }
};

export default class Process {
    id: number;
    exec: string;
    params: string[];
    identity: Identity;
    parent: any;
    container: HTMLIFrameElement | null;
    bin: string[];
    dead: boolean;

    constructor(id: number, exec: string, params: string[], identity: Identity | null, parent: any) {

        this.id = id;
        this.exec = exec;
        this.params = params;
        this.identity = getIdentity(identity, parent);
        this.parent = parent || null;
        this.container = null;
        this.bin = [];
        this.dead = false;
    }

    hasParent(): boolean {
        return this.parent !== null;
    }

    intoParent(data: any): void {
        if (this.parent instanceof Process) {
            this.parent.stdIn(this.id, data);
        }
    }

    set(prop: string, value: any): void {
        switch (prop) {
            case "workingDir":
                this.identity.workingDir = value;
        }
    }

    loadBin(bin: string): Process {
        this.bin.push(getJSBlobURL(bin));
        return this;
    }

    spawn(container: HTMLIFrameElement): void {
        container.src = getAppHtml(this.bin, this.params);
        this.container = container;
    }

    isSource(source: Window): boolean {
        if (this.container === null) { return false; }
        return source === this.container.contentWindow;
    }

    stdIn(source: number | string, data: any): void {
        this.message(["Std", "in"], { from: source, data });
    }

    message(typea: string[], data: any, id?: string, error?: any): boolean {
        if (this.container !== null) {
            const window: Window | null = this.container.contentWindow;
            if (window === null) { return false; }
            const type: IAppMessageType = { service: typea[0], func: typea[1] };
            const msg: IAppMessage = { type: type, data: data, id: id };
            if (error instanceof Error) {
                console.log("Error to process", this, error);
                error = ["ERROR", ...error.message.split(" : ")];
            }
            if (typeof error !== "undefined") {
                msg.error = error;
            }
            window.postMessage(msg, location.origin);
            return true;
        }
        return false;
    }

    respond(data: any, id?: string, error?: any): void {
        this.message(["response"], data, id, error);
    }

    kill(): void {
        this.dead = true;
        if (this.container === null) { return; }
        const parent: Node | null = this.container.parentNode;
        if (parent === null) { return; }
        parent.removeChild(this.container);
    }
}