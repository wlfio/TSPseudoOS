import { ILibOS, AppOptsMap, AppOpts } from "../libOS";
import { IProcess } from "../../Struct/Process";


declare var OS: ILibOS;
declare var PROCESS: IProcess;


const tail: Function = () => {
    class Tail {
        options: AppOpts = {
            follow: false,
        };

        optMap: AppOptsMap = {
            f: "follow",
        };

        files: { [s: string]: string | null } = {};

        constructor(process: IProcess) {
            this.loadArgs(process.params);
        }

        error(e: any) {
            OS.Process.crash(e);
        }

        async loadArgs(params: string[]) {
            const paths = await OS.Util.loadArgs(params, this.options, this.options);
            try {
                await this.run(paths)
            } catch (e) {
                this.error(e);
            }
            console.log(paths);
            OS.Process.end();
        }

        async run(paths: string[]) {

            this.files = await this.readFiles(paths);

            console.log(this.files);
            if (this.options.follow) {

            } else {
                OS.Process.end();
            }
        }

        async readFiles(paths: string[]) {
            const files: { [s: string]: string | null } = {};
            for (let i = 0; i < paths.length; i++) {
                const path = paths[i];
                files[path] = await OS.FS.read(path);
            }
            return files;
        }
    }

    new Tail(PROCESS);
};

export default tail;