import FS, { IFSListEntry } from "../Services/FileSystem";


export interface IIdentityContainer {
    getIdentity(): IIdentity;
}

export interface IIdentity extends IIdentityContainer {
    user: string;
    groups: string[];
    workingDir: string;
    priveledged: boolean;
    getEnv(name: string, fallback?: string): string | null;
    setEnv(name: string, value: string | string[]): void;
    changeWorkingPath(path: string): Promise<boolean>;
}

export default class Identity implements IIdentity {
    user: string;
    groups: string[];
    workingDir: string;
    priveledged: boolean;
    env: { [s: string]: string } = {};

    constructor(user: string, groups: Array<String>, workingDir: string) {
        groups = groups || [];
        workingDir = workingDir || "/";

        this.user = user.toLowerCase();
        this.groups = [...groups, this.user]
            .filter((e, i, a) => a.indexOf(e) === i)
            .map(e => e.toLowerCase());
        this.workingDir = workingDir;
        this.priveledged = this.user === "root";
        this.setEnv("path", ["/bin"]);
    }

    setEnv(name: string, value: string | string[]): void {
        if (value instanceof Array) {
            value = value.join(";");
        }
        this.env[name] = value;
    }

    getEnv(name: string, fallback?: string): string | null {
        if (this.env.hasOwnProperty(name)) {
            return this.env[name];
        }
        return fallback || null;
    }

    getIdentity(): IIdentity {
        return this.clone();
    }

    setPriveledged(priveleged: boolean): void {
        this.priveledged = priveleged;
    }

    async changeWorkingPath(path: string): Promise<boolean> {
        try {
            const exists: IFSListEntry[] = await FS.list(path, this);
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
        Object.entries(this.env).forEach((entry: [string, string]) => {
            ident.setEnv(entry[0], entry[1]);
        });
        return ident;
    }
}