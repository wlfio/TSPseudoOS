import sha1 from "sha1";
import Identity, { IIdentityContainer, IIdentity } from "./Identity";
import { IAppMessageType, IAppMessage } from "../App/libOS";

const generateBlobURL: Function = (data: string, type: string): string => {
    const blob: Blob = new Blob([data], { type: type });
    return URL.createObjectURL(blob);
};

const blobs: { [s: string]: { [s: string]: string } } = {

};

const getBlobURL: Function = (data: string, type: string, cache?: boolean): string => {
    if (cache === false) {
        return generateBlobURL(data, type);
    }
    const sha: string = sha1(data);
    if (!blobs.hasOwnProperty(type)) {
        blobs[type] = {};
    }
    if (!blobs[type].hasOwnProperty(sha)) {
        blobs[type][sha] = generateBlobURL(data, type);
    }
    return blobs[type][sha];
};

const getJSBlobURL: Function = (data: string, cache?: boolean) => getBlobURL(data, "text/javascript", cache);

const getAppHtml: Function = (data: string[]) => {
    if (!(data instanceof Array)) { data = [data]; }
    let html: string = "<html><head><meta charset = \"UTF-8\">";
    data.forEach(d => html += ["<script src=\"", d, "\"></scr", "ipt>"].join(""));
    html += "</head><body></body></html>";
    return getBlobURL(html, "text/html", false);
};

const getIdentity: Function = (ident: IIdentity | null, parent: any): Identity => {
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

export interface IProcess {
    id: number;
    exec: string;
    params: string[];
    identity: IIdentity;
    // parent: IProcess | null;
    dead: boolean;
    parentID: number;
}

export default class Process implements IProcess, IIdentityContainer {
    id: number;
    exec: string;
    params: string[];
    identity: IIdentity;
    // parent: Process | null;
    container: HTMLIFrameElement | null;
    bin: string[];
    dead: boolean;
    paramsUrl: string = "";
    htmlUrl: string = "";
    children: { [s: number]: Process } = [];
    static libJS: string | null = null;

    parentInCB: Function | null = null;
    parentEndCB: Function | null = null;
    parentID: number = -1;


    constructor(id: number, exec: string, params: string[], identity: IIdentity | null, parent: Process | null) {
        this.id = id;
        this.exec = exec;
        this.params = params;
        this.identity = getIdentity(identity, parent);
        // this.parent = parent || null;
        this.container = null;
        this.bin = [];
        this.dead = false;

        if (parent instanceof Process) {
            this.parentID = parent.id;
            const cbs: [Function, Function] = parent.registerChild(this);
            this.parentInCB = cbs[0];
            this.parentEndCB = cbs[1];
        }
    }

    registerChild(process: Process): [Function, Function] {
        this.children[process.id] = process;
        return [
            (data: any) => {
                this.stdIn(process.id, data);
            },
            () => { this.removeChild(process); }
        ];
    }

    getIdentity(): IIdentity {
        if (this.identity instanceof Identity) {
            return this.identity.getIdentity();
        } else {
            return this.identity;
        }
    }

    hasParent(): boolean {
        return this.parentInCB !== null;
    }

    intoParent(data: any): Promise<any> {
        if (this.parentInCB !== null) {
            this.parentInCB(data);
            return Promise.resolve();
        }
        return Promise.reject();
    }

    getChild(pid: number): Process | null {
        return this.children[pid] || null;
    }

    identifier(): string {
        return this.exec + "[" + this.id + "]";
    }

    intoChild(pid: number, data: any, source?: string | number): Promise<any> {
        const child: Process | null = this.getChild(pid);
        if (child !== null) {
            console.log(this.identifier(), " > ", child.identifier(), data, source);
            child.stdIn(source || this.id, data);
            return Promise.resolve();
        }
        return Promise.reject();
    }

    set(prop: string, value: any): Promise<any> {
        switch (prop) {
            case "workingDir":
                this.identity.workingDir = value;
        }
        this.updateSelf();
        return Promise.resolve();
    }

    updateSelf(): void {
        this.message(["Process", "self"], this.data());
    }

    loadLibJS(code: string): Process {
        if (Process.libJS === null) {
            Process.libJS = getJSBlobURL(code);
        }
        this.bin.push(Process.libJS || "");
        return this;
    }

    changeWorkingDir(path: string): Promise<any> {

    }

    loadBin(code: string): Process {
        this.bin.push(getJSBlobURL(code));
        return this;
    }

    spawn(container: HTMLIFrameElement): void {
        this.paramsUrl = getJSBlobURL([
            "window.PROCESS = " + JSON.stringify(this) + ";",
            // "window.START_PARAMS = " + JSON.stringify(this.params) + ";"
        ].join(""));
        this.htmlUrl = getAppHtml([this.paramsUrl, ...this.bin]);
        container.src = this.htmlUrl;
        this.container = container;
    }

    isSource(source: Window): boolean {
        if (this.container === null) { return false; }
        return source === this.container.contentWindow;
    }

    stdIn(source: number | string, data: any): void {
        this.message(["Std", "in"], { from: source, data });
    }

    data(): IProcess {
        return {
            id: this.id,
            exec: this.exec,
            params: [... this.params],
            identity: this.identity,
            dead: this.dead,
            parentID: this.parentID,
        };
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

    removeChild(process: Process): void {
        this.message(["Process", "end"], process.id);
        delete this.children[process.id];
    }

    kill(): Promise<any> {
        this.dead = true;
        if (this.container === null) { return Promise.reject(); }
        const parent: Node | null = this.container.parentNode;
        if (parent === null) { return Promise.reject(); }
        parent.removeChild(this.container);

        if (this.parentEndCB !== null) {
            this.parentEndCB();
        }

        this.bin = [];
        if (this.htmlUrl.length > 0) {
            URL.revokeObjectURL(this.htmlUrl);
        }
        if (this.paramsUrl.length > 0) {
            URL.revokeObjectURL(this.paramsUrl);
        }
        this.htmlUrl = "";
        this.paramsUrl = "";
        return Promise.resolve();
    }
}