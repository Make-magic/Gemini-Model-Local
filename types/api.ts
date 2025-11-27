
import { Part, File as GeminiFile, UsageMetadata, ChatHistoryItem } from "@google/genai";
import { ModelOption } from './settings';

export interface GeminiService {
  getAvailableModels: (apiKeyString: string | null, baseUrl?: string) => Promise<ModelOption[]>;
  uploadFile: (apiKey: string, file: File, mimeType: string, displayName: string, signal: AbortSignal, baseUrl?: string) => Promise<GeminiFile>;
  getFileMetadata: (apiKey: string, fileApiName: string, baseUrl?: string) => Promise<GeminiFile | null>;
  
  // Replaced Chat object methods with stateless ones
  sendChatStream: (
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
  ) => Promise<void>;

  sendChatNonStream: (
    apiKey: string,
    modelId: string,
    contents: ChatHistoryItem[],
    config: any,
    abortSignal: AbortSignal,
    onError: (error: Error) => void,
    onComplete: (parts: Part[], thoughtsText?: string, usageMetadata?: UsageMetadata, groundingMetadata?: any, urlContextMetadata?: any) => void,
    baseUrl?: string
  ) => Promise<void>;

  generateImages: (apiKey: string, modelId: string, prompt: string, aspectRatio: string, abortSignal: AbortSignal, baseUrl?: string) => Promise<string[]>;
  generateSpeech: (apiKey: string, modelId: string, text: string, voice: string, abortSignal: AbortSignal, baseUrl?: string) => Promise<string>;
  transcribeAudio: (apiKey: string, audioFile: File, modelId: string, options: { isThinkingEnabled: boolean }, baseUrl?: string) => Promise<string>;
  translateText(apiKey: string, text: string, baseUrl?: string): Promise<string>;
  generateTitle(apiKey: string, userContent: string, modelContent: string, language: 'en' | 'zh', baseUrl?: string): Promise<string>;
  generateSuggestions(apiKey: string, userContent: string, modelContent: string, language: 'en' | 'zh', baseUrl?: string): Promise<string[]>;
  editImage: (apiKey: string, modelId: string, history: ChatHistoryItem[], parts: Part[], abortSignal: AbortSignal, aspectRatio?: string, baseUrl?: string) => Promise<Part[]>;
}

export interface ThoughtSupportingPart extends Part {
    thought?: any;
}
