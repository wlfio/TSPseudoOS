import FS, { IFSListEntry } from "./Services/FileSystem";
import Identity from "./Struct/Identity";
import Processes from "./Services/Processes";
import { ILibOS } from "./App/libOS";


import { DefaultApps } from "./App/Default/index";

declare const OS: ILibOS;

const rootIdent: Identity = new Identity("root", [], "/");

//FS.mkdir("/", rootIdent);
FS.mkdir("/bin", rootIdent);

FS.mkdir("/home", rootIdent);
FS.mkdir("/home/guest", rootIdent);

FS.mkdir("/home/root", rootIdent);
FS.mkdir("/home/root/dir1", rootIdent);
FS.mkdir("/home/root/dir2", rootIdent);
FS.mkdir("/home/root/dir3", rootIdent);
FS.mkdir("/home/root/dir3/dir4", rootIdent);

FS.touch("/home/root/.hidden", rootIdent);
FS.write("/home/root/test1", "test1 : 1234567890abcdefghijklmnopqrstuvwxyz", rootIdent);
FS.write("/home/root/test2", "test2 : 1234567890abcdefghijklmnopqrstuvwxyz", rootIdent);
FS.write("/home/root/test3", "test3 : 1234567890abcdefghijklmnopqrstuvwxyz", rootIdent);
FS.write("/home/root/dir3/test4", "test4 : 1234567890abcdefghijklmnopqrstuvwxyz", rootIdent);


Object.entries(DefaultApps).map((app: Array<any>) => {
    FS.write("bin/" + app[0], app[1].toString(), rootIdent);
    FS.chmod("bin/" + app[0], rootIdent, "755");
});

const clickRun: Function = (btn: HTMLButtonElement, ev: MouseEvent) => {
    console.log("BTN CLICK");
    const input: HTMLInputElement | null = document.querySelector("input#input");
    console.log(input);
    if (input !== null) {
        const data = input.value.split(" ").map(s => s.trim());
        console.log(input.value);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    Processes.start("ls", ["-lh", "/home/root"], rootIdent)
        .then((data: any) => console.log("App Started", data))
        .catch((error: Error) => console.log("App Failed", error));
    const runBtn: HTMLButtonElement | null = document.querySelector("button#run");
    console.log(runBtn);
    if (runBtn !== null) {
        // @ts-ignore
        runBtn.addEventListener("click", clickRun);
    }
})
