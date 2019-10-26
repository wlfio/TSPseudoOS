import ls from "./ls";
import bash from "./bash";
import mkdir from "./mkdir";

export const DefaultApps: { [s: string]: Function } = {
    ls,
    bash,
    mkdir,
};