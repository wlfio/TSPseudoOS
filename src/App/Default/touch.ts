import { ILibOS, AppOpts, AppOptsMap } from "../libOS";
import { IProcess } from "../../Struct/Process";

declare var OS: ILibOS;
declare var PROCESS: IProcess;

const touch: Function = () => {

    class Touch {
        options: AppOpts = {
            verbose: false,
        };
        optMap: AppOptsMap = {
            v: "verbose",
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
            for (let i: number = 0; i < paths.length; i++) {
                const out = await OS.FS.touch(paths[i]);
                this.printOutput(out);
            }
            OS.Process.end();
        }

        printOutput(out: any): void {
            if (this.options.verbose) {
                OS.Std.out((this.firstOut ? "" : "\n") + "created '" + out[0] + "'");
                this.firstOut = false;
            }
        }
    }

    new Touch(PROCESS.params);
};

export default touch;