delete window.localStorage;
delete window.sessionStorage;

const hooks = {};
const calls = {};
const uuid4 = () => {
    function hex(s, b) {
        return s +
            (b >>> 4).toString(16) +  // high nibble
            (b & 0b1111).toString(16);   // low nibble
    }

    let r = crypto.getRandomValues(new Uint8Array(16));

    r[6] = r[6] >>> 4 | 0b01000000; // Set type 4: 0100
    r[8] = r[8] >>> 3 | 0b10000000; // Set variant: 100

    return r.slice(0, 4).reduce(hex, '') +
        r.slice(4, 6).reduce(hex, '-') +
        r.slice(6, 8).reduce(hex, '-') +
        r.slice(8, 10).reduce(hex, '-') +
        r.slice(10, 16).reduce(hex, '-');
};

const response = msg => {
    msg = msg.data;
    const type = msg.type;
    if (!(type instanceof Array)) {
        return;
    }
    if (type[0] === "response") {
        if (calls.hasOwnProperty(msg.id)) {
            const prom = calls[msg.id];
            if (msg.hasOwnProperty("error")) {
                prom.reject(msg.error);
            } else {
                prom.resolve(msg.data);
            }
            delete calls[msg.id];
        }
    } else {
        fireHooks(type, msg.data, msg.id);
    }
}

const msg = (type, data, id) => {
    window.parent.postMessage({ type: type, data: data, id: id });
}

const request = (type, data) => {
    const id = uuid4();
    return new Promise((resolve, reject) => {
        calls[id] = { resolve: resolve, reject: reject };
        msg(type, data, id);
    });
}

window.addEventListener("message", response);

const hookEvent = (event, cb) => {
    event = event.join(":");
    if (!hooks.hasOwnProperty(event)) {
        hooks[event] = [];
    }
    hooks[event] = [...hooks[event], cb];
}

const fireHooks = (type, data, id) => {
    type = type.join(":");
    if (hooks.hasOwnProperty(type)) {
        const wantsPromise = (typeof id === "string" && id.length > 0);
        hooks[type].forEach(hook => {
            const p = hook(data);
            if (wantsPromise) {
                if (p instanceof Promise) {
                    p.then(data => msg(["response"], data, id));
                } else {
                    OS.Process.crash("Hook [" + type + "] did not return Promise");
                }
            }
        });
    }
};

const Util = {
    loadArgs: (args, opts, map) => {
        let remain = [];
        for (let i = 0; i < args.length; i++) {
            let arg = args[i];
            if (arg.startsWith("--") && arg.length > 2) {
                arg = arg.slice(2);
                if ((i < args.length - 1) && opts.hasOwnProperty(arg)) {
                    i++;
                    opts[arg] = args[i];
                }
            } else if (arg.startsWith("-") && arg.length > 1 && arg !== "--") {
                arg = arg.slice(1);
                for (let j = 0; j < arg.length; j++) {
                    const shrt = arg.charAt(j);
                    if (map.hasOwnProperty(shrt)) {
                        opts[map[shrt]] = !opts[map[shrt]];
                    }
                }
            } else {
                remain = [...remain, arg];
            }
        }
        return remain;
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

const libJSPseudoOS = {
    FS: {
        read: path => request(["FS", "read"], path),
        write: (path, content) => request(["FS", "write"], { path: path, content: content }),
        list: path => request(["FS", "list"], path),
        mkdir: path => request(["FS", "mkdir"], path),
        touch: path => request(["FS", "touch"], path),
        del: path => request(["FS", "del"], path),
    },
    Std: {
        out: data => msg(["Std", "out"], data),
        inEvent: cb => hookEvent(["Std", "in"], cb),
    },
    Out: {
        print: msg => msg(["Out", "print"], { txt: msg, over: 0 }),
        printLn: msg => OS.Out.print(msg + "\n"),
        printOver: (msg, over) => msg(["Out", "printOver"], { txt: msg, over: over }),
    },
    Process: {
        startEvent: cb => hookEvent(["Process", "start"], cb),
        msgEvent: cb => hookEvent(["Process", "msg"], cb),
        msg: (pid, msg) => request(["Process", "msg"], { pid: pid, msg: msg }),
        end: () => msg(["Process", "end"]),
        crash: error => msg(["Process", "crash"], error),
        ready: () => msg(["Process", "ready"]),
        start: (exec, params) => request(["Process", "start"], { exec: exec, params: params }),
        kill: (pid) => request(["Process", "kill"], { pid }),
        list: () => request(["Process", "list"]),
        self: () => request(["Process", "self"]),
    },
    Util: Util,
};
OS = libJSPseudoOS;


document.addEventListener("DOMContentLoaded", function (event) {
    request(["boot"])
        .then(data => {
            fireHooks(["Process", "start"], data);
        });
});