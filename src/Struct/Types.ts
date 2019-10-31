import Process from "./Process";

export type FunctionSetSet = { [s: string]: FunctionSet };
export type FunctionSet = { [s: string]: Function };
export type OSApi = { [s: string]: { [s: string]: (process: Process, data: any) => Promise<any> } };