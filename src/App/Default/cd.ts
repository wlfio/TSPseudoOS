import { ILibOS, AppOpts, AppOptsMap } from "../libOS";
import { IProcess } from "../../Struct/Process";

declare var OS: ILibOS;
declare var PROCESS: IProcess;

const cd: Function = () => {

    class CD {
        options: AppOpts = {
        };
        optMap: AppOptsMap = {
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
                if (PROCESS.parentID > 0) {
                    paths = await OS.FS.resolve(paths);
                    const result = await OS.Process.changeWorkingDir(paths[0], PROCESS.parentID);
                    console.log("CHANGE DIR", result);
                }
                //console.log(PROCESS, paths);
                OS.Process.end();
            } catch (e) {
                this.error(e);
            }
        }
    }

    new CD(PROCESS.params);
};

export default cd;