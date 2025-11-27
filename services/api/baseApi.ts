
import { GoogleGenAI, Modality } from "@google/genai";
import { logService } from "../logService";
import { dbService } from '../../utils/db';
import { GEMINI_3_RO_MODELS } from "../../constants/modelConstants";
import { DEEP_SEARCH_SYSTEM_PROMPT } from "../../constants/promptConstants";
import { SafetySetting } from "../../types/settings";


const POLLING_INTERVAL_MS = 2000; // 2 seconds
const MAX_POLLING_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export { POLLING_INTERVAL_MS, MAX_POLLING_DURATION_MS };

export const getClient = (apiKey: string, baseUrl?: string): GoogleGenAI => {
  try {
      // Sanitize the API key
      const sanitizedApiKey = apiKey
          .replace(/[\u2013\u2014]/g, '-')
          .replace(/[\u2018\u2019]/g, "'")
          .replace(/[\u201C\u201D]/g, '"')
          .replace(/[\u00A0]/g, ' ');
          
      if (apiKey !== sanitizedApiKey) {
          logService.warn("API key was sanitized.");
      }
      
      const config: any = { apiKey: sanitizedApiKey };
      
      if (baseUrl && baseUrl.trim().length > 0) {
          let cleanUrl = baseUrl.trim();
          // Remove trailing slash
          cleanUrl = cleanUrl.replace(/\/+$/, '');
          // Remove '/v1beta' or '/v1' suffix if present, as the SDK usually appends this.
          // This avoids the "turns to built-in baseUrl" (fallback on 404) or double-path issues.
          // Example: 'http://localhost:8080/v1beta' -> 'http://localhost:8080'
          cleanUrl = cleanUrl.replace(/\/v1(beta)?\/?$/, '');

          // Assign to all known property variations to ensure SDK version compatibility
          config.baseUrl = cleanUrl;
          config.baseURL = cleanUrl;
          config.apiEndpoint = cleanUrl; 
          config.rootUrl = cleanUrl;
          
          logService.info(`Using custom base URL for SDK: ${cleanUrl}`);
      }
      
      return new GoogleGenAI(config);
  } catch (error) {
      logService.error("Failed to initialize GoogleGenAI client:", error);
      throw error;
  }
};

export const getApiClient = (apiKey?: string | null, baseUrl?: string): GoogleGenAI => {
    if (!apiKey) {
        const silentError = new Error("API key is not configured in settings or provided.");
        silentError.name = "SilentError";
        throw silentError;
    }
    return getClient(apiKey, baseUrl);
};

export const buildGenerationConfig = (
    modelId: string,
    systemInstruction: string,
    config: { temperature?: number; topP?: number },
    showThoughts: boolean,
    thinkingBudget: number,
    isGoogleSearchEnabled?: boolean,
    isCodeExecutionEnabled?: boolean,
    isUrlContextEnabled?: boolean,
    thinkingLevel?: 'LOW' | 'HIGH',
    aspectRatio?: string,
    isDeepSearchEnabled?: boolean,
    imageSize?: string,
    safetySettings?: SafetySetting[]
): any => {
    if (modelId === 'gemini-2.5-flash-image-preview' || modelId === 'gemini-2.5-flash-image') {
        // This model has specific requirements and doesn't support other configs.
        return {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
            imageConfig: {
                aspectRatio: aspectRatio || '1:1',
            }
        };
    }

    if (modelId === 'gemini-3-pro-image-preview') {
         const config: any = {
            responseModalities: ['IMAGE', 'TEXT'],
            imageConfig: {
                aspectRatio: aspectRatio || '1:1',
                imageSize: imageSize || '1K',
            }
         };
         
         // Add tools if enabled
         const tools = [];
         if (isGoogleSearchEnabled || isDeepSearchEnabled) tools.push({ googleSearch: {} });
         if (tools.length > 0) config.tools = tools;
         
         if (systemInstruction) config.systemInstruction = systemInstruction;
         
         return config;
    }
    
    let finalSystemInstruction = systemInstruction;
    if (isDeepSearchEnabled) {
        finalSystemInstruction = finalSystemInstruction 
            ? `${finalSystemInstruction}\n\n${DEEP_SEARCH_SYSTEM_PROMPT}`
            : DEEP_SEARCH_SYSTEM_PROMPT;
    }

    const generationConfig: any = {
        ...config,
        systemInstruction: finalSystemInstruction || undefined,
        safetySettings: safetySettings || undefined,
    };
    if (!generationConfig.systemInstruction) {
        delete generationConfig.systemInstruction;
    }

    // Robust check for Gemini 3
    if (GEMINI_3_RO_MODELS.includes(modelId) || modelId.includes('gemini-3-pro')) {
        // Gemini 3.0 supports both thinkingLevel and thinkingBudget.
        // We prioritize budget if it's explicitly set (>0).
        generationConfig.thinkingConfig = {
            includeThoughts: showThoughts,
        };

        if (thinkingBudget > 0) {
            generationConfig.thinkingConfig.thinkingBudget = thinkingBudget;
        } else {
            generationConfig.thinkingConfig.thinkingLevel = thinkingLevel || 'HIGH';
        }
    } else {
        const modelSupportsThinking = [
            'models/gemini-flash-lite-latest',
            'gemini-2.5-pro',
            'models/gemini-flash-latest'
        ].includes(modelId) || modelId.includes('gemini-2.5');

        if (modelSupportsThinking) {
            // Decouple thinking budget from showing thoughts.
            // `thinkingBudget` controls if and how much the model thinks.
            // `showThoughts` controls if the `thought` field is returned in the stream.
            generationConfig.thinkingConfig = {
                thinkingBudget: thinkingBudget,
                includeThoughts: showThoughts,
            };
        }
    }

    const tools = [];
    // Deep Search requires Google Search tool
    if (isGoogleSearchEnabled || isDeepSearchEnabled) {
        tools.push({ googleSearch: {} });
    }
    if (isCodeExecutionEnabled) {
        tools.push({ codeExecution: {} });
    }
    if (isUrlContextEnabled) {
        tools.push({ urlContext: {} });
    }

    if (tools.length > 0) {
        generationConfig.tools = tools;
        // When using tools, these should not be set
        delete generationConfig.responseMimeType;
        delete generationConfig.responseSchema;
    }
    
    return generationConfig;
};
