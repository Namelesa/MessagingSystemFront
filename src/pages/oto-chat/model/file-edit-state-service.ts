import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { OtoMessage } from '../../../entities/oto-message';
import { FileUploadApiService } from '../../../features/file-sender';

export interface FileEditState {
  editFileUploadingCount: number;
  editingOriginalFiles: Array<any>;
}

@Injectable({
  providedIn: 'root'
})
export class FileEditStateService {
  private fileEditStateSubject = new BehaviorSubject<FileEditState>({
    editFileUploadingCount: 0,
    editingOriginalFiles: []
  });

  public fileEditState$ = this.fileEditStateSubject.asObservable();

  constructor(private fileUploadApi: FileUploadApiService) {}

  get isEditFileUploading(): boolean {
    return this.fileEditStateSubject.value.editFileUploadingCount > 0;
  }

  get editingOriginalFiles(): Array<any> {
    return this.fileEditStateSubject.value.editingOriginalFiles;
  }

  private updateState(updates: Partial<FileEditState>): void {
    const currentState = this.fileEditStateSubject.value;
    this.fileEditStateSubject.next({ ...currentState, ...updates });
  }

  incrementEditFileUploadingCount(): void {
    const current = this.fileEditStateSubject.value.editFileUploadingCount;
    this.updateState({ editFileUploadingCount: current + 1 });
  }

  decrementEditFileUploadingCount(): void {
    const current = this.fileEditStateSubject.value.editFileUploadingCount;
    this.updateState({ editFileUploadingCount: Math.max(0, current - 1) });
  }

  setEditingOriginalFiles(files: Array<any>): void {
    this.updateState({ editingOriginalFiles: files });
  }

  clearEditingOriginalFiles(): void {
    this.updateState({ editingOriginalFiles: [] });
  }

  resetState(): void {
    this.fileEditStateSubject.next({
      editFileUploadingCount: 0,
      editingOriginalFiles: []
    });
  }

  async addFilesToEditingMessage(
    editingMessage: OtoMessage,
    files: File[],
    message: string | undefined,
    currentUserNickName: string
  ): Promise<OtoMessage> {
    try {
      const uploadUrls = await this.fileUploadApi.getUploadUrls(files);
      const nameToUrl = new Map(uploadUrls.map(u => [u.originalName, u.url] as const));

      const uploadedFiles: Array<{ 
        fileName: string; 
        uniqueFileName: string; 
        url: string; 
        type: string; 
        size: number 
      }> = [];
      
      await Promise.all(files.map(file => new Promise<void>((resolve, reject) => {
        const url = nameToUrl.get(file.name);
        if (!url) {
          reject(new Error(`No URL for file ${file.name}`));
          return;
        }

        const { observable } = this.fileUploadApi.uploadFileWithProgress(
          file, 
          url, 
          currentUserNickName
        );
        
        observable.subscribe({
          next: (result: { 
            progress: number; 
            fileData?: { fileName: string; uniqueFileName: string; url: string } 
          }) => {
            if (result.fileData) {
              uploadedFiles.push({
                ...result.fileData,
                type: file.type,
                size: file.size
              });
            }
          },
          error: (err: any) => reject(err),
          complete: () => resolve()
        });
      })));

      if (uploadedFiles.length > 0) {
        try {
          const fileNames = uploadedFiles.map(f => f.fileName);
          const downloadUrls = await this.fileUploadApi.getDownloadUrls(fileNames);
          
          uploadedFiles.forEach(file => {
            const downloadUrl = downloadUrls.find(d => d.originalName === file.fileName);
            if (downloadUrl) {
              file.url = downloadUrl.url;
            }
          });
        } catch (error) {
          console.error('Error getting download URLs:', error);
        }
      }

      let parsed: any;
      try {
        parsed = JSON.parse(editingMessage.content);
      } catch {
        parsed = { text: editingMessage.content || '', files: [] };
      }

      if (message !== undefined) {
        parsed.text = message;
      }

      parsed.files = parsed.files || [];
      
      const newFiles = uploadedFiles.map(file => ({
        fileName: file.fileName,
        uniqueFileName: file.uniqueFileName,
        url: file.url,
        type: file.type,
        size: file.size,
        uniqueId: file.uniqueFileName
      }));

      parsed.files.push(...newFiles);

      const newEditingMessage = {
        ...editingMessage,
        content: JSON.stringify(parsed)
      } as OtoMessage;

      (newEditingMessage as any).parsedFiles = parsed.files;

      return newEditingMessage;
    } catch (error) {
      console.error('Error adding files to editing message:', error);
      throw error;
    }
  }

  async replaceFileInMessage(
    oldFile: any,
    newFile: File,
    currentUserNickName: string
  ): Promise<any> {
    try {
      const [uploadUrl] = await this.fileUploadApi.getUploadUrls([newFile]);
      const uploadedFile = await this.uploadNewFile(newFile, uploadUrl.url, currentUserNickName);
      const rawUrl = await this.getDownloadUrl(uploadedFile.fileName, currentUserNickName);
      const timestamp = Date.now();
      const randomKey = Math.random().toString(36).substr(2, 9);
      
      return {
        fileName: uploadedFile.fileName,
        uniqueFileName: uploadedFile.uniqueFileName,
        url: rawUrl,
        type: newFile.type,
        size: newFile.size,
        uniqueId: `FILE_${timestamp}_${randomKey}_${uploadedFile.fileName.replace(/[^a-zA-Z0-9]/g, '_')}`,
        _version: timestamp,
        _refreshKey: `${timestamp}_${randomKey}`,
        _isTemporary: true,
        _replacesFile: oldFile?.uniqueFileName || oldFile?.fileName
      };
    } catch (error) {
      console.error('Error replacing file:', error);
      throw error;
    }
  }

  private async uploadNewFile(
    file: File, 
    uploadUrl: string,
    currentUserNickName: string
  ): Promise<{ fileName: string; uniqueFileName: string; url: string }> {
    const { observable } = this.fileUploadApi.uploadFileWithProgress(
      file, 
      uploadUrl, 
      currentUserNickName
    );

    return new Promise((resolve, reject) => {
      let finalFileData: any = null;

      const subscription = observable.subscribe({
        next: result => {
          if (result.fileData) {
            finalFileData = result.fileData;
          }
        },
        error: error => {
          subscription.unsubscribe();
          reject(error);
        },
        complete: () => {
          subscription.unsubscribe();
          if (finalFileData) {
            resolve(finalFileData);
          } else {
            reject(new Error('Upload completed but no file data received'));
          }
        }
      });
    });
  }

  private async getDownloadUrl(fileName: string, currentUserNickName: string): Promise<string> {
    const downloadUrls = await this.fileUploadApi.getDownloadUrls([fileName], currentUserNickName);
    return downloadUrls?.[0]?.url || '';
  }

  async deleteFilesFromMessage(
    message: OtoMessage,
    currentUserNickName: string
  ): Promise<{ success: boolean; failedFiles: string[] }> {
    try {
      let parsed: any;
      
      try {
        parsed = JSON.parse(message.content);
      } catch (parseError) {
        return { success: true, failedFiles: [] };
      }
      
      if (!parsed.files || !Array.isArray(parsed.files) || parsed.files.length === 0) {
        return { success: true, failedFiles: [] };
      }
      
      const filesToDelete = parsed.files
        .filter((file: any) => file.fileName && file.uniqueFileName)
        .map((file: any) => ({
          fileName: file.fileName,
          uniqueFileName: file.uniqueFileName
        }));
            
      const deletionPromises = filesToDelete.map(async (file: { fileName: string; uniqueFileName: string }) => {
        try {
          const success = await this.fileUploadApi.deleteSpecificFileVersion(
            file.uniqueFileName, 
            currentUserNickName
          );
          
          return { fileName: file.fileName, uniqueFileName: file.uniqueFileName, success };
        } catch (error) {
          return { fileName: file.fileName, uniqueFileName: file.uniqueFileName, success: false, error };
        }
      });
      
      const results = await Promise.all(deletionPromises);
      const failed = results.filter(r => !r.success).map(r => r.fileName);
      
      return {
        success: failed.length === 0,
        failedFiles: failed
      };
    } catch (error) {
      console.error('Error deleting files from message:', error);
      return { success: false, failedFiles: [] };
    }
  }

  async deleteRemovedFilesAfterEdit(
    originalFiles: any[],
    finalFiles: any[],
    currentUserNickName: string
  ): Promise<{ success: boolean; failedCount: number }> {
    try {
      const filesToDelete = originalFiles.filter(originalFile => {
        const stillExists = finalFiles.some(finalFile => {
          return originalFile.uniqueFileName === finalFile.uniqueFileName ||
                 originalFile.fileName === finalFile.fileName ||
                 originalFile.uniqueId === finalFile.uniqueId;
        });
        return !stillExists;
      });

      if (filesToDelete.length === 0) {
        return { success: true, failedCount: 0 };
      }
    
      const deletionPromises = filesToDelete.map(async (file) => {
        try {
          if (file.uniqueFileName) {
            const success = await this.fileUploadApi.deleteSpecificFileVersion(
              file.uniqueFileName, 
              currentUserNickName
            );
            
            return { 
              fileName: file.fileName, 
              uniqueFileName: file.uniqueFileName, 
              success 
            };
          }
          return { 
            fileName: file.fileName, 
            uniqueFileName: file.uniqueFileName, 
            success: false, 
            error: 'No uniqueFileName' 
          };
        } catch (error) {
          return { 
            fileName: file.fileName, 
            uniqueFileName: file.uniqueFileName, 
            success: false, 
            error: error 
          };
        }
      });

      const results = await Promise.all(deletionPromises);
      const failed = results.filter(r => !r.success);
      
      return {
        success: failed.length === 0,
        failedCount: failed.length
      };
    } catch (error) {
      console.error('Error in deleteRemovedFilesAfterEdit:', error);
      return { success: false, failedCount: -1 };
    }
  }

  async deleteReplacedFiles(
    uniqueFileNames: string[],
    currentUserNickName: string
  ): Promise<void> {
    if (uniqueFileNames.length === 0) return;

    try {
      const deletionPromises = uniqueFileNames.map(async (uniqueFileName) => {
        try {
          const success = await this.fileUploadApi.deleteSpecificFileVersion(
            uniqueFileName, 
            currentUserNickName
          );
          return { uniqueFileName, success };
        } catch (error) {
          console.error(`Failed to delete replaced file: ${uniqueFileName}`, error);
          return { uniqueFileName, success: false, error };
        }
      });

      await Promise.all(deletionPromises);
    } catch (error) {
      console.error('Error deleting replaced files:', error);
    }
  }

  async cleanupTemporaryFiles(
    editingMessage: OtoMessage | undefined,
    currentUserNickName: string
  ): Promise<void> {
    if (!editingMessage) return;

    try {
      const parsed = JSON.parse(editingMessage.content);
      const temporaryFiles = parsed.files?.filter((f: any) => f._isTemporary) || [];
      
      if (temporaryFiles.length > 0) {
        const deletionPromises = temporaryFiles.map(async (file: any) => {
          try {
            if (file.uniqueFileName) {
              await this.fileUploadApi.deleteSpecificFileVersion(
                file.uniqueFileName, 
                currentUserNickName
              );
            }
          } catch (error) {
            console.warn('Could not delete temporary file:', error);
          }
        });
        
        await Promise.all(deletionPromises);
      }
    } catch (e) {
      console.error('Error cleaning up temporary files:', e);
    }
  }

  async updateFileDownloadUrls(
    files: any[],
    currentUserNickName: string
  ): Promise<any[]> {
    if (!files || files.length === 0) return files;

    const updatedFiles = [...files];

    for (const file of updatedFiles) {
      if (!file.url || file.url.includes('s3.amazonaws.com')) {
        try {
          const downloadUrls = await this.fileUploadApi.getDownloadUrls(
            [file.fileName], 
            currentUserNickName
          );
          if (downloadUrls && downloadUrls.length > 0) {
            file.url = downloadUrls[0].url;
          }
        } catch (error) {
          console.error('Error getting download URL:', error);
        }
      }

      delete file._isTemporary;
      delete file._forceUpdate;
      delete file._typeChanged;
      delete file._replacementKey;
      delete file._isNew;
      delete file._addedKey;
      delete file._oldFile;
      delete file._version;
    }

    return updatedFiles;
  }
}