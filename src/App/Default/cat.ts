import { ILibOS, AppOptsMap, AppOpts } from "../libOS";
import { IProcess } from "../../Struct/Process";

declare var OS: ILibOS;
declare var PROCESS: IProcess;

const cat: Function = () => {

    const options: AppOpts = {
        number: false,
        "squeeze-blank": false,
    };

    const optMap: AppOptsMap = {
        n: "number",
        s: "squeeze-blank",
    };

    let count: number = 0;

    const error: Function = (e: any) => {
        OS.Process.crash(e);
    };

    const splitLines: Function = (content: string): string[][] => {
        const lines: string[][] = [];
        let empty: boolean = false;
        content.split("\n").forEach((txt: string) => {
            count++;
            if (txt.length < 1) {
                if (empty) {
                    return;
                }
                empty = true;
            } else {
                empty = false;
            }
            const line: string[] = [];
            if (options.number) {
                line.push(count.toString());
            }
            line.push(txt);
            lines.push(line);
        });
        return lines;
    };

    const output: Function = (content: string) => {
        OS.Std.out(splitLines(content));
    };

    const cat: Function = async (paths: string[]): Promise<any> => {
        try {
            for (let i: number = 0; i < paths.length; i++) {
                const content: string | null = await OS.FS.read(paths[i]);
                output(content);
            }
            OS.Process.end();
        } catch (e) {
            error(e);
        }
    };

    const start: Function = (data: string[]) => {
        OS.Util.loadArgs(data, options, optMap)
            .then((paths: string[]) => {
                if (paths.length < 1) {
                    throw new Error("CAT ERROR : you must include file path(s) : " + JSON.stringify(data));
                }
                cat(paths);
            })
            .catch((e: any) => {
                console.log("CAT ERROR", e);
                error(e);
            });
    };

    start(PROCESS.params);
};

export default cat;