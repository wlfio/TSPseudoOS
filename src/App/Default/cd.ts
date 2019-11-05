import { ILibOS, AppOpts, AppOptsMap } from "../libOS";
import { IProcess } from "../../Struct/Process";

export default class Main {
    private api: ILibOS;
    private proc: IProcess;
    options: AppOpts = {
    };
    optMap: AppOptsMap = {
    }
    constructor(process: IProcess, OS: ILibOS) {
        this.api = OS;
        this.proc = process;
        this.loadArgs(process.params);
    }
    firstOut: boolean = true;

    async loadArgs(params: string[]) {
        try {
            const paths = await this.api.Util.loadArgs(params, this.options, this.optMap);
            this.run(paths);
        } catch (e) {
            this.error(e);
        }
    }

    error(e: any): void {
        this.api.Process.crash(e);
    }

    async run(paths: string[]) {
        try {
            if (this.proc.parentID > 0) {
                paths = await this.api.FS.resolve(paths);
                const result = await this.api.Process.changeWorkingPath(paths[0], this.proc.parentID);
                console.log("CHANGE DIR", result);
            }
            //console.log(PROCESS, paths);
            this.api.Process.end();
        } catch (e) {
            this.error(e);
        }
    }
}