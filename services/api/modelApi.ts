
import { ModelOption } from '../../types';
import { logService } from "../logService";
import { normalizeBaseUrl } from './requestUtils';

export const getAvailableModelsApi = async (apiKeysString: string | null, baseUrl?: string): Promise<ModelOption[]> => {
    logService.info('🔄 [ModelAPI] Fetching available models...');
    const keys = (apiKeysString || '').split('\n').map(k => k.trim()).filter(Boolean);

    if (keys.length === 0) {
        logService.warn('getAvailableModels called with no API keys.');
        throw new Error("API client not initialized. Configure API Key in settings.");
    }
    
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const root = normalizeBaseUrl(baseUrl);
    const url = `${root}/v1beta/models?key=${randomKey}`;

    logService.info(`GET ${url}`);

    try {
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors'
        });

        if (!response.ok) {
            throw new Error(`Failed to list models: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const availableModels: ModelOption[] = [];
        
        if (data.models && Array.isArray(data.models)) {
            for (const model of data.models) {
                availableModels.push({
                    id: model.name, // e.g. "models/gemini-pro"
                    name: model.displayName || model.name.split('/').pop() || model.name,
                    isPinned: false,
                });
            }
        }

        if (availableModels.length > 0) {
            return availableModels.sort((a,b) => a.name.localeCompare(b.name));
        } else {
            throw new Error("API returned an empty list of models.");
        }
    } catch (error) {
        logService.error("Failed to fetch available models from Gemini API:", error);
        throw error;
    }
};
