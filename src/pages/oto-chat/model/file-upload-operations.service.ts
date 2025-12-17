import { Injectable } from '@angular/core';
import { FileUploadStateService } from './file-state-service';
import { FileUploadApiService } from '../../../features/file-sender';
import { OtoMessagesService } from '../api/oto-message/oto-messages.api';
import { ToastService } from '../../../shared/ui-elements';
import { MessageStateService } from './message-state.service';
import { DraftStateService } from './draft-state-service';

export interface UploadResult {
  success: boolean;
  error?: string;
  uploadedFiles?: Array<{
    fileName: string;
    uniqueFileName: string;
    url: string;
  }>;
}

export interface FileUploadProgress {
  index: number;
  progress: number;
  fileName: string;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class FileUploadOperationsService {
  constructor(
    private fileUploadStateService: FileUploadStateService,
    private fileUploadApi: FileUploadApiService,
    private messageService: OtoMessagesService,
    private toastService: ToastService,
    private messageStateService: MessageStateService,
    private draftStateService: DraftStateService
  ) {}

  async uploadAndSend(selectedChat: string, currentUserNickName: string): Promise<UploadResult> {
    const state = this.fileUploadStateService.getUploadState();
    
    if (!this.validateUploadState(state, selectedChat)) {
      return { success: false, error: 'Invalid upload state' };
    }
    
    this.fileUploadStateService.setIsUploading(true);
    
    try {
      const uploadedFiles = await this.uploadFiles(state.uploadItems, currentUserNickName);
      
      if (uploadedFiles.length > 0) {
        await this.sendUploadedFiles(uploadedFiles, state.uploadCaption, selectedChat);
        this.fileUploadStateService.closeUploadModal();
        this.messageStateService.scrollToBottom();
        return { success: true, uploadedFiles };
      }
      
      return { success: false, error: 'No files uploaded' };
    } catch (error) {
      console.error('Upload and send failed:', error);
      return { success: false, error: String(error) };
    } finally {
      this.fileUploadStateService.setIsUploading(false);
    }
  }

  private validateUploadState(state: any, selectedChat: string): boolean {
    if (!selectedChat || state.uploadItems.length === 0 || state.isUploading) {
      return false;
    }
    
    if (state.uploadItems.length >= 40) {
      this.toastService.show('You can upload max 40 files at once', 'error');
      return false;
    }
    
    return true;
  }

  private async uploadFiles(
    uploadItems: any[],
    currentUserNickName: string
  ): Promise<Array<{ fileName: string; uniqueFileName: string; url: string }>> {
    const files = uploadItems.map(i => i.file);
    const uploadUrls = await this.fileUploadApi.getUploadUrls(files);
    const nameToUrl = new Map(uploadUrls.map(u => [u.originalName, u.url] as const));
    const uploadedFiles: Array<{ fileName: string; uniqueFileName: string; url: string }> = [];
    
    await Promise.all(
      uploadItems.map((item, index) => 
        this.uploadSingleFile(item, index, nameToUrl, uploadedFiles, currentUserNickName)
      )
    );
    
    return uploadedFiles;
  }

  private uploadSingleFile(
    item: any,
    index: number,
    nameToUrl: Map<string, string>,
    uploadedFiles: Array<any>,
    currentUserNickName: string
  ): Promise<void> {
    return new Promise((resolve) => {
      const url = nameToUrl.get(item.name);
      
      if (!url) {
        this.fileUploadStateService.updateUploadItem(index, { error: 'No URL' });
        resolve();
        return;
      }
      
      const uploadResult = this.fileUploadApi.uploadFileWithProgress(
        item.file,
        url,
        currentUserNickName
      );
      
      const subscription = uploadResult.observable.subscribe({
        next: (result) => {
          this.fileUploadStateService.updateUploadItem(index, {
            progress: result.progress,
            abort: uploadResult.abort,
            subscription: subscription 
          });
          
          if (result.fileData) {
            uploadedFiles.push(result.fileData);
          }
        },
        error: (err) => {
          this.fileUploadStateService.updateUploadItem(index, {
            error: String(err),
            progress: 0
          });
          resolve();
        },
        complete: () => {
          this.fileUploadStateService.updateUploadItem(index, {
            url: url,
            progress: 100
          });
          resolve();
        }
      });
    });
  }

  private async sendUploadedFiles(
    uploadedFiles: Array<any>,
    caption: string,
    selectedChat: string
  ): Promise<void> {
    const fileNames = uploadedFiles.map(f => f.fileName);
    
    try {
      const downloadUrls = await this.fileUploadApi.getDownloadUrls(fileNames);
      const updatedFiles = this.mergeDownloadUrls(uploadedFiles, downloadUrls);
      await this.sendMessageWithFiles(updatedFiles, caption, selectedChat);
    } catch (error) {
      await this.sendMessageWithFiles(uploadedFiles, caption, selectedChat);
    }
  }

  private mergeDownloadUrls(uploadedFiles: Array<any>, downloadUrls: Array<any>): Array<any> {
    return uploadedFiles.map(file => {
      const downloadUrl = downloadUrls.find(d => d.originalName === file.fileName);
      return {
        ...file,
        url: downloadUrl?.url || file.url
      };
    });
  }

  private async sendMessageWithFiles(
    files: Array<any>,
    caption: string,
    selectedChat: string
  ): Promise<void> {
    const content = JSON.stringify({
      text: caption || '',
      files
    });
    
    await this.messageService.sendMessage(selectedChat, content);
    this.draftStateService.clearCurrentDraft();
  }

  cancelFileUpload(index: number): void {
    this.fileUploadStateService.removeUploadItem(index);
  }

  removeFileFromList(index: number): void {
    this.fileUploadStateService.removeUploadItem(index);
  }

  closeUploadModal(): void {
    this.fileUploadStateService.closeUploadModal();
  }

  handleModalFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      const result = this.fileUploadStateService.handleModalFileInput(files);
      
      if (result.errors.length > 0) {
        result.errors.forEach(error => {
          this.toastService.show(error.message, 'error');
        });
      }
      
      input.value = '';
    }
  }

  handleFileDrop(files: File[], selectedChat: string, draftText: string, isEditing: boolean): {
    validFiles: File[];
    hasErrors: boolean;
  } {
    if (!selectedChat || files.length === 0) {
      return { validFiles: [], hasErrors: false };
    }
    
    const result = this.fileUploadStateService.handleFileDrop(files, draftText, isEditing);
    
    if (result.errors.length > 0) {
      result.errors.forEach(error => {
        this.toastService.show(error.message, 'error');
      });
    }
    
    return {
      validFiles: result.validFiles,
      hasErrors: result.errors.length > 0
    };
  }

  checkUploadSizeLimit(): void {
    const check = this.fileUploadStateService.checkUploadSizeLimit();
    
    if (check.isOverLimit) {
      this.toastService.show(
        `Total file size ${this.fileUploadStateService.formatFileSize(check.totalSize)} exceeds max limit of ${this.fileUploadStateService.formatFileSize(check.maxSize)}.`,
        'error'
      );
    } else if (check.isNearLimit) {
      this.toastService.show(
        `Warning: total file size ${this.fileUploadStateService.formatFileSize(check.totalSize)} is close to the limit (${this.fileUploadStateService.formatFileSize(check.maxSize)}).`,
        'error'
      );
    }
  }
}