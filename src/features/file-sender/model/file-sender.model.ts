export interface FileUrl {
  originalName: string;
  uniqueFileName: string; 
  url: string;
}

export interface FileMapping {
id: string;
originalName: string;
uniqueFileName: string;
uploadedAt: string;
version: number;
userId: string;
createdAt: string;
}

export interface CreateFileMappingRequest {
originalName: string;
uniqueFileName: string;
uploadedAt: string;
userId: string;
}

export interface FileVersion {
id: string;
originalName: string;
uniqueFileName: string;
uploadedAt: string;
version: number;
userId: string;
createdAt: string;
}

export interface FileUploadResult {
uploadSuccess: boolean;
mapping?: FileMapping;
error?: string;
}

export interface BatchMappingResult {
mappings: FileVersion[];
errors?: Array<{ fileName: string; error: string }>;
totalProcessed: number;
successful: number;
}

export interface UserFilesResult {
userId: string;
totalFiles: number;
mappings: FileVersion[];
}