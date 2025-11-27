
import { logService } from "../logService";

const DEFAULT_BASE_URL = 'https://generativelanguage.googleapis.com';

/**
 * Normalizes the base URL by stripping trailing slashes and version suffixes
 * to ensure consistent appending of endpoints.
 */
export const normalizeBaseUrl = (url?: string | null): string => {
    if (!url || !url.trim()) return DEFAULT_BASE_URL;
    let clean = url.trim();
    // Remove trailing slashes
    clean = clean.replace(/\/+$/, '');
    // Remove known version suffixes if the user pasted a full endpoint
    clean = clean.replace(/\/v1beta\/?$/, '');
    clean = clean.replace(/\/v1\/?$/, '');
    return clean;
};

/**
 * Constructs the full API URL.
 */
export const buildUrl = (baseUrl: string, modelId: string, method: string, apiKey: string): string => {
    const root = normalizeBaseUrl(baseUrl);
    // If modelId already contains 'models/', don't double it if the method also implies it, 
    // but standard pattern is v1beta/models/gemini-pro:generateContent
    // If modelId is just 'gemini-pro', we prefix.
    const modelPath = modelId.startsWith('models/') || modelId.startsWith('tunedModels/') ? modelId : `models/${modelId}`;
    return `${root}/v1beta/${modelPath}:${method}?key=${apiKey}`;
};

/**
 * Determines headers for the request.
 * For custom proxies, we use 'text/plain' to treat it as a Simple Request and avoid CORS preflight (OPTIONS).
 * For the official Google API, we use 'application/json'.
 */
const getHeaders = (baseUrl: string | undefined) => {
    const isCustomProxy = baseUrl && normalizeBaseUrl(baseUrl) !== DEFAULT_BASE_URL;
    return {
        'Content-Type': isCustomProxy ? 'text/plain' : 'application/json',
    };
};

/**
 * Generic fetch wrapper for non-streaming requests.
 */
export const makeRequest = async (
    baseUrl: string | undefined,
    apiKey: string,
    modelId: string,
    method: string,
    payload: any,
    abortSignal?: AbortSignal
): Promise<any> => {
    const url = buildUrl(baseUrl || DEFAULT_BASE_URL, modelId, method, apiKey);
    const headers = getHeaders(baseUrl);
    
    logService.debug(`[RawFetch] POST ${url}`, { payloadSummary: Object.keys(payload), headers });

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        signal: abortSignal,
        mode: 'cors',
    });

    if (!response.ok) {
        let errorBody;
        try {
            errorBody = await response.text();
            // Try to parse as JSON to get a pretty error message
            const errorJson = JSON.parse(errorBody);
            if (errorJson.error && errorJson.error.message) {
                throw new Error(errorJson.error.message);
            }
        } catch (e) {
            // If text or json parsing failed, use status text
            if (e instanceof Error && e.message !== 'Unexpected token') {
                 // It was a valid JSON error that we threw above
                 throw e;
            }
        }
        throw new Error(`API Error ${response.status}: ${errorBody || response.statusText}`);
    }

    return response.json();
};

/**
 * Generator for streaming requests.
 * Parses the Gemini JSON array stream incrementally.
 */
export async function* streamRequest(
    baseUrl: string | undefined,
    apiKey: string,
    modelId: string,
    method: string,
    payload: any,
    abortSignal?: AbortSignal
): AsyncGenerator<any, void, unknown> {
    const url = buildUrl(baseUrl || DEFAULT_BASE_URL, modelId, method, apiKey) + '&alt=sse';
    const headers = getHeaders(baseUrl);
    
    logService.debug(`[RawFetch Stream] POST ${url}`, { headers });

    const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        signal: abortSignal,
        mode: 'cors',
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`API Error ${response.status}: ${text}`);
    }

    if (!response.body) throw new Error('Response body is null');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            // SSE Format parsing: lines starting with "data: "
            const lines = buffer.split('\n');
            // Keep the last line in the buffer as it might be incomplete
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data:')) {
                    const jsonStr = trimmed.substring(5).trim();
                    if (!jsonStr) continue;
                    try {
                        const data = JSON.parse(jsonStr);
                        yield data;
                    } catch (e) {
                        console.warn('Failed to parse SSE JSON chunk', e);
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }
}
