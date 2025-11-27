
import { File as GeminiFile, UploadFileConfig } from "@google/genai";
import { getApiClient } from './baseApi';
import { logService } from "../logService";

export const uploadFileApi = async (apiKey: string, file: File, mimeType: string, displayName: string, signal: AbortSignal, baseUrl?: string): Promise<GeminiFile> => {
    logService.info(`Uploading file: ${displayName}`, { mimeType, size: file.size, proxy: baseUrl });
    
    const ai = getApiClient(apiKey, baseUrl);
    
    if (signal.aborted) {
        logService.warn(`Upload for "${displayName}" cancelled before starting.`);
        const abortError = new Error("Upload cancelled by user.");
        abortError.name = "AbortError";
        throw abortError;
    }

    try {
        const uploadConfig: UploadFileConfig = { mimeType, displayName };
        
        const uploadedFile = await ai.files.upload({
            file: file,
            config: uploadConfig,
        });
        
        return uploadedFile;

    } catch (error) {
        logService.error(`Failed to upload file "${displayName}" to Gemini API:`, error);
        throw error;
    }
};

export const getFileMetadataApi = async (apiKey: string, fileApiName: string, baseUrl?: string): Promise<GeminiFile | null> => {
    const ai = getApiClient(apiKey, baseUrl);
    
    if (!fileApiName || !fileApiName.startsWith('files/')) {
        logService.error(`Invalid fileApiName format: ${fileApiName}. Must start with "files/".`);
        throw new Error('Invalid file ID format. Expected "files/your_file_id".');
    }
    try {
        logService.info(`Fetching metadata for file: ${fileApiName}`);
        const file = await ai.files.get({ name: fileApiName });
        return file;
    } catch (error) {
        logService.error(`Failed to get metadata for file "${fileApiName}" from Gemini API:`, error);
        if (error instanceof Error && (error.message.includes('NOT_FOUND') || error.message.includes('404'))) {
            return null; // File not found is a valid outcome we want to handle
        }
        throw error; // Re-throw other errors
    }
};
