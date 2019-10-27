import { ILibOS } from "../libOS";
import { IProcess } from "../../Struct/Process";

declare var OS: ILibOS;
declare var PROCESS: IProcess;

const mkdir: Function = () => {

    const help: string[][] = [
        ["Usage: mkdir[OPTION]...DIRECTORY..."],
        ["Create the DIRECTORY(ies), if they do not already exist."],
        [""],
        ["Mandatory arguments to long options are mandatory for short options too."],
        //        ["  - m, --mode= MODE", "set file mode(as in chmod), not a = rwx - umask"],
        ["  - p, --parents", "no error if existing, make parent directories as needed"],
        ["  - v, --verbose", "print a message for each created directory"],
        //        ["  - Z", "", "", "set SELinux security context of each created directory"],
        //        ["  ", "", "", "to the default type"],
        ["  ", "--help", "", "display this help and exit"],
        ["  ", "--version", "output version information and exit"],
    ];

    const version: string = [
        "mkdir (GNU coreutils) 0.1",
        "Copyright(C) 2010 wlf.io.",
        "License MIT License < https://raw.githubusercontent.com/wlfio/TSPseudoOS/master/LICENSE >.",
        "This is free software: you are free to change and redistribute it.",
        "There is NO WARRANTY, to the extent permitted by law.",
        "",
        "Written by wlf.io."
    ].join("\n");

    const options: { [s: string]: any } = {
        help: false,
        version: false,
        verbose: false,
        parents: false,
    };
    const optMap: { [s: string]: string } = {
        "?": "help",
        v: "verbose",
        p: "parents"
    };

    const error: Function = (e: any) => {
        if (e instanceof Array) {
            if (e[2] === "Path is not directory") {
                e = new Error("MKDIR ERROR : no such file or directory '" + e[3] + "' : " + e.join(" : "));
            }
        }
        OS.Process.crash(e);
    };

    const breakPathIntoParentPaths: Function = (path: string): string[] => {
        const parts: string[] = path.split("/").filter(s => s.length > 0);
        return parts.reduce((out: string[], inp: string, i: number) => {
            if (i === 0) {
                inp = "/" + inp;
            } else {
                inp = out[out.length - 1] + "/" + inp;
            }
            out.push(inp);
            return out;
        }, []);
    };

    const breakPathsIntoParentPaths: Function = (paths: string[]): Array<string[]> => {
        return paths.map((path: string) => {
            if (options.parents) {
                return breakPathIntoParentPaths(path);
            }
            return [path];
        });
    };

    let count: number = 0;
    const make: Function = async (rawPaths: string[]): Promise<any> => {
        let prefix: string = "";
        try {
            const paths: string[] = await OS.FS.resolve(rawPaths);
            console.log("PATHS", paths);
            const broken: string[][] = breakPathsIntoParentPaths(paths);
            console.log("BROKEN", broken);
            for (let j: number = 0; j < broken.length; j++) {
                const set: string[] = broken[j];
                for (let i: number = 0; i < set.length; i++) {
                    const path: string = set[i];
                    const done: boolean = await OS.FS.mkdir(path);
                    console.log("PATH DONE", path, done);
                    if (options.verbose && done) {
                        OS.Std.out(prefix + "created directory '" + set[count] + "'");
                    }
                    if (!done && (!options.parents)) {
                        OS.Std.out(prefix + "cannot create directory '" + set[count] + "': File exists");
                    }
                    prefix = "\n";
                }
            }
            OS.Process.end();
        } catch (e) {
            console.log("ERROROR", e);
            error(e);
        }
    };

    const start: Function = async (args: string[]) => {
        const params: string[] = await OS.Util.loadArgs(args, options, optMap);
        if (params.length < 1 && !options.help && !options.version) {
            OS.Process.crash(
                new Error([
                    "mkdir error",
                    "missing operand\nTry 'mkdir --help' for more information"
                    , JSON.stringify(args)].join(" : ")
                )
            );
            return;
        }
        if (options.help) {
            OS.Std.out(help);
        } else if (options.version) {
            OS.Std.out(version);
        } else {
            make(params);
        }
    };

    start(PROCESS.params);
};

export default mkdir;