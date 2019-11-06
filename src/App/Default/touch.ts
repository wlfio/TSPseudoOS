import { ILibOS, AppOpts, AppOptsMap } from "../libOS";
import { IProcess } from "../../Struct/Process";

export default class Main {
    options: AppOpts = {
        verbose: false,
    };
    optMap: AppOptsMap = {
        v: "verbose",
    };
    OS: ILibOS;
    constructor(process: IProcess, OS: ILibOS) {
        this.OS = OS;
        this.loadArgs(process.params);
    }
    firstOut: boolean = true;

    async loadArgs(params: string[]): Promise<any> {
        try {
            const paths: string[] = await this.OS.Util.loadArgs(params, this.options, this.optMap);
            this.run(paths);
        } catch (e) {
            this.error(e);
        }
    }

    error(e: any): void {
        this.OS.Process.crash(e);
    }

    async run(paths: string[]): Promise<any> {
        for (let i: number = 0; i < paths.length; i++) {
            const out: string[] = await this.OS.FS.touch(paths[i]);
            this.printOutput(out);
        }
        this.OS.Process.end();
    }

    printOutput(out: string[]): void {
        if (this.options.verbose) {
            this.OS.Std.out((this.firstOut ? "" : "\n") + "created '" + out[0] + "'");
            this.firstOut = false;
        }
    }
}