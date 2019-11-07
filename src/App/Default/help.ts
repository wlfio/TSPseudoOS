import { IProcess } from "../../Struct/Process";
import { ILibOS } from "../libOS";
import { AppOpts, AppOptsMap } from "../../Struct/Types";


export default class Main {
    OS: ILibOS;

    options: AppOpts = {

    };

    optMap: AppOptsMap = {

    };

    text: string[][] = [
        ["Help Text"],
        ["Is Here"],
        ["Line"],
        ["Line"],
        ["Line"]
    ];

    constructor(process: IProcess, OS: ILibOS) {
        this.OS = OS;
        this.start(process.params);
    }

    async start(params: string[]): Promise<any> {
        this.OS.Util.loadArgs(params, this.options, this.optMap);
        await this.run();
        this.OS.Process.end();
    }

    async run(): Promise<any> {
        await this.OS.Std.out(this.text);
    }
}