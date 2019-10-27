import { ILibCMD } from "../../Services/Cmd";
import { ILibOS, IStdInMsg } from "../libOS";
import { IProcess } from "../../Struct/Process";

declare var CMD: ILibCMD;
declare var OS: ILibOS;
declare var PROCESS: IProcess;

interface ISubProc {
    pid: number;
    exec: string;
    args: any;
}

const bash: Function = () => {

    let user: string = "";
    let path: string = "";
    let host: string = window.location.origin.split("://")[1].split(":")[0] || "[MISSING HOST]";
    let activeProcessID: number = -1;
    let activeOutputed: boolean = false;

    const subProcs: { [s: number]: ISubProc } = {};

    const getSubProc: Function = (pid: number): ISubProc | null => {
        if (subProcs.hasOwnProperty(pid)) {
            return subProcs[pid];
        }
        return null;
    };

    const printPrompt: Function = (newLine?: boolean) => {
        newLine = newLine === true;
        OS.Std.out(
            (newLine ? "\n" : "")
            +
            CMD.Colourize(user + "@" + host, CMD.Colours.green)
            +
            CMD.Colourize(":", CMD.Colours.white)
            +
            CMD.Colourize(path.replace("/home/" + user, "~"), CMD.Colours.blue)
            +
            CMD.Colourize("$ ", CMD.Colours.white)
        );
    };

    // const cancelCurrentProcess: Function = () => {
    //     printPrompt();
    // };

    const start: Function = (process: IProcess) => {
        user = process.identity.user;
        path = process.identity.workingDir;
        printPrompt();
    };

    const resolveAppIn: Function = (msg: IStdInMsg): Promise<any> => {
        const proc: ISubProc = getSubProc(msg.from);
        let output: any = msg.data;
        if (msg.data instanceof Array) {
            if (msg.data[0] === "ERROR") {
                output = proc.exec.split("/").pop() + ": " + msg.data[2];
            }
        }
        if (parseInt(msg.from, 10) === activeProcessID) {
            activeOutputed = true;
        }
        OS.Std.out(output);
        return Promise.resolve();
    };

    const ctrlCode: Function = (type: string): void => {
        console.log("CTRL CODE", type);
    };

    const history: Function = (dir: number): void => {
        console.log("DIR", dir);
    }

    const specialCode: Function = (code: string): void => {
        const parts: string[] = code.split("§§§").filter(s => s.length > 0);
        switch (parts[0].toLowerCase()) {
            case "ctrl":
                ctrlCode(parts[1]);
                break;
            case "dir":
                history(parseInt(parts[1], 10));
                break;
            default:
                console.log("SPECIAL CODE", parts);
                break;
        }
    };

    const stdIn: Function = (data: IStdInMsg) => {
        if (data.from === "user") {
            if (typeof data.data === "string") {
                if (data.data.startsWith("§§§")) {
                    specialCode(data.data);
                } else {
                    OS.FS.append("~/.bash_history", data.data + "\n");
                    const parts: string[] = data.data.split(" ").map(s => s.trim());
                    const exec: string = parts.shift() || "";
                    OS.Process.start(exec, parts)
                        .then((data: any) => {
                            activeOutputed = false;
                            subProcs[data[0]] = {
                                pid: data[0],
                                exec: data[1],
                                args: data[2]
                            };
                            activeProcessID = data[0];
                        })
                        .catch((e: any) => {
                            console.log("EXEC ERROR", e);
                            try {
                                if (e[1] === "FS Error" && e[3] === "Not found") {
                                    OS.Std.out(exec + ": command not found");
                                } else {
                                    OS.Std.out(e[1]);
                                }
                            } catch (er) {
                                OS.Std.out(["BASH LAUNCH ERROR", er.message]);
                            }
                            printPrompt(true);
                        });
                }
            }
        } else {
            resolveAppIn(data)
                .then(() => {
                    //printPrompt(true);
                });
        }
    };
    const end: Function = (pid: number) => {
        const sub: ISubProc | null = getSubProc(pid);
        if (sub !== null) {
            delete subProcs[pid];
            if (pid === activeProcessID) {
                printPrompt(activeOutputed);
            }
        }
    };

    OS.Process.endEvent(end);
    OS.Std.inEvent(stdIn);
    start(PROCESS);
};

export default bash;