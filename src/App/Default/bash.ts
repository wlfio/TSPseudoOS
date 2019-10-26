import { ILibCMD } from "../../Services/Cmd";
import { ILibOS, IStdInMsg } from "../libOS";
import { IIdentity } from "../../Struct/Identity";

declare var CMD: ILibCMD;
declare var OS: ILibOS;

interface ISubProc {
    pid: number;
    exec: string;
    args: any;
}

const bash: Function = () => {

    let user: string = "";
    let path: string = "";
    let host: string = window.location.origin.split("://")[1].split(":")[0] || "[MISSING HOST]";

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

    const cancelCurrentProcess: Function = () => {
        printPrompt();
    };

    const start: Function = () => {
        OS.Process.self()
            .then((data: { exec: string, identity: IIdentity }) => {
                user = data.identity.user;
                path = data.identity.workingDir;
                printPrompt();
            });
    };

    const resolveAppIn: Function = (msg: IStdInMsg): Promise<any> => {
        const proc: ISubProc = getSubProc(msg.from);
        let output: any = msg.data;
        if (msg.data instanceof Array) {
            if (msg.data[0] === "ERROR") {
                output = proc.exec.split("/").pop() + ": " + msg.data[2];
            }
        }
        OS.Std.out(output);
        return Promise.resolve();
    };

    const stdIn: Function = (data: IStdInMsg) => {
        if (data.from === "user") {
            if (typeof data.data === "string") {
                if (data.data === "§§§§§cancel§§§§§") {
                    cancelCurrentProcess();
                } else {
                    const parts: string[] = data.data.split(" ").map(s => s.trim());
                    const exec: string = parts.shift() || "";
                    OS.Process.start(exec, parts)
                        .then((data: any) => {
                            console.log("BASH APP START SUCCES", data, subProcs);
                            subProcs[data[0]] = {
                                pid: data[0],
                                exec: data[1],
                                args: data[2]
                            };
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
            console.log("BASH STD IN", data.data);
            resolveAppIn(data)
                .then(() => {
                    printPrompt(true);
                });
        }
    };

    OS.Std.inEvent(stdIn);
    OS.Process.startEvent(start);
};

export default bash;