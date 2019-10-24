export default class Identity {
    user: string;
    groups: Array<string>;
    workingDir: string;
    path: Array<string>;
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

    setPriveledged(priveleged: boolean): void {
        this.priveledged = priveleged;
    }

    addToPath(path: string): void {
        this.path = [...this.path, path].filter((e, i, a) => a.indexOf(e) === i);
    }

    clone(): Identity {
        const ident: Identity = new Identity(this.user + "", [...this.groups], this.workingDir + "");
        ident.setPriveledged(this.priveledged === true);
        this.path.forEach(p => ident.addToPath(p + ""));
        return ident;
    }
}