
import { Part, UsageMetadata, ChatHistoryItem } from "@google/genai";
import { ThoughtSupportingPart } from '../../types';
import { logService } from "../logService";
import { streamRequest, makeRequest } from "./requestUtils";

export const sendChatStreamApi = async (
    apiKey: string,
    modelId: string,
    contents: ChatHistoryItem[],
    config: any,
    abortSignal: AbortSignal,
    onPart: (part: Part) => void,
    onThoughtChunk: (chunk: string) => void,
    onError: (error: Error) => void,
    onComplete: (usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => void,
    baseUrl?: string
): Promise<void> => {
    logService.info(`Sending stream request via raw fetch. Proxy: ${baseUrl || 'None'}`);
    let finalUsageMetadata: UsageMetadata | undefined = undefined;
    let finalGroundingMetadata: any = null;
    let finalUrlContextMetadata: any = null;

    try {
        const payload = {
            contents,
            generationConfig: config,
            safetySettings: config.safetySettings,
            tools: config.tools,
            toolConfig: config.toolConfig,
            systemInstruction: config.systemInstruction ? { parts: [{ text: config.systemInstruction }] } : undefined
        };

        // Cleanup flat config properties that were mixed in buildGenerationConfig
        delete (payload.generationConfig as any).safetySettings;
        delete (payload.generationConfig as any).systemInstruction;
        delete (payload.generationConfig as any).tools;
        delete (payload.generationConfig as any).toolConfig;

        const stream = streamRequest(baseUrl, apiKey, modelId, 'streamGenerateContent', payload, abortSignal);

        for await (const chunkResponse of stream) {
            if (abortSignal.aborted) break;

            if (chunkResponse.usageMetadata) {
                finalUsageMetadata = chunkResponse.usageMetadata;
            }
            const candidate = chunkResponse.candidates?.[0];
            
            if (candidate) {
                if (candidate.groundingMetadata) {
                    finalGroundingMetadata = candidate.groundingMetadata;
                }
                const urlMetadata = candidate.urlContextMetadata || candidate.url_context_metadata;
                if (urlMetadata) {
                    finalUrlContextMetadata = urlMetadata;
                }

                if (candidate.content?.parts?.length) {
                    for (const part of candidate.content.parts) {
                        const pAsThoughtSupporting = part as ThoughtSupportingPart;
                        // Map API 'thought' field if present (for experimental models)
                        if (pAsThoughtSupporting.thought) {
                            onThoughtChunk(part.text || '');
                        } else {
                            onPart(part);
                        }
                    }
                }
            }
        }
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            logService.warn("Stream aborted by user.");
        } else {
            logService.error("Error in raw stream request:", error);
            onError(error instanceof Error ? error : new Error(String(error)));
        }
    } finally {
        onComplete(finalUsageMetadata, finalGroundingMetadata, finalUrlContextMetadata);
    }
};

export const sendChatNonStreamApi = async (
    apiKey: string,
    modelId: string,
    contents: ChatHistoryItem[],
    config: any,
    abortSignal: AbortSignal,
    onError: (error: Error) => void,
    onComplete: (parts: Part[], thoughtsText?: string, usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => void,
    baseUrl?: string
): Promise<void> => {
    logService.info(`Sending non-stream request via raw fetch. Proxy: ${baseUrl || 'None'}`);
    
    try {
        const payload = {
            contents,
            generationConfig: config,
            safetySettings: config.safetySettings,
            tools: config.tools,
            toolConfig: config.toolConfig,
            systemInstruction: config.systemInstruction ? { parts: [{ text: config.systemInstruction }] } : undefined
        };

        delete (payload.generationConfig as any).safetySettings;
        delete (payload.generationConfig as any).systemInstruction;
        delete (payload.generationConfig as any).tools;
        delete (payload.generationConfig as any).toolConfig;

        const response = await makeRequest(baseUrl, apiKey, modelId, 'generateContent', payload, abortSignal);

        if (abortSignal.aborted) {
            onComplete([], "", undefined, undefined, undefined);
            return;
        }

        let thoughtsText = "";
        const responseParts: Part[] = [];
        const candidate = response.candidates?.[0];

        if (candidate?.content?.parts) {
            for (const part of candidate.content.parts) {
                const pAsThoughtSupporting = part as ThoughtSupportingPart;
                if (pAsThoughtSupporting.thought) thoughtsText += part.text;
                else responseParts.push(part);
            }
        } else if (response.text) {
             responseParts.push({ text: response.text });
        }
        
        const groundingMetadata = candidate?.groundingMetadata;
        const urlContextMetadata = candidate?.urlContextMetadata || candidate?.url_context_metadata;

        onComplete(responseParts, thoughtsText || undefined, response.usageMetadata, groundingMetadata, urlContextMetadata);

    } catch (error) {
        logService.error("Error in raw non-stream request:", error);
        onError(error instanceof Error ? error : new Error(String(error)));
    }
};
