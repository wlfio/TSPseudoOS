import Identity from "../Struct/Identity";

const dirString: string = "___dir___";

const cleanSlash: Function = (str: string) => str.replace(/\//g, "");

const slashWrap: Function = (path: string): string => {
    if (path.charAt(0) !== "/") {
        path = "/" + path;
    }
    if (path.charAt(path.length - 1) !== "/") {
        path += "/";
    }
    return path;
};

const fixPath: Function = (path: string) => {
    return "/" + path.split("/").reduce((out: Array<string>, inp: string) => {
        if (inp.length > 0 && inp !== ".") {
            if (inp === "..") {
                return out.slice(0, out.length - 1);
            } else {
                return [...out, inp];
            }
        }
        return out;
    }, []).join("/");
};

const filePath: Function = (path: string) => path.indexOf("FSF:") !== 0 ? "FSF:" + fixPath(path) : path;
const dirPath: Function = (path: string) => path.indexOf("FSD:") !== 0 ? "FSD:" + fixPath(path) : path;
const permPath: Function = (path: string) => path.indexOf("FSP:") !== 0 ? "FSP:" + fixPath(path) : path;
const owndPath: Function = (path: string) => path.indexOf("FSO:") !== 0 ? "FSO:" + fixPath(path) : path;


const getPathOwnerString: Function = (path: string): string => localStorage.getItem(owndPath(path)) || "nobody:nobody";
const getPathOwners: Function = (path: string): Array<string> => getPathOwnerString(path).split(":");
const getPathUsr: Function = (path: string) => getPathOwners(path)[0];
const getPathGrp: Function = (path: string) => getPathOwners(path)[1];


const permBitRead: number = 4;
const permBitWrit: number = 2;
const permBitExec: number = 1;

const bitOffsetUsr: number = 8;
const bitOffsetAny: number = 0;
const bitOffsetGrp: number = 4;

const getPermBits: Function = (path: string): number => parseInt(localStorage.getItem(permPath(path)) || "", 10);

// tslint:disable: no-bitwise

const permStringPart: Function = (action: number): string => {
    let ps: string = "";
    ps += (action & permBitRead) ? "r" : "-";
    ps += (action & permBitWrit) ? "w" : "-";
    ps += (action & permBitExec) ? "x" : "-";
    return ps;
};

const permString: Function = (perms: number): string => {
    return permStringPart(perms >> bitOffsetUsr)
        + permStringPart(perms >> bitOffsetGrp)
        + permStringPart(perms >> bitOffsetAny);
};

const getPermBitsUsr: Function = (path: string): number => getPermBits(path) >> bitOffsetUsr;
const getPermBitsGrp: Function = (path: string): number => getPermBits(path) >> bitOffsetGrp;
const getPermBitsAny: Function = (path: string): number => getPermBits(path) >> bitOffsetAny;

const userHasPermission: Function = (path: string, action: number, identity: Identity) => {
    const user: string = identity.user;
    if (identity.priveledged) {
        if (action & permBitExec) {
            return (
                (getPermBitsUsr(path) & permBitExec)
                ||
                (getPermBitsGrp(path) & permBitExec)
                ||
                (getPermBitsAny(path) & permBitExec)
            );
        }
        return true;
    }
    if (user === getPathUsr(path) && getPermBitsUsr(path) & action) {
        return true;
    }
    return false;
};

const groupHasPermission: Function = (path: string, action: number, identity: Identity) => {
    const groups: Array<string> = identity.groups;
    if (groups.includes(getPathGrp(path)) && getPermBitsGrp(path) & action) {
        return true;
    }
    return false;
};

const anyHasPermission: Function = (path: string, action: number): boolean => {
    if (getPermBitsAny(path) & action) {
        return true;
    }
    return false;
};
// tslint:enable: no-bitwise


const hasPermission: Function = (path: string, action: number, identity: number) => {
    return (
        userHasPermission(path, action, identity)
        ||
        groupHasPermission(path, action, identity)
        ||
        anyHasPermission(path, action)
    );
};


const getFileName: Function = (path: string): string => path.split("/").pop() || "";

const getFileExt: Function = (path: string): string => {
    const parts: Array<string> = getFileName(path).split(".");
    return parts.length > 1 ? parts.pop() || "" : "";
};

const isDir: Function = (path: string) => {
    if (path.length < 1 || path === "/") {
        return true;
    }
    return localStorage.getItem(dirPath(path)) === dirString;
};

const isDirCheck: Function = (path: string) => {
    if (!isDir(path)) {
        throw ["Access Error", "Path is not directory", path].join(" : ");
    }
};

const getFileDir: Function = (path: string): string => {
    const parts: Array<string> = path.split("/");
    path = parts.slice(0, path.length - 1).join("/");
    return path;
};


const hasPermissionCheck: Function = (path: string, action: number, identity: Identity) => {
    if (!hasPermission(path, action, identity)) {
        throw ["Permissions Error", "Denied " + permStringPart(action), path].join(" : ");
    }
};
const hasDirPermissionCheck: Function = (path: number, action: number, identity: number) =>
    hasPermissionCheck(getFileDir(path), action, identity);

const dirAccessCheck: Function = (path: string, identity: Identity) => {
    path = getFileDir(path);
    const parts: Array<string> = path.split("/");
    for (let i: number = 2; i <= parts.length; i++) {
        const p: string = parts.slice(0, i).join("/");
        isDirCheck(p);
        hasPermissionCheck(p, permBitExec, identity);
    }
};



const fileExists: Function = (path: string): boolean => {
    return localStorage.hasOwnProperty(filePath(path)) !== null;
};

const fileDirExistsCheck: Function = (path: string): void => {
    path = getFileDir(path);
    isDirCheck(path);
};


const fileExistsCheck: Function = (path: string) => {
    if (!fileExists(path)) {
        throw ["Access Error", "Path does not exist", path].join(" : ");
    }
};

const fileNotExistsCheck: Function = (path: string) => {
    if (fileExists(path)) {
        throw ["Access Error", "Path exists", path].join(" : ");
    }
};

const resolveWorkingPath: Function = (path: string, working: string): string => {
    working = slashWrap(working || "/");
    path = path.trim();
    if (path.charAt(0) !== "/") {
        path = working + path;
    }
    path = fixPath(path);
    return path;
};

const resolvePath: Function = (path: string, identity: Identity): string => {
    path = resolveWorkingPath(path, identity.workingDir);
    dirAccessCheck(path, identity);
    return path;
};

const resolveExecPaths: Function = (exec: string, identity: Identity): Array<string> =>
    [resolvePath(exec, identity), ...identity.path.map(p => resolveWorkingPath(exec, p))];





// tslint:disable:no-bitwise
const doChmod: Function = (path: string, usr: number, grp: number, any: number) => {
    let perms: number = 0;
    perms |= (usr << bitOffsetUsr);
    perms |= (grp << bitOffsetGrp);
    perms |= (any << bitOffsetAny);
    localStorage.setItem(permPath(path), "0x" + perms.toString(16));
};
// tslint:enable:no-bitwise

export const chmod: Function = (path: string, identity: Identity, hex: string) => {
    path = resolvePath(path, identity);
    fileExistsCheck(path);
    if (typeof hex !== "string" || hex.length !== 3) {
        throw ["FS Error", "" + hex, "must be 3 digits long"];
    }
    const grp: number = parseInt("0x" + hex.charAt(1), 10);
    const usr: number = parseInt("0x" + hex.charAt(0), 10);
    const any: number = parseInt("0x" + hex.charAt(2), 10);
    if (identity.priveledged || getPathUsr(path) === identity.user) {
        return doChmod(path, usr, grp, any);
    }
    throw ["FS ERROR", path, "Permissions can only be changed by root or owner"];
};

const doChown: Function = (path: string, identity: Identity, user?: string, group?: string) => {
    localStorage.setItem(owndPath(path), [user || identity.user, group || identity.user].join(":"));
};
export const chown: Function = (path: string, identity: Identity, user?: string, group?: string) => {
    path = resolvePath(path, identity);
    fileExistsCheck(path);
    if (identity.priveledged) {
        return doChown(path, identity, user, group);
    }
    throw ["FS Error", "chown", "requires root"];
};


const doMkdir: Function = (path: string, identity: Identity): string => {
    localStorage.setItem(dirPath(path), dirString);
    // tslint:disable-next-line:no-bitwise
    doChmod(path, permBitRead | permBitWrit | permBitExec, permBitRead | permBitExec, permBitRead | permBitExec);
    doChown(path, identity);
    return path;
};

export const mkdir: Function = (path: string, identity: number) => {
    try {
        path = resolvePath(path, identity);
        fileDirExistsCheck(path);
        fileNotExistsCheck(path);
        hasDirPermissionCheck(path, permBitWrit, identity);
        return Promise.resolve(doMkdir(path, identity));
    } catch (e) {
        return Promise.reject([...e]);
    }
};

const doWrite: Function = (path: string, content: string, exists: boolean, identity: Identity) => {
    exists = exists === true;
    localStorage.setItem(filePath(path), content);
    if (!exists) {
        // tslint:disable-next-line:no-bitwise
        doChmod(path, permBitRead | permBitWrit, permBitRead, permBitRead);
        doChown(path, identity);
    }
    return [path, content];
};

export const write: Function = (path: string, content: string, identity: Identity): Promise<Array<string>> => {
    try {
        path = resolvePath(path, identity);
        const exists: boolean = fileExists(path);
        if (exists) {
            hasPermissionCheck(path, permBitWrit, identity);
        } else {
            hasDirPermissionCheck(path, permBitWrit, identity);
        }
        return Promise.resolve(doWrite(path, content, exists, identity));
    } catch (e) {
        return Promise.reject([...e]);
    }
};
export const touch: Function = (path: string, identity: Identity): Promise<Array<string>> => write(path, "", identity);

const doRead: Function = (path: string): string | null => localStorage.getItem(filePath(path));

export const read: Function = (path: String, identity: Identity): Promise<string | null> => {
    try {
        path = resolvePath(path, identity);
        fileExistsCheck(path);
        hasPermissionCheck(path, permBitRead, identity);
        return Promise.resolve(doRead(path));
    } catch (e) {
        return Promise.reject([...e]);
    }
};


const doDel: Function = (path: string): string => {
    localStorage.removeItem(filePath(path));
    localStorage.removeItem(permPath(path));
    localStorage.removeItem(owndPath(path));
    return path;
};

export const del: Function = (path: string, identity: Identity): Promise<string> => {
    try {
        path = resolvePath(path, identity);
        hasDirPermissionCheck(path, permBitWrit, identity);
        fileExistsCheck(path);
        return Promise.resolve(doDel(path));
    } catch (e) {
        return Promise.reject([...e]);
    }
};

const getChildren: Function = (path: string): Array<IFSListEntrySpawn> => {
    const f: string = filePath(path) + "/";
    const d: string = dirPath(path) + "/";
    const l: number = path.split("/").length;
    return Object.keys(localStorage)
        .filter(p => p.startsWith(f) || p.startsWith(d))
        .filter(p => p.split("/").length <= l + 1)
        .map(p => {
            const parts: Array<string> = p.split(":");
            return { file: parts[0] === "FSF", path: parts[1] };
        });
};

interface IFSListEntrySpawn {
    file: boolean;
    path: string;
}

const listEntry: Function = (entry: IFSListEntrySpawn): IFSListEntry => {
    const dir: boolean = !entry.file;
    const path: string = entry.path;
    const ownerData: Array<string> = getPathOwners(path);
    const perms: number = getPermBits(path);
    return {
        full: path,
        path: getFileDir(path),
        name: getFileName(path),
        ext: !dir ? getFileExt(path) : "",
        file: !dir,
        user: ownerData[0],
        group: ownerData[1],
        permBytes: perms,
        perms: (dir ? "d" : "-") + permString(perms),
        size: dir ? 0 : new Blob([doRead(path)]).size,
    };
};

export const list: Function = (path: string, identity: Identity): Promise<Array<IFSListEntry>> => {
    try {
        path = resolvePath(path, identity);
        hasPermissionCheck(path, permBitRead, identity);
        const paths: Array<IFSListEntry> = getChildren(path)
            .map((p: IFSListEntrySpawn) => listEntry(p))
            .sort((a: IFSListEntry, b: IFSListEntry) => a.full < b.full ? -1 : (a.full > b.full ? 1 : 0));
        return Promise.resolve(paths);
    } catch (e) {
        return Promise.reject(e);
    }
};

export interface IFSListEntry {
    full: string;
    path: string;
    name: string;
    ext: string;
    file: boolean;
    user: string;
    group: string;
    permBytes: number;
    perms: string;
    size: number;
}

export const getExec: Function = (exec: string, identity: Identity): Promise<string> => {
    try {
        exec = cleanSlash(exec);
        const paths: Array<string> = resolveExecPaths(exec, identity);
        for (let i: number = 0; i < paths.length; i++) {
            const path: string = paths[i];
            if (fileExists(path)) {
                if (hasPermission(path, permBitExec, identity)) {
                    return Promise.resolve(path);
                }
            }
        }
        throw ["FS Error", exec, "Not found"];
    } catch (e) {
        return Promise.reject([...e]);
    }
};

export const execRead: Function = (exec: string, identity: Identity): Promise<Array<string>> => {
    return new Promise((resolve, reject) => {
        getExec(exec, identity)
            .then((path: string) => {
                read(path, identity)
                    .then((data: string) => resolve([path, data]))
                    .catch((e: Error) => reject(e));
            })
            .catch((e: Error) => reject(e));
    });
};



export default {
    read,
    write,
    del,
    list,
    touch,
    mkdir,
    getExec,
    execRead,
    chmod,
    chown,
};