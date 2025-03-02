import { API_VERSIONS, ApiEventLogSchema, CancelRunsForEventSchema, CancelRunsForJobSchema, ConnectionAuthSchema, EphemeralEventDispatcherResponseBodySchema, GetEventSchema, GetRunSchema, GetRunStatusesSchema, GetRunsSchema, InvokeJobResponseSchema, JobRunStatusRecordSchema, KeyValueStoreResponseBodySchema, RegisterScheduleResponseBodySchema, RegisterSourceEventSchemaV2, RunTaskResponseWithCachedTasksBodySchema, ServerTaskSchema, TriggerSourceSchema, assertExhaustive, urlWithSearchParams, } from "@trigger.dev/core";
import { Logger } from "@trigger.dev/core-backend";
import { env } from "node:process";
import { z } from "zod";
import { KeyValueStoreClient } from "./store/keyValueStoreClient";
export class ApiClient {
    #apiUrl;
    #options;
    #logger;
    #storeClient;
    constructor(options) {
        this.#options = options;
        this.#apiUrl = this.#options.apiUrl ?? env.TRIGGER_API_URL ?? "https://api.trigger.dev";
        this.#logger = new Logger("trigger.dev", this.#options.logLevel);
        this.#storeClient = new KeyValueStoreClient(this.#queryKeyValueStore.bind(this));
    }
    async registerEndpoint(options) {
        const apiKey = await this.#apiKey();
        this.#logger.debug("Registering endpoint", {
            url: options.url,
            name: options.name,
        });
        const response = await fetch(`${this.#apiUrl}/api/v1/endpoints`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                url: options.url,
                name: options.name,
            }),
        });
        if (response.status >= 400 && response.status < 500) {
            const body = await response.json();
            throw new Error(body.error);
        }
        if (response.status !== 200) {
            throw new Error(`Failed to register entry point, got status code ${response.status}`);
        }
        return await response.json();
    }
    async runTask(runId, task, options = {}) {
        const apiKey = await this.#apiKey();
        this.#logger.debug("Running Task", {
            task,
        });
        return await zodfetchWithVersions({
            [API_VERSIONS.LAZY_LOADED_CACHED_TASKS]: RunTaskResponseWithCachedTasksBodySchema,
        }, ServerTaskSchema, `${this.#apiUrl}/api/v1/runs/${runId}/tasks`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                "Idempotency-Key": task.idempotencyKey,
                "X-Cached-Tasks-Cursor": options.cachedTasksCursor ?? "",
                "Trigger-Version": API_VERSIONS.LAZY_LOADED_CACHED_TASKS,
            },
            body: JSON.stringify(task),
        });
    }
    async completeTask(runId, id, task) {
        const apiKey = await this.#apiKey();
        this.#logger.debug("Complete Task", {
            task,
        });
        return await zodfetch(ServerTaskSchema, `${this.#apiUrl}/api/v1/runs/${runId}/tasks/${id}/complete`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                "Trigger-Version": API_VERSIONS.SERIALIZED_TASK_OUTPUT,
            },
            body: JSON.stringify(task),
        });
    }
    async failTask(runId, id, body) {
        const apiKey = await this.#apiKey();
        this.#logger.debug("Fail Task", {
            id,
            runId,
            body,
        });
        return await zodfetch(ServerTaskSchema, `${this.#apiUrl}/api/v1/runs/${runId}/tasks/${id}/fail`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(body),
        });
    }
    async sendEvent(event, options = {}) {
        const apiKey = await this.#apiKey();
        this.#logger.debug("Sending event", {
            event,
        });
        return await zodfetch(ApiEventLogSchema, `${this.#apiUrl}/api/v1/events`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ event, options }),
        });
    }
    async sendEvents(events, options = {}) {
        const apiKey = await this.#apiKey();
        this.#logger.debug("Sending multiple events", {
            events,
        });
        return await zodfetch(ApiEventLogSchema.array(), `${this.#apiUrl}/api/v1/events/bulk`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ events, options }),
        });
    }
    async cancelEvent(eventId) {
        const apiKey = await this.#apiKey();
        this.#logger.debug("Cancelling event", {
            eventId,
        });
        return await zodfetch(ApiEventLogSchema, `${this.#apiUrl}/api/v1/events/${eventId}/cancel`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
        });
    }
    async cancelRunsForEvent(eventId) {
        const apiKey = await this.#apiKey();
        this.#logger.debug("Cancelling runs for event", {
            eventId,
        });
        return await zodfetch(CancelRunsForEventSchema, `${this.#apiUrl}/api/v1/events/${eventId}/cancel-runs`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
        });
    }
    async updateStatus(runId, id, status) {
        const apiKey = await this.#apiKey();
        this.#logger.debug("Update status", {
            id,
            status,
        });
        return await zodfetch(JobRunStatusRecordSchema, `${this.#apiUrl}/api/v1/runs/${runId}/statuses/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(status),
        });
    }
    async updateSource(client, key, source) {
        const apiKey = await this.#apiKey();
        this.#logger.debug("activating http source", {
            source,
        });
        const response = await zodfetch(TriggerSourceSchema, `${this.#apiUrl}/api/v2/${client}/sources/${key}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(source),
        });
        return response;
    }
    async updateWebhook(key, webhookData) {
        const apiKey = await this.#apiKey();
        this.#logger.debug("activating webhook", {
            webhookData,
        });
        const response = await zodfetch(TriggerSourceSchema, `${this.#apiUrl}/api/v1/webhooks/${key}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(webhookData),
        });
        return response;
    }
    async registerTrigger(client, id, key, payload, idempotencyKey) {
        const apiKey = await this.#apiKey();
        this.#logger.debug("registering trigger", {
            id,
            payload,
        });
        const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        };
        if (idempotencyKey) {
            headers["Idempotency-Key"] = idempotencyKey;
        }
        const response = await zodfetch(RegisterSourceEventSchemaV2, `${this.#apiUrl}/api/v2/${client}/triggers/${id}/registrations/${key}`, {
            method: "PUT",
            headers: headers,
            body: JSON.stringify(payload),
        });
        return response;
    }
    async registerSchedule(client, id, key, payload) {
        const apiKey = await this.#apiKey();
        this.#logger.debug("registering schedule", {
            id,
            payload,
        });
        const response = await zodfetch(RegisterScheduleResponseBodySchema, `${this.#apiUrl}/api/v1/${client}/schedules/${id}/registrations`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({ id: key, ...payload }),
        });
        return response;
    }
    async unregisterSchedule(client, id, key) {
        const apiKey = await this.#apiKey();
        this.#logger.debug("unregistering schedule", {
            id,
        });
        const response = await zodfetch(z.object({ ok: z.boolean() }), `${this.#apiUrl}/api/v1/${client}/schedules/${id}/registrations/${encodeURIComponent(key)}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
        });
        return response;
    }
    async getAuth(client, id) {
        const apiKey = await this.#apiKey();
        this.#logger.debug("getting auth", {
            id,
        });
        const response = await zodfetch(ConnectionAuthSchema, `${this.#apiUrl}/api/v1/${client}/auth/${id}`, {
            method: "GET",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
        }, {
            optional: true,
        });
        return response;
    }
    async getEvent(eventId) {
        const apiKey = await this.#apiKey();
        this.#logger.debug("Getting Event", {
            eventId,
        });
        return await zodfetch(GetEventSchema, `${this.#apiUrl}/api/v2/events/${eventId}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });
    }
    async getRun(runId, options) {
        const apiKey = await this.#apiKey();
        this.#logger.debug("Getting Run", {
            runId,
        });
        return await zodfetch(GetRunSchema, urlWithSearchParams(`${this.#apiUrl}/api/v2/runs/${runId}`, options), {
            method: "GET",
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });
    }
    async cancelRun(runId) {
        const apiKey = await this.#apiKey();
        this.#logger.debug("Cancelling Run", {
            runId,
        });
        return await zodfetch(GetRunSchema, `${this.#apiUrl}/api/v1/runs/${runId}/cancel`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
        });
    }
    async getRunStatuses(runId) {
        const apiKey = await this.#apiKey();
        this.#logger.debug("Getting Run statuses", {
            runId,
        });
        return await zodfetch(GetRunStatusesSchema, `${this.#apiUrl}/api/v2/runs/${runId}/statuses`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });
    }
    async getRuns(jobSlug, options) {
        const apiKey = await this.#apiKey();
        this.#logger.debug("Getting Runs", {
            jobSlug,
        });
        return await zodfetch(GetRunsSchema, urlWithSearchParams(`${this.#apiUrl}/api/v1/jobs/${jobSlug}/runs`, options), {
            method: "GET",
            headers: {
                Authorization: `Bearer ${apiKey}`,
            },
        });
    }
    async invokeJob(jobId, payload, options = {}) {
        const apiKey = await this.#apiKey();
        this.#logger.debug("Invoking Job", {
            jobId,
        });
        const body = {
            payload,
            context: options.context ?? {},
            options: {
                accountId: options.accountId,
                callbackUrl: options.callbackUrl,
            },
        };
        return await zodfetch(InvokeJobResponseSchema, `${this.#apiUrl}/api/v1/jobs/${jobId}/invoke`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
            },
            body: JSON.stringify(body),
        });
    }
    async cancelRunsForJob(jobId) {
        const apiKey = await this.#apiKey();
        this.#logger.debug("Cancelling Runs for Job", {
            jobId,
        });
        return await zodfetch(CancelRunsForJobSchema, `${this.#apiUrl}/api/v1/jobs/${jobId}/cancel-runs`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
        });
    }
    async createEphemeralEventDispatcher(payload) {
        const apiKey = await this.#apiKey();
        this.#logger.debug("Creating ephemeral event dispatcher", {
            payload,
        });
        const response = await zodfetch(EphemeralEventDispatcherResponseBodySchema, `${this.#apiUrl}/api/v1/event-dispatchers/ephemeral`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
        });
        return response;
    }
    get store() {
        return this.#storeClient;
    }
    async #queryKeyValueStore(action, data) {
        const apiKey = await this.#apiKey();
        this.#logger.debug("accessing key-value store", {
            action,
            data,
        });
        const encodedKey = encodeURIComponent(data.key);
        const STORE_URL = `${this.#apiUrl}/api/v1/store/${encodedKey}`;
        const authHeader = {
            Authorization: `Bearer ${apiKey}`,
        };
        let requestInit;
        switch (action) {
            case "DELETE": {
                requestInit = {
                    method: "DELETE",
                    headers: authHeader,
                };
                break;
            }
            case "GET": {
                requestInit = {
                    method: "GET",
                    headers: authHeader,
                };
                break;
            }
            case "HAS": {
                const headResponse = await fetchHead(STORE_URL, {
                    headers: authHeader,
                });
                return {
                    action: "HAS",
                    key: encodedKey,
                    has: !!headResponse.ok,
                };
            }
            case "SET": {
                const MAX_BODY_BYTE_LENGTH = 256 * 1024;
                if ((data.value?.length ?? 0) > MAX_BODY_BYTE_LENGTH) {
                    throw new Error(`Max request body size exceeded: ${MAX_BODY_BYTE_LENGTH} bytes`);
                }
                requestInit = {
                    method: "PUT",
                    headers: {
                        ...authHeader,
                        "Content-Type": "text/plain",
                    },
                    body: data.value,
                };
                break;
            }
            default: {
                assertExhaustive(action);
            }
        }
        const response = await zodfetch(KeyValueStoreResponseBodySchema, STORE_URL, requestInit);
        return response;
    }
    async #apiKey() {
        const apiKey = getApiKey(this.#options.apiKey);
        if (apiKey.status === "invalid") {
            throw new Error("Invalid API key");
            // const chalk = (await import("chalk")).default;
            // const terminalLink = (await import("terminal-link")).default;
            // throw new Error(
            //   `${chalk.red("Trigger.dev error")}: Invalid API key ("${chalk.italic(
            //     apiKey.apiKey
            //   )}"), please set the TRIGGER_API_KEY environment variable or pass the apiKey option to a valid value. ${terminalLink(
            //     "Get your API key here",
            //     "https://app.trigger.dev",
            //     {
            //       fallback(text, url) {
            //         return `${text} 👉 ${url}`;
            //       },
            //     }
            //   )}`
            // );
        }
        else if (apiKey.status === "missing") {
            throw new Error("Missing API key");
            // const chalk = (await import("chalk")).default;
            // const terminalLink = (await import("terminal-link")).default;
            // throw new Error(
            //   `${chalk.red(
            //     "Trigger.dev error"
            //   )}: Missing an API key, please set the TRIGGER_API_KEY environment variable or pass the apiKey option to the Trigger constructor. ${terminalLink(
            //     "Get your API key here",
            //     "https://app.trigger.dev",
            //     {
            //       fallback(text, url) {
            //         return `${text} 👉 ${url}`;
            //       },
            //     }
            //   )}`
            // );
        }
        return apiKey.apiKey;
    }
}
function getApiKey(key) {
    const apiKey = key ?? env.TRIGGER_API_KEY;
    if (!apiKey) {
        return { status: "missing" };
    }
    // Validate the api_key format (should be tr_{env}_XXXXX)
    const isValid = apiKey.match(/^tr_[a-z]+_[a-zA-Z0-9]+$/);
    if (!isValid) {
        return { status: "invalid", apiKey };
    }
    return { status: "valid", apiKey };
}
async function zodfetchWithVersions(versionedSchemaMap, unversionedSchema, url, requestInit, options, retryCount = 0) {
    const response = await fetch(url, requestInitWithCache(requestInit));
    if ((!requestInit || requestInit.method === "GET") &&
        response.status === 404 &&
        options?.optional) {
        // @ts-ignore
        return;
    }
    if (response.status >= 400 && response.status < 500) {
        const body = await response.json();
        throw new Error(body.error);
    }
    if (response.status >= 500 && retryCount < 6) {
        // retry with exponential backoff and jitter
        const delay = exponentialBackoff(retryCount + 1, 2, 50, 1150, 50);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return zodfetchWithVersions(versionedSchemaMap, unversionedSchema, url, requestInit, options, retryCount + 1);
    }
    if (response.status !== 200) {
        throw new Error(options?.errorMessage ?? `Failed to fetch ${url}, got status code ${response.status}`);
    }
    const jsonBody = await response.json();
    const version = response.headers.get("trigger-version");
    if (!version) {
        return {
            version: "unversioned",
            body: unversionedSchema.parse(jsonBody),
        };
    }
    const versionedSchema = versionedSchemaMap[version];
    if (!versionedSchema) {
        throw new Error(`Unknown version ${version}`);
    }
    return {
        version,
        body: versionedSchema.parse(jsonBody),
    };
}
function requestInitWithCache(requestInit) {
    try {
        const withCache = {
            ...requestInit,
            cache: "no-cache",
        };
        const _ = new Request("http://localhost", withCache);
        return withCache;
    }
    catch (error) {
        return requestInit ?? {};
    }
}
async function fetchHead(url, requestInitWithoutMethod, retryCount = 0) {
    const requestInit = {
        ...requestInitWithoutMethod,
        method: "HEAD",
    };
    const response = await fetch(url, requestInitWithCache(requestInit));
    if (response.status >= 500 && retryCount < 6) {
        // retry with exponential backoff and jitter
        const delay = exponentialBackoff(retryCount + 1, 2, 50, 1150, 50);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return fetchHead(url, requestInitWithoutMethod, retryCount + 1);
    }
    return response;
}
async function zodfetch(schema, url, requestInit, options, retryCount = 0) {
    const response = await fetch(url, requestInitWithCache(requestInit));
    if ((!requestInit || requestInit.method === "GET") &&
        response.status === 404 &&
        options?.optional) {
        // @ts-ignore
        return;
    }
    if (response.status >= 400 && response.status < 500) {
        const body = await response.json();
        throw new Error(body.error);
    }
    if (response.status >= 500 && retryCount < 6) {
        // retry with exponential backoff and jitter
        const delay = exponentialBackoff(retryCount + 1, 2, 50, 1150, 50);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return zodfetch(schema, url, requestInit, options, retryCount + 1);
    }
    if (response.status !== 200) {
        throw new Error(options?.errorMessage ?? `Failed to fetch ${url}, got status code ${response.status}`);
    }
    const jsonBody = await response.json();
    return schema.parse(jsonBody);
}
function exponentialBackoff(retryCount, exponential, minDelay, maxDelay, jitter) {
    // Calculate the delay using the exponential backoff formula
    const delay = Math.min(Math.pow(exponential, retryCount) * minDelay, maxDelay);
    // Calculate the jitter
    const jitterValue = Math.random() * jitter;
    // Return the calculated delay with jitter
    return delay + jitterValue;
}