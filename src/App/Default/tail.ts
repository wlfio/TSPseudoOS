import { ILibOS, AppOptsMap, AppOpts } from "../libOS";
import { IProcess } from "../../Struct/Process";


declare var OS: ILibOS;
declare var PROCESS: IProcess;


const tail: Function = () => {
    class Tail {
        options: AppOpts = {

        };

        optMap: AppOptsMap = {

        };

        constructor(process: IProcess) {
            this.loadArgs(process.params);
        }

        async loadArgs(params: string[]) {
            const paths = await OS.Util.loadArgs(params, this.options, this.options);
            //this.start(paths[0])
            console.log(paths);
            OS.Process.end();
        }
    }

    new Tail(PROCESS);
};

export default tail;