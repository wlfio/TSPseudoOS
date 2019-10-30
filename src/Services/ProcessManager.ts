import FS from "./FileSystem";
import Process from "../Struct/Process";
import Identity from "../Struct/Identity";
import { IAppMessage, IAppMessageType, IDisplayItem } from "../App/libOS";
import { IDisplay } from "./Display";

const getLib: Function = async () => {
    const request: Request = new Request("osLib.bundle.js");
    return await fetch(request).then(response => response.text());
};

interface IPendingApp {
    args: Array<any>;
    resolve: Function;
    reject: Function;
}

export default class ProcessManager {
    display: IDisplay | null = null;
    processes: { [s: number]: Process } = {};
    pids: number = 0;
    pending: IPendingApp[] = [];
    libJS: string | null = null;
    processContainer: HTMLDivElement;
    pendingContainer: HTMLIFrameElement | null;

    mainProcess: Process | null = null;

    constructor() {
        this.processContainer = document.createElement("div");
        this.pendingContainer = this.createRawContainer();
    }

    OS: { [s: string]: { [s: string]: Function } } = {
        FS: {
            list: (process: Process, data: string) => FS.list(data, process),
            mkdir: (process: Process, data: string) => FS.mkdir(data, process),
            resolve: (process: Process, data: string[]) => FS.resolveWorkingPaths(data, process),
            append: (process: Process, data: { path: string, content: string }) => FS.append(data.path, data.content, process),
            write: (process: Process, data: { path: string, content: string }) => FS.write(data.path, data.content, process),
            touch: (process: Process, path: string) => FS.touch(path, process),
            read: (process: Process, path: string) => FS.read(path, process),
            del: (process: Process, path: string) => FS.del(path, process),
            dirExists: (process: Process, path: string) => FS.dirExists(path, process),
            fileExists: (process: Process, path: string) => FS.fileExists(path, process),
            delDir: (process: Process, path: string) => FS.delDir(path, process),
        },
        Process: {
            end: (process: Process) => process.kill(),
            setSelf: (process: Process, data: { prop: string, value: any }) => process.set(data.prop, data.value),
            self: (process: Process) => Promise.resolve(process.data()),
            start: (process: Process, data: any) => this.startProcess(data.exec, data.params, null, process),
            crash: (process: Process, error: any) => { this.OS.Std.out(process, error); process.kill(); },
            changeWorkingDir: (process: Process, data: any) => this.changeWorkingDir(data, process),
        },
        Std: {
            out: (process: Process, data: any) =>
                process.hasParent() ? process.intoParent(data) : this.OS.Out.print({ data: data, over: 0 }),
            prompt: (process: Process, text: string) => {
                if (this.mainProcess !== null && this.mainProcess.id === process.id && this.display !== null) {
                    this.display.setText(text);
                }
            },
            in: (process: Process, data: any) => process.intoChild(data.pid, data.data, data.source || null),
        },
        Out: {
            print: (item: IDisplayItem) => this.output(item.data, item.over, false),
            printLn: (item: IDisplayItem) => { console.log(item); return this.output(item.data, item.over, true); },
        },
        Display: {
            info: () => this.display !== null ? this.display.info() : Promise.reject(new Error("PM Error : missing display : ...")),
        },
        Remote: {
            connect: (process: Process, address: string) => this.log(process.identifier(), ["Remote", "connect"], address),
            disconnect: (process: Process, id: number) => this.log(process.identifier(), ["Remote", "disconnect"], id),
            in: (process: Process, data: any) => this.log(process.identifier(), ["Remote", "stdIn"], data),
        }
    };

    private output(data: any, over?: number, newLine?: boolean): void {
        if (this.display !== null) {
            this.display.output(data, over, newLine);
        }
    }

    async changeWorkingDir(data: any, process: Process): Promise<boolean> {
        try {
            const path = data.path;
            const pid = data.pid || process.id;
            const toChange = this.getProcessFromID(pid);
            if (toChange !== null) {
                if (toChange.identity.user === process.identity.user || process.identity.priveledged) {
                    const done = await toChange.identity.changeWorkingPath(path);
                    toChange.updateSelf();
                    return Promise.resolve(done);
                }
            }
            return Promise.reject(new Error("Change Dir error : no proccess with id " + pid + " : " + JSON.stringify(data)));
        } catch (e) {
            return Promise.reject(e);
        }
    }

    init(display: IDisplay): void {
        this.processContainer.id = "processes";
        const body: HTMLBodyElement | null = document.querySelector("body");
        if (body !== null) {
            body.append(this.processContainer);
        }
        this.display = display;
        getLib()
            .then((data: string) => {
                this.libJS = data.replace(/sourceMappingURL/g, "");
                this.startPending();
            })
            .catch((err: any) => console.log("FETCH LIB ERROR", err));
    }
    killProcess(processID: number): void {
        const process: Process | null = this.getProcessFromID(processID);
        if (process !== null) {
            process.kill();
        }
    }

    stdIn(source: string | number, data: any): void {
        if (this.mainProcess !== null) {
            this.mainProcess.stdIn(source, data);
        } else {
            console.log("STDIN", data);
        }
    }

    startProcess: Function = (exec: string, params: string[], identity: Identity | null, parent?: any): Promise<any> => {
        if (this.libJS === null) {
            return this.pendStart(exec, params, identity, parent);
        }
        identity = identity || parent.identity;

        params = params.filter(s => s.length > 0);

        try {
            return new Promise((resolve, reject) => {
                FS.execRead(exec, identity)
                    .then((data: string[]) => {
                        const execPath: string = data[0];
                        const code: string = data[1];
                        this.pids++;

                        const process: Process = new Process(this.pids, execPath, params, identity, parent);

                        process.loadLibJS(this.libJS || "");
                        process.loadBin("(" + code + ")(PROCESS,OS);");

                        this.processes[this.pids] = process;

                        if (this.mainProcess === null) {
                            this.mainProcess = process;
                        }

                        this.createContainer(process.id, process)
                            .then((container: HTMLIFrameElement) => {
                                process.spawn(container);
                                resolve(process.data());
                            }).catch((e: any) => {
                                reject(e);
                            });
                    })
                    .catch((e: any) => {
                        console.log("START APP FAILED", exec, params, parent);
                        reject(e);
                    });
            });
        } catch (e) {
            console.log(["Process Error", e]);
            return Promise.reject(["Process Error", e]);
        }
    }

    private getProcessFromSource(source: any): Process | null {
        return Object.values(this.processes).find(p => p.isSource(source)) || null;
    }
    private getProcessFromID(id: number): Process | null {
        return Object.values(this.processes).find(p => p.id === id) || null;
    }

    private startPending(): void {
        try {
            this.pending.forEach(pend => {
                this.startProcess(pend.args[0], pend.args[1], pend.args[2], pend.args[3])
                    .then(pend.resolve)
                    .catch(pend.reject);
            });
        } catch (e) {
            console.log("START PEND ERROR", e);
        }
    }

    private pendStart(exec: string, params: string[], identity: Identity | null, parent?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.pending.push({
                args: [
                    exec,
                    params,
                    identity,
                    parent,
                ],
                resolve: resolve,
                reject: reject,
            });
        });
    }

    private createRawContainer(): HTMLIFrameElement {
        const container: HTMLIFrameElement = document.createElement("iframe");
        container.sandbox.add("allow-scripts");
        container.sandbox.add("allow-same-origin");
        container.id = "pending-container";
        this.processContainer.append(container);
        return container;
    }

    private getRawContainer(): HTMLIFrameElement {
        if (this.pendingContainer === null) {
            this.pendingContainer = this.createRawContainer();
        }
        const container: HTMLIFrameElement = this.pendingContainer;
        this.pendingContainer = null;
        window.setTimeout(() => { if (this.pendingContainer === null) { this.pendingContainer = this.createRawContainer(); } }, 100);
        return container;
    }

    private createContainer(pid: number, exec: Process): Promise<HTMLIFrameElement> {
        const container: HTMLIFrameElement = this.getRawContainer();
        container.setAttribute("data-exec", exec.exec);
        container.setAttribute("data-user", exec.identity.user);
        container.id = "pid-" + pid;
        return Promise.resolve(container);
    }

    appMessage(message: MessageEvent): any {
        const process: Process | null = this.getProcessFromSource(message.source);
        if (process === null) {
            return;
        }
        const msg: IAppMessage = message.data;
        const type: IAppMessageType = msg.type;

        if (type.service === "boot") {
            process.respond(process.params, msg.id);
            return;
        }

        const p: Promise<any> = this.systemCall(process, type, msg.data);
        const wantsPromise: Boolean = (typeof msg.id === "string" && msg.id.length > 0);
        if (wantsPromise) {
            if (p instanceof Promise) {
                p.then(data => {
                    process.respond(data, msg.id);
                })
                    .catch((e: any) => process.respond(null, msg.id, e));
            } else {
                throw ["Syscall Error", type.service + ">" + type.func, "did not return promise"];
            }
        }
    }

    private systemCall(process: Process, type: IAppMessageType, data: any): Promise<any> {
        if (this.OS.hasOwnProperty(type.service)) {
            if (this.OS[type.service].hasOwnProperty(type.func)) {
                return this.OS[type.service][type.func](process, data);
            }
        }
        return Promise.reject(
            new Error([
                "PM Error",
                "Atempt to access non-existant System Call\n" + type.service + ">" + type.func,
                process.exec + "[" + process.id + "]"
            ].join(" : "))
        );
    }

    log(...args: any[]) {
        console.log("PROCESS MANAGER", ...args);
    }

}