import FS from "./Services/FileSystem";
import Identity from "./Struct/Identity";
import ProcessManager from "./Services/ProcessManager";
import Display from "./Services/Display";
import { DefaultApps } from "./App/Default/index";

const rootIdent: Identity = new Identity("root", [], "/");
const guestIdent: Identity = new Identity("guest", [], "/home/guest");

FS.mkdir("/bin", rootIdent);

FS.mkdir("/home", rootIdent);

// guest home
FS.mkdir("/home/guest", rootIdent)
    .then(() => {
        FS.chown("/home/guest", rootIdent, "guest", "guest")
            .then(() => {
                FS.mkdir("/home/guest/bin", guestIdent);
                FS.write("/home/guest/test", "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.", guestIdent);
                FS.mkdir("/home/guest/bin", guestIdent);
            });
    });

// root home
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

const display: Display = new Display();
const processManager: ProcessManager = new ProcessManager();


document.addEventListener("DOMContentLoaded", () => {
    display.init(processManager);
    processManager.init(display);

    display.output([
        ["Welcome to wlf.io TSPseudoOS v0.1 LTNS(Little To No Support)"],
        [""],
        ["  * Try the command help to see what you can do"],
        [""],
        ["Last Login: Fri, 25 Oct 2019 18: 57: 47 GMT"],
    ], 0, true);

    window.addEventListener("message", (msg) => {
        processManager.appMessage(msg);
    });
    processManager.startProcess("bash", [], guestIdent);
});
