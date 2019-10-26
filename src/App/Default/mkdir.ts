import { ILibOS } from "../libOS";

declare var OS: ILibOS;
declare var START_PARAMS: [];

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
        paretns: false,
    };
    const optMap: { [s: string]: string } = {
        "?": "help",
        v: "verbose",
        p: "parents"
    };

    const error: Function = (e: any) => {
        OS.Process.crash(e);
    };

    //let count = 0;
    let count: number = 0;
    const make: Function = (paths: string[]): Promise<any> => {
        return new Promise((resolve, reject) => {
            console.log("MKDIR", paths[count]);
            OS.FS.mkdir(paths[count])
                .then(() => {
                    ++count;
                    if (count >= paths.length) {
                        resolve();
                        return;
                    }
                    make(paths)
                        .then(() => {
                            resolve();
                        })
                        .catch((e: any) => {
                            reject(e);
                        });
                })
                .catch((e: any) => {
                    reject(e);
                });
        });
    };

    OS.Util.loadArgs(START_PARAMS, options, optMap)
        .then(parms => {
            if (parms.length < 1 && !options.help && !options.version) {
                OS.Process.crash(
                    new Error([
                        "mkdir error",
                        "missing operand\nTry 'mkdir --help' for more information"
                        , JSON.stringify(START_PARAMS)].join(" : ")
                    )
                );
                return;
            }
            if (options.help) {
                OS.Std.out(help);
            } else if (options.version) {
                OS.Std.out(version);
            } else {
                make(parms)
                    .then(() => {
                        OS.Process.end();
                    })
                    .catch((e: any) => {
                        error(e);
                    });
                return;
            }

            OS.Process.end();
        })
        .catch(e => error(e));
};

export default mkdir;