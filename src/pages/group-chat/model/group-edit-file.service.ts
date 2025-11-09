import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { GroupMessage } from '../../../entities/group-message';
import { GroupFileUploadService, UploadResult } from './group-file-state.service';

export interface PendingFileEdit {
  messageId: string;
  oldFile: any;
  newFile: File;
}

export interface FileEditState {
  pendingFileEdit?: PendingFileEdit;
  editFileUploadingCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class GroupFileEditService {
  private stateSubject = new BehaviorSubject<FileEditState>({
    editFileUploadingCount: 0
  });
  public state$ = this.stateSubject.asObservable();

  constructor(private fileUploadService: GroupFileUploadService) {}

  get state(): FileEditState {
    return this.stateSubject.value;
  }

  get hasPendingFileEdit(): boolean {
    return this.state.pendingFileEdit !== undefined;
  }

  get isEditFileUploading(): boolean {
    return this.state.editFileUploadingCount > 0;
  }

  private update(updates: Partial<FileEditState>): void {
    this.stateSubject.next({ ...this.state, ...updates });
  }
  
  setPendingFileEdit(messageId: string, oldFile: any, newFile: File): void {
    this.update({
      pendingFileEdit: { messageId, oldFile, newFile }
    });
  }

  clearPendingFileEdit(): void {
    this.update({ pendingFileEdit: undefined });
  }

  getPendingFileEdit(): PendingFileEdit | undefined {
    return this.state.pendingFileEdit;
  }

  handleEditFile(messageId: string, oldFile: any, newFile: File): void {
    if (!newFile || !messageId || !oldFile) {
      return;
    }
    this.setPendingFileEdit(messageId, oldFile, newFile);
  }

  async executeFileReplacement(
    messageId: string,
    currentUserNickName: string
  ): Promise<{ success: boolean; newFileData?: any; error?: string }> {
    const pendingEdit = this.state.pendingFileEdit;
    
    if (!pendingEdit || pendingEdit.messageId !== messageId) {
      return { success: false, error: 'No pending edit for this message' };
    }

    this.update({ editFileUploadingCount: 1 });

    try {
      const { oldFile, newFile } = pendingEdit;

      if (oldFile?.uniqueFileName) {
        try {
          await this.fileUploadService.deleteSpecificFile(
            oldFile.uniqueFileName,
            currentUserNickName
          );
        } catch (error) {
          console.warn('⚠️ [EDIT FILE] Failed to delete old file:', error);
        }
      }

      const uploadUrlsResponse = await this.fileUploadService.getUploadUrls([newFile]);

      if (!uploadUrlsResponse || uploadUrlsResponse.length === 0) {
        throw new Error('No upload URL received');
      }

      const uploadUrl = uploadUrlsResponse[0];
      const uploadedFile = await this.fileUploadService.uploadSingleFile(
        newFile,
        uploadUrl.url,
        currentUserNickName
      );

      let downloadUrl: string;
      try {
        const downloadUrls = await this.fileUploadService.getDownloadUrls(
          [uploadedFile.fileName],
          currentUserNickName
        );
        downloadUrl = downloadUrls?.[0]?.url || uploadedFile.url;
      } catch (error) {
        downloadUrl = uploadedFile.url;
      }

      const newFileData = {
        fileName: uploadedFile.fileName,
        uniqueFileName: uploadedFile.uniqueFileName,
        url: downloadUrl,
        type: newFile.type,
        size: newFile.size,
        uniqueId: `${uploadedFile.uniqueFileName}_${Date.now()}`,
        _refreshKey: `replacement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        _forceUpdate: Date.now(),
        _typeChanged: oldFile?.type !== newFile.type,
        _replacementKey: `replace_${Date.now()}_${Math.random()}`
      };

      this.clearPendingFileEdit();
      
      return { success: true, newFileData };

    } catch (error) {
      console.error('❌ [EDIT FILE] Error during file replacement:', error);
      return { success: false, error: String(error) };
    } finally {
      this.update({ editFileUploadingCount: 0 });
    }
  }

  updateMessageWithNewFile(message: GroupMessage, oldFile: any, newFileData: any): GroupMessage {
    let parsed: any;
    try {
      parsed = JSON.parse(message.content || '{}');
    } catch {
      parsed = { text: message.content || '', files: [] };
    }

    parsed.files = parsed.files || [];
    const idx = this.findFileIndex(parsed.files, oldFile);

    if (idx >= 0) {
      const oldFileData = { ...parsed.files[idx] };
      parsed.files[idx] = {
        ...newFileData,
        _forceUpdate: Date.now(),
        _typeChanged: oldFileData.type !== newFileData.type,
        _replacementKey: `replacement_${Date.now()}_${Math.random()}`
      };
    } else {
      const newF = {
        ...newFileData,
        _isNew: true,
        _forceUpdate: Date.now(),
        _addedKey: `added_${Date.now()}_${Math.random()}`
      };
      parsed.files.push(newF);
      parsed.files = this.removeDuplicateFiles(parsed.files);
    }

    const newMessage = { ...message, content: JSON.stringify(parsed) } as GroupMessage;
    (newMessage as any).parsedFiles = parsed.files;
    return newMessage;
  }

  findFileIndex(files: any[], targetFile: any): number {
    const strategies = [
      (f: any) => f.uniqueFileName === targetFile.uniqueFileName,
      (f: any) => f.uniqueId === targetFile.uniqueId || f.uniqueFileName === targetFile.uniqueId,
      (f: any) => f.url === targetFile.url && f.url,
      (f: any) => f.fileName === targetFile.fileName && f.type === targetFile.type,
      (f: any) => f.fileName === targetFile.fileName,
      (f: any) => f.fileName === targetFile.fileName && f.size === targetFile.size,
      (_f: any, index: number) => index === 0 && files.length === 1
    ];

    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      const index = files.findIndex((f, idx) => strategy(f, idx));
      if (index >= 0) return index;
    }

    return -1;
  }

  removeDuplicateFiles(files: any[]): any[] {
    const seen = new Set<string>();
    return files.filter(file => {
      const key = file.fileName;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  reset(): void {
    this.stateSubject.next({
      editFileUploadingCount: 0
    });
  }
}