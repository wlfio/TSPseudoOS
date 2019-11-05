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

    endProcess(pid: number): void {
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