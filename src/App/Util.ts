import { ILibUtil } from "./libOS";

export const Util: ILibUtil = {
    loadArgs: (args, opts, map): Promise<string[]> => {
        let remain: string[] = [];
        for (let i: number = 0; i < args.length; i++) {
            let arg: any = args[i];
            if (arg.startsWith("--") && arg.length > 2) {
                arg = arg.slice(2);
                if (opts.hasOwnProperty(arg)) {
                    if (i < args.length - 1 && !args[i + 1].startsWith("-")) {
                        i++;
                        opts[arg] = args[i];
                    } else {
                        opts[arg] = !opts[arg];
                    }
                } else {
                    return Promise.reject(
                        new Error(
                            ["Load Args Error",
                                "unrecognized option '--" + arg + "'\nTry '--help' for more information.",
                                JSON.stringify(args)
                            ].join(" : "))
                    );
                }
            } else if (arg.startsWith("-") && arg.length > 1 && arg !== "--") {
                arg = arg.slice(1);
                for (let j = 0; j < arg.length; j++) {
                    const shrt: string = arg.charAt(j);
                    if (map.hasOwnProperty(shrt)) {
                        opts[map[shrt]] = !opts[map[shrt]];
                    }
                }
            } else {
                remain = [...remain, arg];
            }
        }
        return Promise.resolve(remain);
    },
    bytesToHuman: (bytes, kibi, bits) => {
        kibi = kibi === true;
        bits = bits === true;
        if (bits) bytes *= 8;
        const step = kibi ? 1000 : 1024;
        const set =
            bits ?
                (kibi ? ["b", "kb", "mb", "gb", "pb"] : ["b", "Kb", "Mb", "Gb", "Pb"])
                :
                (kibi ? ["B", "kB", "mB", "gB", "pB"] : ["B", "KB", "MB", "GB", "PB"])
            ;
        let o = 0;

        while (bytes > step) {
            bytes /= step;
            o++;
        }
        return Math.round(bytes) + set[o];
    }
};