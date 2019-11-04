export type FunctionSetSet = { [s: string]: FunctionSet };
export type FunctionSet = { [s: string]: Function };
export type EventFunctionSet = { [s: string]: () => Promise<any> };
export type PromiseFunction = () => Promise<any>;
export type OSApi = { [s: string]: { [s: string]: (data: any) => Promise<any> } };
export type PromiseHolder = { resolve: Function, reject: Function };
export type AppMessageType = {
    service: string;
    func: string;
};
export type AppMessage = {
    type: AppMessageType;
    data?: any;
    id?: string;
    error?: any;
};
export type AppOpts = { [s: string]: any };
export type AppOptsMap = { [s: string]: string };
export type FunctionSignature = { service: string, func: any };