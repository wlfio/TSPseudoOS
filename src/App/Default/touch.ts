import { ILibOS, AppOpts, AppOptsMap } from "../libOS";
import { IProcess } from "../../Struct/Process";

declare var OS: ILibOS;
declare var PROCESS: IProcess;

const touch: Function = () => {

    class Touch {
        options: AppOpts = {

        };
        optMap: AppOptsMap = {

        }
        constructor(params: string[]) {
            OS.Util.loadArgs(params, this.options, this.optMap)
                .then((paths: string[]) => this.run(paths))
                .catch(e => this.error(e));
        }

        error(e: any): void {
            OS.Process.crash(e);
        }

        async run(paths: string[]) {
            for (let i: number = 0; i < paths.length; i++) {
                const out = await OS.FS.touch(paths[i]);
                console.log(out);
            }
            OS.Process.end();
        }
    }

    new Touch(PROCESS.params);
};

export default touch;