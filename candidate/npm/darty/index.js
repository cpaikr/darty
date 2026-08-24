import { randomUUID } from "node:crypto";
import { loadNative } from "./native.js";
const native = loadNative();
export class DartyError extends Error {
    code;
    retryable;
    parameter;
    sourceUrl;
    recoveryHint;
    constructor(error) {
        super(error.message);
        this.name = "DartyError";
        this.code = error.code;
        this.retryable = error.retryable;
        this.parameter = error.parameter;
        this.sourceUrl = error.sourceUrl;
        this.recoveryHint = error.recoveryHint;
    }
}
const abortError = () => {
    const error = new Error("The operation was aborted.");
    error.name = "AbortError";
    error.code = "ABORT_ERR";
    return error;
};
const invoke = async (nativeClient, operation, input, options = {}) => {
    const { signal } = options;
    const isAborted = () => signal?.aborted === true;
    if (isAborted())
        throw abortError();
    let inputJson;
    try {
        const encoded = JSON.stringify(input);
        if (encoded === undefined) {
            throw new TypeError("Request input is missing.");
        }
        inputJson = encoded;
    }
    catch {
        throw new DartyError({
            code: "invalid_request",
            message: "Request input must be a JSON-serializable object.",
            retryable: false,
        });
    }
    const operationId = randomUUID();
    nativeClient.registerOperation(operationId);
    const cancel = () => nativeClient.cancelOperation(operationId);
    signal?.addEventListener("abort", cancel, { once: true });
    if (isAborted())
        cancel();
    try {
        const encoded = await nativeClient.executeOperation(operationId, operation, inputJson);
        const outcome = JSON.parse(encoded);
        if (outcome.cancelled === true || isAborted())
            throw abortError();
        if (outcome.error !== undefined)
            throw new DartyError(outcome.error);
        if (outcome.value === undefined)
            throw new Error("The native SDK returned no outcome.");
        return outcome.value;
    }
    finally {
        signal?.removeEventListener("abort", cancel);
    }
};
export class DartyClient {
    #nativeClient;
    constructor() {
        this.#nativeClient = new native.NativeDartyClient();
    }
    searchCompany(input, options) {
        return invoke(this.#nativeClient, "search-company", input, options);
    }
    searchCompanyReports(input, options) {
        return invoke(this.#nativeClient, "search-company-reports", input, options);
    }
    viewReport(input, options) {
        return invoke(this.#nativeClient, "view-report", input, options);
    }
}
