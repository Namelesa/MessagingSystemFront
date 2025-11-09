import { Injectable, ChangeDetectorRef } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { FileUploadApiService } from '../../../features/file-sender';

export interface UploadItem {
  file: File;
  name: string;
  size: number;
  progress: number;
  url?: string;
  error?: string;
  abort?: () => void;
  subscription?: any;
}

export interface FileValidationError {
  fileName: string;
  error: 'size' | 'type';
  actualSize?: number;
  actualType?: string;
  message?: string;
}

export interface UploadResult {
  fileName: string;
  uniqueFileName: string;
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class GroupFileUploadService {
  private readonly maxFileSize = 1024 * 1024 * 1024; // 1GB

  // Modal state
  private isUploadModalOpenSubject = new BehaviorSubject<boolean>(false);
  isUploadModalOpen$ = this.isUploadModalOpenSubject.asObservable();

  private uploadItemsSubject = new BehaviorSubject<UploadItem[]>([]);
  uploadItems$ = this.uploadItemsSubject.asObservable();

  private uploadCaptionSubject = new BehaviorSubject<string>('');
  uploadCaption$ = this.uploadCaptionSubject.asObservable();

  private isUploadingSubject = new BehaviorSubject<boolean>(false);
  isUploading$ = this.isUploadingSubject.asObservable();

  private isEditingWithFilesSubject = new BehaviorSubject<boolean>(false);
  isEditingWithFiles$ = this.isEditingWithFilesSubject.asObservable();

  // Error state
  private fileValidationErrorsSubject = new BehaviorSubject<FileValidationError[]>([]);
  fileValidationErrors$ = this.fileValidationErrorsSubject.asObservable();

  private showErrorNotificationSubject = new BehaviorSubject<boolean>(false);
  showErrorNotification$ = this.showErrorNotificationSubject.asObservable();

  constructor(private fileUploadApi: FileUploadApiService) {}

  // Getters
  get uploadItems(): UploadItem[] {
    return this.uploadItemsSubject.value;
  }

  get uploadCaption(): string {
    return this.uploadCaptionSubject.value;
  }

  get isUploadModalOpen(): boolean {
    return this.isUploadModalOpenSubject.value;
  }

  get isUploading(): boolean {
    return this.isUploadingSubject.value;
  }

  get isEditingWithFiles(): boolean {
    return this.isEditingWithFilesSubject.value;
  }

  get fileValidationErrors(): FileValidationError[] {
    return this.fileValidationErrorsSubject.value;
  }

  // Setters
  setUploadCaption(caption: string): void {
    this.uploadCaptionSubject.next(caption);
  }

  setIsEditingWithFiles(value: boolean): void {
    this.isEditingWithFilesSubject.next(value);
  }

  // File validation
  validateFiles(files: File[]): {
    validFiles: File[];
    errors: FileValidationError[];
  } {
    const validFiles: File[] = [];
    const errors: FileValidationError[] = [];

    files.forEach(file => {
      if (file.size > this.maxFileSize) {
        errors.push({
          fileName: file.name,
          error: 'size',
          actualSize: file.size,
          actualType: file.type
        });
      } else {
        validFiles.push(file);
      }
    });

    return { validFiles, errors };
  }

  onFileValidationError(errors: FileValidationError[], cdr?: ChangeDetectorRef): void {
    const processedErrors = errors.map(error => {
      if (error.error === 'size') {
        const actualSize = this.formatFileSize(error.actualSize || 0);
        const maxSize = this.formatFileSize(this.maxFileSize);
        console.warn(`❌ File "${error.fileName}" exceeds size limit: ${actualSize} > ${maxSize}`);
      } else if (error.error === 'type') {
        const fileType = error.actualType || 'unknown';
        console.warn(`❌ File "${error.fileName}" has unsupported type: ${fileType}`);
      }
      return { ...error };
    });

    this.fileValidationErrorsSubject.next(processedErrors);
    this.showErrorNotificationSubject.next(true);

    setTimeout(() => {
      this.showErrorNotificationSubject.next(false);
      if (cdr) cdr.detectChanges();
    }, 500);
  }

  // File size utilities
  formatFileSize(size: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let index = 0;
    let formatted = size;

    while (formatted >= 1024 && index < units.length - 1) {
      formatted /= 1024;
      index++;
    }

    return `${formatted.toFixed(2)} ${units[index]}`;
  }

  getTotalUploadSize(): number {
    return this.uploadItems.reduce((sum, item) => sum + item.size, 0);
  }

  checkUploadSizeLimit(): void {
    const total = this.getTotalUploadSize();
    const max = this.maxFileSize;
    const warn = max * 0.9;

    if (total > max) {
      console.warn(
        `❌ Total upload size ${this.formatFileSize(total)} exceeds limit (${this.formatFileSize(max)})`
      );
    } else if (total > warn) {
      console.warn(
        `⚠️ Total upload size ${this.formatFileSize(total)} is nearing limit (${this.formatFileSize(max)})`
      );
    }
  }

  isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  // Upload items management
  addUploadItems(files: File[], cdr?: ChangeDetectorRef): void {
    const { validFiles, errors } = this.validateFiles(files);

    if (errors.length > 0) {
      this.onFileValidationError(errors, cdr);
    }

    if (validFiles.length > 0) {
      const newItems = validFiles.map(f => ({
        file: f,
        name: f.name,
        size: f.size,
        progress: 0
      }));

      const currentItems = this.uploadItemsSubject.value;
      this.uploadItemsSubject.next([...currentItems, ...newItems]);
      this.checkUploadSizeLimit();
    }
  }

  setUploadItems(files: File[], cdr?: ChangeDetectorRef): void {
    const { validFiles, errors } = this.validateFiles(files);

    if (errors.length > 0) {
      this.onFileValidationError(errors, cdr);
    }

    if (validFiles.length > 0) {
      const items = validFiles.map(f => ({
        file: f,
        name: f.name,
        size: f.size,
        progress: 0
      }));

      this.uploadItemsSubject.next(items);
      this.checkUploadSizeLimit();
    }
  }

  cancelFileUpload(index: number): void {
    const items = [...this.uploadItems];
    const item = items[index];

    if (item?.abort) {
      item.abort();
    }
    if (item?.subscription) {
      item.subscription.unsubscribe();
    }

    items.splice(index, 1);
    this.uploadItemsSubject.next(items);

    if (items.length === 0) {
      this.closeUploadModal();
    }
  }

  removeFileFromList(index: number): void {
    this.cancelFileUpload(index);
  }

  // Modal management
  openUploadModal(caption?: string, isEditing: boolean = false): void {
    this.isUploadModalOpenSubject.next(true);
    this.uploadCaptionSubject.next(caption || '');
    this.isEditingWithFilesSubject.next(isEditing);
  }

  closeUploadModal(): void {
    // Cancel all ongoing uploads
    const items = this.uploadItems;
    items.forEach((item, index) => {
      if (item.subscription) {
        item.subscription.unsubscribe();
      }
    });

    this.isUploadModalOpenSubject.next(false);
    this.isUploadingSubject.next(false);
    this.uploadItemsSubject.next([]);
    this.uploadCaptionSubject.next('');
    this.isEditingWithFilesSubject.next(false);
  }

  // Upload operations
  async uploadFiles(
    currentUserNickName: string
  ): Promise<UploadResult[]> {
    if (this.uploadItems.length === 0 || this.isUploading) {
      return [];
    }

    this.isUploadingSubject.next(true);

    if (this.uploadItems.length >= 40) {
      console.warn('⚠️ Uploading a large number of files may take some time.');
    }

    try {
      const files = this.uploadItems.map(i => i.file);
      const uploadUrls = await this.fileUploadApi.getUploadUrls(files);
      const nameToUrl = new Map(uploadUrls.map(u => [u.originalName, u.url] as const));
      const uploadedFiles: UploadResult[] = [];

      await Promise.all(
        this.uploadItems.map((item, index) =>
          new Promise<void>(resolve => {
            const url = nameToUrl.get(item.name);
            if (!url) {
              this.updateItemError(index, 'No URL');
              resolve();
              return;
            }

            const uploadResult = this.fileUploadApi.uploadFileWithProgress(
              item.file,
              url,
              currentUserNickName
            );

            this.updateItemAbort(index, uploadResult.abort);

            const subscription = uploadResult.observable.subscribe({
              next: (result: {
                progress: number;
                fileData?: UploadResult;
              }) => {
                this.updateItemProgress(index, result.progress);
                if (result.fileData) {
                  uploadedFiles.push(result.fileData);
                }
              },
              error: () => {
                this.updateItemError(index, 'Upload error');
                resolve();
                subscription.unsubscribe();
              },
              complete: () => {
                this.updateItemComplete(index, url);
                resolve();
                subscription.unsubscribe();
              }
            });

            this.updateItemSubscription(index, subscription);
          })
        )
      );

      return uploadedFiles;
    } catch (error) {
      console.error('❌ [UPLOAD] Upload failed:', error);
      throw error;
    } finally {
      this.isUploadingSubject.next(false);
    }
  }

  async getUploadUrls(files: File[]): Promise<Array<{ originalName: string; url: string }>> {
    try {
      return await this.fileUploadApi.getUploadUrls(files);
    } catch (error) {
      console.error('❌ [UPLOAD URLs] Failed to get upload URLs:', error);
      throw error;
    }
  }

  async getDownloadUrls(
    fileNames: string[],
    currentUserNickName: string
  ): Promise<Array<{ originalName: string; url: string }>> {
    try {
      return await this.fileUploadApi.getDownloadUrls(fileNames, currentUserNickName);
    } catch (error) {
      console.error('❌ [DOWNLOAD URLs] Failed to get download URLs:', error);
      throw error;
    }
  }

  async uploadSingleFile(
    file: File,
    uploadUrl: string,
    currentUserNickName: string
  ): Promise<UploadResult> {
    const { observable } = this.fileUploadApi.uploadFileWithProgress(
      file,
      uploadUrl,
      currentUserNickName
    );

    return new Promise((resolve, reject) => {
      let finalFileData: any = null;

      const subscription = observable.subscribe({
        next: (result: any) => {
          if (result.fileData) {
            finalFileData = result.fileData;
          }
        },
        error: (error: any) => {
          subscription.unsubscribe();
          reject(error);
        },
        complete: () => {
          subscription.unsubscribe();

          if (finalFileData) {
            resolve(finalFileData);
          } else {
            console.error('❌ [UPLOAD SINGLE FILE] No file data received');
            reject(new Error('Upload completed but no file data received'));
          }
        }
      });
    });
  }

  // Delete files
  async deleteFilesFromMessage(
    messageContent: string,
    currentUserNickName: string
  ): Promise<void> {
    try {
      let parsed: any;
      try {
        parsed = JSON.parse(messageContent);
      } catch {
        return;
      }

      if (!parsed.files || !Array.isArray(parsed.files) || parsed.files.length === 0) {
        return;
      }

      const filesToDelete = parsed.files
        .filter((file: any) => file.fileName && file.uniqueFileName)
        .map((file: any) => ({
          fileName: file.fileName,
          uniqueFileName: file.uniqueFileName
        }));

      const deletionPromises = filesToDelete.map(
        async (file: { fileName: string; uniqueFileName: string }) => {
          try {
            const success = await this.fileUploadApi.deleteSpecificFileVersion(
              file.uniqueFileName,
              currentUserNickName
            );
            return { ...file, success };
          } catch (error) {
            return { ...file, success: false, error };
          }
        }
      );

      const results = await Promise.all(deletionPromises);
      const failed = results.filter(r => !r.success);

      if (failed.length > 0) {
        console.warn('❌ [DELETE FILES] Some files failed to delete:', failed);
      }
    } catch (error) {
      console.error('❌ [DELETE FILES] Error:', error);
    }
  }

  async deleteSpecificFile(
    uniqueFileName: string,
    currentUserNickName: string
  ): Promise<boolean> {
    try {
      return await this.fileUploadApi.deleteSpecificFileVersion(
        uniqueFileName,
        currentUserNickName
      );
    } catch (error) {
      console.warn('⚠️ [DELETE FILE] Failed to delete file:', error);
      return false;
    }
  }

  // Private helper methods for updating upload items
  private updateItemProgress(index: number, progress: number): void {
    const items = [...this.uploadItems];
    if (items[index]) {
      items[index] = { ...items[index], progress };
      this.uploadItemsSubject.next(items);
    }
  }

  private updateItemError(index: number, error: string): void {
    const items = [...this.uploadItems];
    if (items[index]) {
      items[index] = { ...items[index], error, progress: 0 };
      this.uploadItemsSubject.next(items);
    }
  }

  private updateItemComplete(index: number, url: string): void {
    const items = [...this.uploadItems];
    if (items[index]) {
      items[index] = { ...items[index], url, progress: 100 };
      this.uploadItemsSubject.next(items);
    }
  }

  private updateItemAbort(index: number, abort: () => void): void {
    const items = [...this.uploadItems];
    if (items[index]) {
      items[index] = { ...items[index], abort };
      this.uploadItemsSubject.next(items);
    }
  }

  private updateItemSubscription(index: number, subscription: any): void {
    const items = [...this.uploadItems];
    if (items[index]) {
      items[index] = { ...items[index], subscription };
      this.uploadItemsSubject.next(items);
    }
  }

  // Cleanup
  reset(): void {
    this.closeUploadModal();
    this.fileValidationErrorsSubject.next([]);
    this.showErrorNotificationSubject.next(false);
  }
}