import { ILibOS, AppOpts, AppOptsMap } from "../libOS";
import { IProcess } from "../../Struct/Process";

export default class Main {
    options: AppOpts = {
        verbose: false,
        recursive: false,
    };
    optMap: AppOptsMap = {
        v: "verbose",
        r: "recursive",
    }
    OS: ILibOS;

    constructor(process: IProcess, OS: ILibOS) {
        this.OS = OS;
        this.loadArgs(process.params);
    }
    firstOut: boolean = true;

    async loadArgs(params: string[]) {
        try {
            const paths = await this.OS.Util.loadArgs(params, this.options, this.optMap);
            this.run(paths);
        } catch (e) {
            this.error(e);
        }
    }

    error(e: any): void {
        this.OS.Process.crash(e);
    }

    async run(paths: string[]) {
        try {
            paths = await this.OS.FS.resolve(paths);
            for (let i: number = 0; i < paths.length; i++) {
                const path = paths[i];
                const dir = await this.OS.FS.dirExists(path);
                let out;
                if (dir) {
                    if (!this.options.recursive) {
                        this.printDirError(path);
                    } else {
                        out = await this.OS.FS.delDir(path);
                    }
                } else {
                    out = await this.OS.FS.del(path);
                }
                //const ls = await this.OS.FS.list(paths[i]);
                //console.log(ls);
                this.printOutput(out);
            }
            this.OS.Process.end();
        } catch (e) {
            this.error(e);
        }
    }

    printOutput(out: any): void {
        if (this.options.verbose) {
            this.output("deleted '" + out[0] + "'");
        }
    }

    printDirError(path: string): void {
        this.output("cannot remove '" + path + "' it's a directory");
    }

    output(text: string) {
        this.OS.Std.out((this.firstOut ? "" : "\n") + "rm: " + text);
        this.firstOut = false;
    }
}