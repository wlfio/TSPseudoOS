import FS from "../Services/FileSystem";

export interface IIdentity {
    user: string;
    groups: string[];
    workingDir: string;
    path: string[];
    priveledged: boolean;
    changeWorkingPath(path: string): Promise<boolean>;
}

export interface IIdentityContainer {
    getIdentity(): IIdentity;
}

export default class Identity implements IIdentity, IIdentityContainer {
    user: string;
    groups: string[];
    workingDir: string;
    path: string[];
    priveledged: boolean;

    constructor(user: string, groups: Array<String>, workingDir: string) {
        groups = groups || [];
        workingDir = workingDir || "/";

        this.user = user.toLowerCase();
        this.groups = [...groups, this.user]
            .filter((e, i, a) => a.indexOf(e) === i)
            .map(e => e.toLowerCase());
        this.workingDir = workingDir;
        this.priveledged = this.user === "root";
        this.path = ["/bin"];
    }

    getIdentity(): Identity {
        return this.clone();
    }

    setPriveledged(priveleged: boolean): void {
        this.priveledged = priveleged;
    }

    addToPath(path: string): void {
        this.path = [...this.path, path].filter((e, i, a) => a.indexOf(e) === i);
    }

    async changeWorkingPath(path: string): Promise<boolean> {
        try {
            const exists = await FS.list(path, this);
            if (exists instanceof Array) {
                this.workingDir = path;
                return Promise.resolve(true);
            }
        } catch (e) {
            return Promise.reject(e);
        }
        return Promise.resolve(false);
    }

    clone(): Identity {
        const ident: Identity = new Identity(this.user + "", [...this.groups], this.workingDir + "");
        ident.setPriveledged(this.priveledged === true);
        this.path.forEach(p => ident.addToPath(p + ""));
        return ident;
    }
}