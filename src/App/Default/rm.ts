import { ILibOS, AppOpts, AppOptsMap } from "../libOS";
import { IProcess } from "../../Struct/Process";

declare var OS: ILibOS;
declare var PROCESS: IProcess;

const rm: Function = () => {

    class RM {
        options: AppOpts = {
            verbose: false,
            recursive: false,
        };
        optMap: AppOptsMap = {
            v: "verbose",
            r: "recursive",
        }
        constructor(params: string[]) {
            this.loadArgs(params);
        }
        firstOut: boolean = true;

        async loadArgs(params: string[]) {
            try {
                const paths = await OS.Util.loadArgs(params, this.options, this.optMap);
                this.run(paths);
            } catch (e) {
                this.error(e);
            }
        }

        error(e: any): void {
            OS.Process.crash(e);
        }

        async run(paths: string[]) {
            try {
                paths = await OS.FS.resolve(paths);
                for (let i: number = 0; i < paths.length; i++) {
                    const path = paths[i];
                    const dir = await OS.FS.dirExists(path);
                    let out;
                    if (dir) {
                        if (!this.options.recursive) {
                            this.printDirError(path);
                        } else {
                            out = await OS.FS.delDir(path);
                        }
                    } else {
                        out = await OS.FS.del(path);
                    }
                    //const ls = await OS.FS.list(paths[i]);
                    //console.log(ls);
                    this.printOutput(out);
                }
                OS.Process.end();
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
            OS.Std.out((this.firstOut ? "" : "\n") + "rm: " + text);
            this.firstOut = false;
        }
    }

    new RM(PROCESS.params);
};

export default rm;