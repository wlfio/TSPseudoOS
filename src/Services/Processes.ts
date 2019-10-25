import FS from "./FileSystem";
import Process from "../Struct/Process";
import Identity from "../Struct/Identity";
import { IAppMessage, IAppMessageType, IDisplayItem } from "../App/libOS";
import Display from './Display';

let libJS: string | null = null;

const getLib: Function = async () => {
    const request: Request = new Request("osLib.bundle.js");
    return await fetch(request).then(response => response.text());
};


const processes: { [s: number]: Process } = {

};

let pids: number = 0;

const pending: Array<IPendingApp> = [];

const pendStart: Function = (exec: string, params: Array<string>, identity: Identity, parent?: any) => {
    return new Promise((resolve, reject) => {
        pending.push({
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
};

interface IPendingApp {
    args: Array<any>;
    resolve: Function;
    reject: Function;
}

const createContainer: Function = (pid: number): Promise<HTMLIFrameElement> => {
    const procs: HTMLDivElement | null = document.querySelector("div#processes");
    if (procs instanceof HTMLDivElement) {
        const container: HTMLIFrameElement = document.createElement("iframe");
        container.sandbox.add("allow-scripts");
        container.sandbox.add("allow-same-origin");
        container.id = "pid-" + pid;
        procs.append(container);
        return Promise.resolve(container);
    } else {
        return Promise.reject(new Error("Process Error : spawn : Cannot find processes container div"));
    }
}

const startProcess: Function = (exec: string, params: Array<string>, identity: Identity, parent?: any) => {
    if (libJS === null) {
        return pendStart(exec, params, identity, parent);
    }
    identity = identity || parent.identity;
    // const frame = document.createElement('iframe');
    try {
        return new Promise((resolve, reject) => {
            FS.execRead(exec, identity)
                .then((data: Array<string>) => {
                    const execPath: string = data[0];
                    const code: string = data[1];
                    pids++;

                    const process: Process = new Process(pids, execPath, params, identity, parent);

                    process.loadBin(libJS || "");
                    process.loadBin("(" + code + ")();");

                    processes[pids] = process;

                    createContainer(process.id)
                        .then((container: HTMLIFrameElement) => {
                            process.spawn(container);
                            resolve([process.id, process.exec, process.params]);
                        }).catch((e: Error) => {
                            reject(e);
                        })
                })
                .catch((e: Error) => reject(e));
        });
    } catch (e) {
        console.log(["Process Error", e]);
        return Promise.reject(["Process Error", e]);
    }
};


const startPending: Function = () => {
    try {
        pending.forEach(pend => {
            startProcess(pend.args[0], pend.args[1], pend.args[2], pend.args[3])
                .then(pend.resolve)
                .catch(pend.reject);
        });
    } catch (e) {
        console.log("START PEND ERROR", e);
    }
};

const getProcessFromSource: Function = (source: Window): Process | null =>
    Object.values(processes).find(p => p.isSource(source)) || null;
const getProcessFromID: Function = (id: number): Process | null =>
    Object.values(processes).find(p => p.id === id) || null;

const killProcess: Function = (processID: number) => {
    const process: Process = getProcessFromID(processID);
    if (process !== null) {
        process.kill();
    }
};


const OS: { [s: string]: { [s: string]: Function } } = {
    FS: {
        list: (process: Process, data: string) => FS.list(data, process.identity),
    },
    Process: {
        end: (process: Process) => process.kill(),
    },
    Std: {
        out: (process: Process, data: any) => process.hasParent() ? process.intoParent(data) : OS.Out.print(process, { data: data, over: 0 }),
    },
    Out: {
        print: (process: Process, item: IDisplayItem) => Display.output(item.data, item.over, false),
        printLn: (process: Process, item: IDisplayItem) => { console.log(item); return Display.output(item.data, item.over, true) },
    }
};

const systemCall: Function = (process: Process, type: IAppMessageType, data: any) => {
    if (OS.hasOwnProperty(type.service)) {
        if (OS[type.service].hasOwnProperty(type.func)) {
            return OS[type.service][type.func](process, data);
        }
    }
    console.log("Unhandled SysCall", process.id, type, data);
};

const appMessage: Function = (message: MessageEvent): any => {
    const process: Process = getProcessFromSource(message.source);
    if (process === null) {
        return;
    }
    const msg: IAppMessage = message.data;
    const type: IAppMessageType = msg.type;

    if (type.service === "boot") {
        process.respond(process.params, msg.id);
        return;
    }

    const p: Promise<any> = systemCall(process, type, msg.data);
    const wantsPromise: Boolean = (typeof msg.id === "string" && msg.id.length > 0);
    if (wantsPromise) {
        if (p instanceof Promise) {
            p.then(data => process.respond(data, msg.id));
        } else {
            throw ["Syscall Error", type, "did not return promise"];
        }
    }
};

getLib()
    .then((data: string) => { libJS = data.replace(/sourceMappingURL/g, ""); startPending(); })
    .catch((err: Error) => console.log("FETCH LIB ERROR", err));

// @ts-ignore
window.addEventListener("message", appMessage);

export default {
    kill: killProcess,
    start: startProcess,
};