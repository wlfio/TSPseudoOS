import FS from "./FileSystem";
import Process from "../Struct/Process";
import Identity from "../Struct/Identity";
import { IAppMessage, IAppMessageType, IDisplayItem } from "../App/libOS";
import Display from "./Display";

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
    display: Display | null = null;
    processes: { [s: number]: Process } = {};
    pids: number = 0;
    pending: IPendingApp[] = [];
    libJS: string | null = null;
    processContainer: HTMLDivElement;

    mainProcess: Process | null = null;

    constructor() {
        this.processContainer = document.createElement("div");
    }

    OS: { [s: string]: { [s: string]: Function } } = {
        FS: {
            list: (process: Process, data: string) => FS.list(data, process),
            mkdir: (process: Process, data: string) => FS.mkdir(data, process),
            resolve: (process: Process, data: string[]) => FS.resolveWorkingPaths(data, process),
        },
        Process: {
            end: (process: Process) => {
                if (process.parent !== null) {
                    process.parent.message(["Process", "end"], process.id);
                }
                process.kill();
            },
            setSelf: (process: Process, data: { prop: string, value: any }) => process.set(data.prop, data.value),
            self: (process: Process) => Promise.resolve({ exec: process.exec, identity: process.identity.clone() }),
            start: (process: Process, data: any) => this.startProcess(data.exec, data.params, null, process),
            crash: (process: Process, error: any) => { this.OS.Std.out(process, error); process.kill(); },
        },
        Std: {
            out: (process: Process, data: any) =>
                process.hasParent() ? process.intoParent(data) : this.OS.Out.print({ data: data, over: 0 }),
        },
        Out: {
            print: (item: IDisplayItem) => this.output(item.data, item.over, false),
            printLn: (item: IDisplayItem) => { console.log(item); return this.output(item.data, item.over, true); },
        }
    };

    private output(data: any, over?: number, newLine?: boolean): void {
        if (this.display !== null) {
            this.display.output(data, over, newLine);
        }
    }

    init(display: Display): void {
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
        // const frame = document.createElement('iframe');
        try {
            return new Promise((resolve, reject) => {
                FS.execRead(exec, identity)
                    .then((data: string[]) => {
                        const execPath: string = data[0];
                        const code: string = data[1];
                        this.pids++;

                        const process: Process = new Process(this.pids, execPath, params, identity, parent);

                        process.loadBin(this.libJS || "");
                        process.loadBin("(" + code + ")();");

                        this.processes[this.pids] = process;

                        if (this.mainProcess === null) {
                            this.mainProcess = process;
                        }

                        this.createContainer(process.id, process)
                            .then((container: HTMLIFrameElement) => {
                                process.spawn(container);
                                resolve([process.id, process.exec, process.params]);
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

    private createContainer(pid: number, exec: Process): Promise<HTMLIFrameElement> {
        const container: HTMLIFrameElement = document.createElement("iframe");
        container.sandbox.add("allow-scripts");
        container.sandbox.add("allow-same-origin");
        container.setAttribute("data-exec", exec.exec);
        container.setAttribute("data-user", exec.identity.user);
        container.id = "pid-" + pid;
        this.processContainer.append(container);
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

        const start: number = Date.now();
        const p: Promise<any> = this.systemCall(process, type, msg.data);
        const wantsPromise: Boolean = (typeof msg.id === "string" && msg.id.length > 0);
        if (wantsPromise) {
            if (p instanceof Promise) {
                p.then(data => {
                    console.log("SYSCALL TIME", type, Date.now() - start);
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

}