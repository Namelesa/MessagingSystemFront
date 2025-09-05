import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, Observer, firstValueFrom, throwError } from 'rxjs';
import { FileUrl, FileMapping, FileVersion, BatchMappingResult, CreateFileMappingRequest } from '../model/file-sender.model';
import { environment } from '../../../shared/api-urls';
import { catchError } from 'rxjs/operators';

export interface DatabaseStats {
  totalKeys: number;
  uniqueUsers: number;
  uniqueFiles: number;
  totalVersions: number;
  errors: number;
  timestamp: string;
}

export interface DeleteVersionResult {
  success: boolean;
  deletedVersion: string;
  remainingVersions: number;
}

export interface FilesGroupedResult {
  files: { [fileName: string]: FileVersion[] };
  total: number;
  stats: {
    totalKeys: number;
    processedKeys: number;
    errorKeys: number;
    uniqueFiles: number;
    totalVersions: number;
  };
}

@Injectable({ providedIn: 'root' })
export class FileUploadApiService {

  private readonly fileLoaderUrl = environment.fileloaderUrl;
  private readonly mappingApiUrl = 'http://localhost:4000/api/mapping';
  
  constructor(private http: HttpClient) {}


  async getUploadUrls(files: File[]): Promise<FileUrl[]> {
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('File', file));
            

      if(files.length >= 40){
        throw new Error('Max 40 files allowed');
      }
      
      const result = await firstValueFrom(
        this.http.post<any[]>(`${this.fileLoaderUrl}get-load-file-url`, formData, { 
          withCredentials: true 
        }).pipe(
          catchError(this.handleError)
        )
      );

      const fileUrls: FileUrl[] = result.map((item: any) => {
        const fileUrl: FileUrl = {
          originalName: item.originalName,       
          uniqueFileName: item.uniqueFileName,   
          url: item.url
        };
        return fileUrl;
      });

      return fileUrls;
    } catch (error) {
      throw error;
    }
  }

  async uploadFileToS3(file: File, url: string, userId: string): Promise<void> {

    try {
      const res = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      if (!res.ok) {
        throw new Error(`Upload failed for ${file.name}: ${res.status} ${res.statusText}`);
      }

      await this.createMappingAfterUpload(file, url, userId);

    } catch (error) {
      throw error;
    }
  }

  uploadFileWithProgress(file: File, url: string, userId: string): { 
    observable: Observable<{ progress: number; fileData?: { fileName: string; uniqueFileName: string; url: string } }>; 
    abort: () => void 
  } {
    let xhr: XMLHttpRequest | null = null;

    const observable = new Observable<{ progress: number; fileData?: { fileName: string; uniqueFileName: string; url: string } }>((observer: Observer<{ progress: number; fileData?: { fileName: string; uniqueFileName: string; url: string } }>) => {
      xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      if (file.type) xhr.setRequestHeader('Content-Type', file.type);

      xhr.upload.onprogress = event => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          observer.next({ progress });
        }
      };

      xhr.onload = async () => {
        if (xhr && xhr.status >= 200 && xhr.status < 300) {
          try {
            const fileData = await this.createMappingAfterUpload(file, url, userId);
            observer.next({ progress: 100, fileData });
            observer.complete();
          } catch (mappingError) {
            console.error('❌ Failed to create file mapping:', mappingError);
            observer.next({ progress: 100 });
            observer.complete();
          }
        } else {
          const error = new Error(`Upload failed: ${xhr?.status} ${xhr?.statusText}`);
          observer.error(error);
        }
      };

      xhr.onerror = () => {
        const error = new Error('Network error during upload');
        observer.error(error);
      };
      
      xhr.onabort = () => {
        const error = new Error('Upload aborted');
        observer.error(error);
      };

      xhr.send(file);
    });

    return {
      observable,
      abort: () => {
        if (xhr) {
          try { 
            xhr.abort(); 
          } catch {} 
          xhr = null;
        }
      }
    };
  }

  async uploadMultipleFiles(files: File[], userId: string): Promise<{ successful: string[], failed: string[] }> {
    try {
      const fileUrls = await this.getUploadUrls(files);
      const results = { successful: [] as string[], failed: [] as string[] };

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileUrl = fileUrls.find(fu => fu.originalName === file.name);

        if (!fileUrl) {
          results.failed.push(file.name);
          continue;
        }

        try {
          await this.uploadFileToS3(file, fileUrl.url, userId);
          results.successful.push(file.name);
        } catch (error) {
          console.error(`❌ Failed to upload ${file.name}:`, error);
          results.failed.push(file.name);
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Failed to upload files:', error);
      throw error;
    }
  }

  async getDownloadUrls(fileNames: string[], userId?: string): Promise<FileUrl[]> {
    try {
      const batchResult = await this.getBatchFileMappings(fileNames, userId);
      
      const mappings = batchResult.mappings || [];

      if (mappings.length === 0) {
        console.warn('❌ No mappings found for files:', fileNames);
        return [];
      }

      const allVersionsMap = new Map<string, FileVersion[]>();
      mappings.forEach(mapping => {
        if (!allVersionsMap.has(mapping.originalName)) {
          allVersionsMap.set(mapping.originalName, []);
        }
        allVersionsMap.get(mapping.originalName)!.push(mapping);
      });
      
      allVersionsMap.forEach((versions, originalName) => {
        versions.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      });

      const allUniqueFileNames = Array.from(allVersionsMap.values())
        .flat()
        .map(mapping => mapping.uniqueFileName);

      let params = new HttpParams();
      allUniqueFileNames.forEach(f => params = params.append('fileNames', f));

      const result = await firstValueFrom(
        this.http.get<any[]>(`${this.fileLoaderUrl}get-download-file-url`, {
          params,
          withCredentials: true
        }).pipe(
          catchError(this.handleError)
        )
      );
            
      const fileUrls: FileUrl[] = result.map((item: any) => {
        let originalName = '';
        let version = 1;
        
        for (const [orig, versions] of allVersionsMap.entries()) {
          const foundVersion = versions.find(v => v.uniqueFileName === item.fileName);
          if (foundVersion) {
            originalName = orig;
            version = foundVersion.version;
            break;
          }
        }
        
        const fileUrl: FileUrl = {
          originalName: originalName || item.fileName,  
          uniqueFileName: item.fileName,
          url: item.url
        };
        
        return fileUrl;
      });

      return fileUrls;
    } catch (error) {
      throw error;
    }
  }

  async getLatestVersionDownloadUrls(fileNames: string[], userId?: string): Promise<FileUrl[]> {
    try {
      const batchResult = await this.getBatchFileMappings(fileNames, userId);
      
      const mappings = batchResult.mappings || [];

      if (mappings.length === 0) {
        console.warn('❌ No mappings found for files:', fileNames);
        return [];
      }

      const latestVersionsMap = new Map<string, FileVersion>();
      mappings.forEach(mapping => {
        const existing = latestVersionsMap.get(mapping.originalName);
        if (!existing || mapping.version > existing.version) {
          latestVersionsMap.set(mapping.originalName, mapping);
        }
      });

      const uniqueFileNames = Array.from(latestVersionsMap.values())
        .map(mapping => mapping.uniqueFileName);

      let params = new HttpParams();
      uniqueFileNames.forEach(f => params = params.append('fileNames', f));

      const result = await firstValueFrom(
        this.http.get<any[]>(`${this.fileLoaderUrl}get-download-file-url`, {
          params,
          withCredentials: true
        }).pipe(
          catchError(this.handleError)
        )
      );
            
      const fileUrls: FileUrl[] = result.map((item: any) => {
        let originalName = '';
        for (const [orig, mapping] of latestVersionsMap.entries()) {
          if (mapping.uniqueFileName === item.fileName) {
            originalName = orig;
            break;
          }
        }
        
        const fileUrl: FileUrl = {
          originalName: originalName || item.fileName,  
          uniqueFileName: item.fileName,                
          url: item.url
        };
        
        return fileUrl;
      });

      return fileUrls;
    } catch (error) {
      console.error('❌ Error in getLatestVersionDownloadUrls:', error);
      throw error;
    }
  }

  async deleteFiles(fileNames: string[]): Promise<void> {
    try {
      if (!fileNames || fileNames.length === 0) {
        return;
      }

      let params = new HttpParams();
      fileNames.forEach(f => params = params.append('fileName', f));

      await firstValueFrom(
        this.http.delete<void>(`${this.fileLoaderUrl}delete-file`, {
          params,
          withCredentials: true
        }).pipe(
          catchError(this.handleError)
        )
      );

    } catch (error) {
      throw error;
    }
  }

  async deleteFileVersion(originalName: string, userId: string, uniqueFileName: string): Promise<DeleteVersionResult> {
    try {
      const result = await firstValueFrom(
        this.http.delete<DeleteVersionResult>(
          `${this.mappingApiUrl}/${encodeURIComponent(originalName)}/${encodeURIComponent(userId)}/${encodeURIComponent(uniqueFileName)}`
        ).pipe(
          catchError(this.handleError)
        )
      );
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  async deleteSpecificFileVersion(uniqueFileName: string, userId: string): Promise<boolean> {
    try {
      
      await this.deleteFiles([uniqueFileName]);
      
      const parts = uniqueFileName.split('_');
      if (parts.length < 2) {
        console.warn(`⚠️ Invalid uniqueFileName format: ${uniqueFileName}`);
        return false;
      }
      
      const originalName = parts.slice(1).join('_');
      
      try {
        await this.deleteFileVersion(originalName, userId, uniqueFileName);
        return true;
      } catch (deleteError) {
        console.warn(`⚠️ Failed to delete mapping for ${uniqueFileName}:`, deleteError);
        return true;
      }
      
    } catch (error) {
      console.error(`❌ Error deleting specific file version ${uniqueFileName}:`, error);
      return false;
    }
  }

  async deleteFileByOriginalName(originalName: string, userId: string): Promise<boolean> {
    try {
      console.warn(`⚠️ deleteFileByOriginalName called - this will delete ALL versions of "${originalName}"`);
      
      const versions = await this.getFileVersionsByUser(originalName, userId);
      
      if (!versions || versions.length === 0) {
        console.warn('⚠️ Cannot delete file - no versions found:', originalName);
        return false;
      }

      for (const version of versions) {
        try {
          await this.deleteFiles([version.uniqueFileName]);
          await this.deleteFileVersion(originalName, userId, version.uniqueFileName);
        } catch (error) {
          console.error(`❌ Failed to delete version ${version.uniqueFileName}:`, error);
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error in deleteFileByOriginalName:', error);
      return false;
    }
  }

  async deleteFilesByOriginalNames(originalNames: string[], userId: string): Promise<{ success: string[]; failed: string[] }> {
    try {
      const results = { success: [] as string[], failed: [] as string[] };
      
      for (const originalName of originalNames) {
        try {
          const success = await this.deleteFileByOriginalName(originalName, userId);
          if (success) {
            results.success.push(originalName);
          } else {
            results.failed.push(originalName);
          }
        } catch (error) {
          results.failed.push(originalName);
        }
      }
      
      return results;
    } catch (error) {
      throw error;
    }
  }

  async createFileMapping(mappingData: CreateFileMappingRequest): Promise<FileMapping> {
    try {
      const result = await firstValueFrom(
        this.http.post<FileMapping>(`${this.mappingApiUrl}`, mappingData).pipe(
          catchError(this.handleError)
        )
      );

      return result;
    } catch (error) {
      throw error;
    }
  }

  async getFileVersions(originalName: string): Promise<FileVersion[]> {
    try {
      const result = await firstValueFrom(
        this.http.get<FileVersion[]>(`${this.mappingApiUrl}/${encodeURIComponent(originalName)}`).pipe(
          catchError(this.handleError)
        )
      );
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  async getFileVersionsByUser(originalName: string, userId: string): Promise<FileVersion[]> {
    try {
      const result = await firstValueFrom(
        this.http.get<FileVersion[]>(`${this.mappingApiUrl}/${encodeURIComponent(originalName)}/${encodeURIComponent(userId)}`).pipe(
          catchError(this.handleError)
        )
      );
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  async getBatchFileMappings(fileNames: string[], userId?: string): Promise<BatchMappingResult> {
    try {
      
      const requestBody: any = { fileNames };
      if (userId) {
        requestBody.userId = userId;
      }
      
      const result = await firstValueFrom(
        this.http.post<BatchMappingResult>(
          `${this.mappingApiUrl}/batch`, 
          requestBody
        ).pipe(
          catchError(this.handleError)
        )
      );
      
      return result;
    } catch (error) {
      console.error('❌ Error in getBatchFileMappings:', error);
      throw error;
    }
  }

  async getAllFiles(): Promise<FilesGroupedResult> {
    try {
      const result = await firstValueFrom(
        this.http.get<FilesGroupedResult>(
          `${this.mappingApiUrl}/files/all`
        ).pipe(
          catchError(this.handleError)
        )
      );
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  async getUserFiles(userId: string): Promise<FilesGroupedResult> {
    try {
      const result = await firstValueFrom(
        this.http.get<FilesGroupedResult>(
          `${this.mappingApiUrl}/user/${encodeURIComponent(userId)}`
        ).pipe(
          catchError(this.handleError)
        )
      );
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  async getDatabaseStats(): Promise<DatabaseStats> {
    try {
      const result = await firstValueFrom(
        this.http.get<DatabaseStats>(
          `${this.mappingApiUrl}/stats`
        ).pipe(
          catchError(this.handleError)
        )
      );
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  async clearDatabase(): Promise<{ success: boolean; deletedKeys: number; message: string }> {
    try {
      const result = await firstValueFrom(
        this.http.delete<{ success: boolean; deletedKeys: number; message: string }>(
          `${this.mappingApiUrl}/admin/clear`
        ).pipe(
          catchError(this.handleError)
        )
      );
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  async getLatestFileVersion(originalName: string, userId?: string): Promise<FileVersion | null> {
    try {
      let versions: FileVersion[];
      
      if (userId) {
        versions = await this.getFileVersionsByUser(originalName, userId);
      } else {
        versions = await this.getFileVersions(originalName);
      }
      
      if (versions && versions.length > 0) {
        return versions.reduce((latest, current) => 
          current.version > latest.version ? current : latest
        );
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting latest file version:', error);
      return null;
    }
  }

  async getFileHistory(originalName: string, userId?: string): Promise<FileVersion[]> {
    try {
      if (userId) {
        return await this.getFileVersionsByUser(originalName, userId);
      } else {
        return await this.getFileVersions(originalName);
      }
    } catch (error) {
      console.error('❌ Error getting file history:', error);
      return [];
    }
  }
  
  private async createMappingAfterUpload(file: File, uploadUrl: string, userId: string): Promise<{ fileName: string; uniqueFileName: string; url: string }> {
    try {
      const uniqueFileName = this.extractUniqueFileNameFromUrl(uploadUrl) || this.generateUniqueFileName(file.name);
      
      const mappingData: CreateFileMappingRequest = {
        originalName: file.name,
        uniqueFileName: uniqueFileName,
        uploadedAt: new Date().toISOString(),
        userId: userId
      };

      const mapping = await this.createFileMapping(mappingData);
      
      return {
        fileName: file.name,
        uniqueFileName: uniqueFileName,
        url: uploadUrl
      };
    } catch (error) {
      console.error('❌ Failed to create file mapping for:', file.name, error);
      throw error;
    }
  }

  private extractUniqueFileNameFromUrl(url: string): string | null {
    try {
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const cleanFileName = fileName.split('?')[0];
      
      try {
        const decodedFileName = decodeURIComponent(cleanFileName);
        return decodedFileName;
      } catch (decodeError) {
        console.warn('⚠️ Could not decode filename from URL, using as is:', cleanFileName);
        return cleanFileName;
      }
    } catch (error) {
      console.warn('⚠️ Could not extract filename from URL:', url);
      return null;
    }
  }

  private generateUniqueFileName(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    
    const uniqueName = `${timestamp}_${random}_${originalName}`;    
    return uniqueName;
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      errorMessage = error.error?.message || error.message || `Error Code: ${error.status}`;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}