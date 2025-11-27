
import { GeminiService, ModelOption } from '../types';
import { Part, UsageMetadata, File as GeminiFile, Modality, ChatHistoryItem } from "@google/genai";
import { getAvailableModelsApi } from './api/modelApi';
import { uploadFileApi, getFileMetadataApi } from './api/fileApi';
import { generateImagesApi, generateSpeechApi, transcribeAudioApi, translateTextApi, generateTitleApi, generateSuggestionsApi } from './api/generationApi';
import { sendChatStreamApi, sendChatNonStreamApi } from './api/chatApi';
import { logService } from "./logService";

class GeminiServiceImpl implements GeminiService {
    constructor() {
        logService.info("GeminiService initialized (Raw Fetch Mode).");
    }

    async getAvailableModels(apiKeysString: string | null, baseUrl?: string): Promise<ModelOption[]> {
        return getAvailableModelsApi(apiKeysString, baseUrl);
    }

    async uploadFile(apiKey: string, file: File, mimeType: string, displayName: string, signal: AbortSignal, baseUrl?: string): Promise<GeminiFile> {
        return uploadFileApi(apiKey, file, mimeType, displayName, signal, baseUrl);
    }
    
    async getFileMetadata(apiKey: string, fileApiName: string, baseUrl?: string): Promise<GeminiFile | null> {
        return getFileMetadataApi(apiKey, fileApiName, baseUrl);
    }

    async generateImages(apiKey: string, modelId: string, prompt: string, aspectRatio: string, abortSignal: AbortSignal, baseUrl?: string): Promise<string[]> {
        return generateImagesApi(apiKey, modelId, prompt, aspectRatio, abortSignal, baseUrl);
    }

    async generateSpeech(apiKey: string, modelId: string, text: string, voice: string, abortSignal: AbortSignal, baseUrl?: string): Promise<string> {
        return generateSpeechApi(apiKey, modelId, text, voice, abortSignal, baseUrl);
    }

    async transcribeAudio(apiKey: string, audioFile: File, modelId: string, options: { isThinkingEnabled: boolean }, baseUrl?: string): Promise<string> {
        return transcribeAudioApi(apiKey, audioFile, modelId, options, baseUrl);
    }

    async translateText(apiKey: string, text: string, baseUrl?: string): Promise<string> {
        return translateTextApi(apiKey, text, baseUrl);
    }

    async generateTitle(apiKey: string, userContent: string, modelContent: string, language: 'en' | 'zh', baseUrl?: string): Promise<string> {
        return generateTitleApi(apiKey, userContent, modelContent, language, baseUrl);
    }

    async generateSuggestions(apiKey: string, userContent: string, modelContent: string, language: 'en' | 'zh', baseUrl?: string): Promise<string[]> {
        return generateSuggestionsApi(apiKey, userContent, modelContent, language, baseUrl);
    }

    async editImage(apiKey: string, modelId: string, history: ChatHistoryItem[], parts: Part[], abortSignal: AbortSignal, aspectRatio?: string, baseUrl?: string): Promise<Part[]> {
        return new Promise((resolve, reject) => {
            if (abortSignal.aborted) {
                const abortError = new Error("aborted");
                abortError.name = "AbortError";
                return reject(abortError);
            }
            
            const config: any = {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            };
            
            if (aspectRatio) {
                config.imageConfig = { aspectRatio: aspectRatio };
            }

            // Using non-stream for image edit
            sendChatNonStreamApi(
                apiKey,
                modelId,
                [...history, { role: 'user', parts }],
                config,
                abortSignal,
                reject,
                (responseParts) => resolve(responseParts),
                baseUrl
            );
        });
    }

    // New stateless methods replacing the Chat object methods
    async sendChatStream(
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
    ): Promise<void> {
        return sendChatStreamApi(
            apiKey, modelId, contents, config, abortSignal, onPart, onThoughtChunk, onError, onComplete, baseUrl
        );
    }

    async sendChatNonStream(
        apiKey: string,
        modelId: string,
        contents: ChatHistoryItem[],
        config: any,
        abortSignal: AbortSignal,
        onError: (error: Error) => void,
        onComplete: (parts: Part[], thoughtsText?: string, usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => void,
        baseUrl?: string
    ): Promise<void> {
        return sendChatNonStreamApi(
            apiKey, modelId, contents, config, abortSignal, onError, onComplete, baseUrl
        );
    }
}

export const geminiServiceInstance = new GeminiServiceImpl();
