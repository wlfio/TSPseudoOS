import FS from "./FileSystem";
// import Process from "../Struct/Process";
import Identity, { IIdentity } from "../Struct/Identity";
// import { IDisplayItem, AppMessage, AppMessageType } from "../App/libOS";
import { IDisplay, StubDisplay } from "./Display";
import Process from "../Struct/Process";

interface IPendingApp {
    args: Array<any>;
    resolve: Function;
    reject: Function;
}

export interface IProcessManager {
    display: IDisplay | null;
    stdIn(source: string | number, data: any): void;
    startProcess(exec: string, params: string[], identity: Identity | null, parent?: any): Promise<any>;
    endProcess(pid: number): void;
    getDisplay(): IDisplay;
    setEnv(pid: number, name: string, value: string): Promise<any>;
}

export default class ProcessManager implements IProcessManager {
    display: IDisplay | null = null;
    processes: { [s: number]: Process } = {};
    pids: number = 0;
    pending: IPendingApp[] = [];
    libJS: string | null = null;

    mainProcess: Process | null = null;

    // constructor() {
    // }

    // OS: { [s: string]: { [s: string]: Function } } = {
    //     FS: {
    //         list: (process: Process, data: string) => FS.list(data, process),
    //         mkdir: (process: Process, data: string) => FS.mkdir(data, process),
    //         resolve: (process: Process, data: string[]) => FS.resolveWorkingPaths(data, process),
    //         append: (process: Process, data: { path: string, content: string }) => FS.append(data.path, data.content, process),
    //         write: (process: Process, data: { path: string, content: string }) => FS.write(data.path, data.content, process),
    //         touch: (process: Process, path: string) => FS.touch(path, process),
    //         read: (process: Process, path: string) => FS.read(path, process),
    //         del: (process: Process, path: string) => FS.del(path, process),
    //         dirExists: (process: Process, path: string) => FS.dirExists(path, process),
    //         fileExists: (process: Process, path: string) => FS.fileExists(path, process),
    //         delDir: (process: Process, path: string) => FS.delDir(path, process),
    //     },
    //     Process: {
    //         end: (process: Process) => process.kill(),
    //         setSelf: (process: Process, data: { prop: string, value: any }) => process.set(data.prop, data.value),
    //         self: (process: Process) => Promise.resolve(process.data()),
    //         start: (process: Process, data: any) => this.startProcess(data.exec, data.params, null, process),
    //         crash: (process: Process, error: any) => { this.OS.Std.out(process, error); process.kill(); },
    //         changeWorkingDir: (process: Process, data: any) => this.changeWorkingDir(data, process),
    //     },
    //     Std: {
    //         out: (process: Process, data: any) =>
    //             process.hasParent() ? process.intoParent(data) : this.OS.Out.print({ data: data, over: 0 }),
    //         prompt: (process: Process, text: string) => {
    //             if (this.mainProcess !== null && this.mainProcess.id === process.id && this.display !== null) {
    //                 this.display.setText(text);
    //             }
    //         },
    //         in: (process: Process, data: any) => process.intoChild(data.pid, data.data, data.source || null),
    //     },
    //     Out: {
    //         print: (item: IDisplayItem) => this.output(item.data, item.over, false),
    //         printLn: (item: IDisplayItem) => { console.log(item); return this.output(item.data, item.over, true); },
    //     },
    //     Display: {
    //         info: () => this.display !== null ? this.display.info() : Promise.reject(new Error("PM Error : missing display : ...")),
    //     },
    //     Remote: {
    //         connect: (process: Process, address: string) => this.log(process.identifier(), ["Remote", "connect"], address),
    //         disconnect: (process: Process, id: number) => this.log(process.identifier(), ["Remote", "disconnect"], id),
    //         in: (process: Process, data: any) => this.log(process.identifier(), ["Remote", "stdIn"], data),
    //     }
    // };

    setEnv(pid: number, name: string, value: string): Promise<any> {
        if (this.processes.hasOwnProperty(pid)) {
            this.processes[pid].setEnv(name, value);
            return Promise.resolve();
        }
        return Promise.reject();
    }

    init(display: IDisplay): void {
        this.display = display;
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

    endProcess(pid: number) {
        if (this.processes.hasOwnProperty(pid)) {
            delete this.processes[pid];
        }
    }

    async startProcess(exec: string, params: string[], identity: IIdentity | null, parent?: Process): Promise<any> {
        if (!(identity instanceof Identity)) {
            if (parent instanceof Process) {
                identity = parent.getIdentity();
            }
        }

        if (!(identity instanceof Identity)) {
            throw new Error("Identity is not identity");
        }

        params = params.filter(s => s.length > 0);

        try {
            const execData: [string, string] = await FS.execRead(exec, identity);
            this.pids++;
            const execPath: string = execData[0];
            const code: string = execData[1].trim();
            const proc: Process = new Process(this, execPath, this.pids, params, identity, parent);
            proc.start(code);

            this.processes[this.pids] = proc;

            if (this.mainProcess === null) {
                this.mainProcess = proc;
            }
            return proc;
        } catch (e) {
            console.log(["Process Error", e]);
            return Promise.reject(["Process Error", e]);
        }
    }

    private getProcessFromID(id: number): Process | null {
        return Object.values(this.processes).find(p => p.id === id) || null;
    }

    getDisplay(): IDisplay {
        if (this.display !== null) {
            return this.display;
        }
        return new StubDisplay();
    }

}