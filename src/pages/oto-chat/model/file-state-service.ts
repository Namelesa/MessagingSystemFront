import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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
  message: string;
}

export interface FileUploadState {
  uploadItems: UploadItem[];
  isUploadModalOpen: boolean;
  uploadCaption: string;
  isUploading: boolean;
  fileValidationErrors: FileValidationError[];
  showErrorNotification: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadStateService {
  private readonly maxFileSize: number = 1024 * 1024 * 1024;

  private uploadStateSubject = new BehaviorSubject<FileUploadState>({
    uploadItems: [],
    isUploadModalOpen: false,
    uploadCaption: '',
    isUploading: false,
    fileValidationErrors: [],
    showErrorNotification: false
  });

  public uploadState$ = this.uploadStateSubject.asObservable();

  getUploadState(): FileUploadState {
    return this.uploadStateSubject.value;
  }

  private updateState(updates: Partial<FileUploadState>): void {
    const currentState = this.getUploadState();
    this.uploadStateSubject.next({ ...currentState, ...updates });
  }

  validateFiles(files: File[]): { 
    validFiles: File[], 
    errors: Array<{
      fileName: string;
      error: 'size' | 'type';
      actualSize?: number;
      actualType?: string;
    }> 
  } {
    const validFiles: File[] = [];
    const errors: Array<{
      fileName: string;
      error: 'size' | 'type';
      actualSize?: number;
      actualType?: string;
    }> = [];

    files.forEach(file => {
      if (file.size > this.maxFileSize) {
        errors.push({
          fileName: file.name,
          error: 'size',
          actualSize: file.size,
          actualType: file.type
        });
        return;
      }
      validFiles.push(file);
    });

    return { validFiles, errors };
  }

  formatFileSize(size: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let index = 0;
    let formattedSize = size;

    while (formattedSize >= 1024 && index < units.length - 1) {
      formattedSize /= 1024;
      index++;
    }

    return `${formattedSize.toFixed(2)} ${units[index]}`;
  }

  isImageFile(file: File): boolean {
    return file.type.startsWith('image/');
  }

  addUploadItems(files: File[]): void {
    const currentState = this.getUploadState();
    const newItems: UploadItem[] = files.map(f => ({
      file: f,
      name: f.name,
      size: f.size,
      progress: 0
    }));
    
    this.updateState({
      uploadItems: [...currentState.uploadItems, ...newItems]
    });
  }

  setUploadItems(files: File[]): void {
    const newItems: UploadItem[] = files.map(f => ({
      file: f,
      name: f.name,
      size: f.size,
      progress: 0
    }));
    
    this.updateState({ uploadItems: newItems });
  }

  updateUploadItem(index: number, updates: Partial<UploadItem>): void {
    const currentState = this.getUploadState();
    const updatedItems = [...currentState.uploadItems];
    
    if (index >= 0 && index < updatedItems.length) {
      updatedItems[index] = { ...updatedItems[index], ...updates };
      this.updateState({ uploadItems: updatedItems });
    }
  }

  removeUploadItem(index: number): void {
    const currentState = this.getUploadState();
    const item = currentState.uploadItems[index];
    
    if (item?.abort) {
      item.abort();
    }
    if (item?.subscription) {
      item.subscription.unsubscribe();
    }
    
    const updatedItems = currentState.uploadItems.filter((_, i) => i !== index);
    this.updateState({ uploadItems: updatedItems });
    
    if (updatedItems.length === 0) {
      this.closeUploadModal();
    }
  }

  clearUploadItems(): void {
    const currentState = this.getUploadState();
    
    currentState.uploadItems.forEach(item => {
      if (item.abort) item.abort();
      if (item.subscription) item.subscription.unsubscribe();
    });
    
    this.updateState({ uploadItems: [] });
  }

  openUploadModal(caption?: string): void {
    this.updateState({
      isUploadModalOpen: true,
      uploadCaption: caption || ''
    });
  }

  closeUploadModal(): void {
    this.clearUploadItems();
    this.updateState({
      isUploadModalOpen: false,
      isUploading: false,
      uploadCaption: ''
    });
  }

  setUploadCaption(caption: string): void {
    this.updateState({ uploadCaption: caption });
  }

  setIsUploading(isUploading: boolean): void {
    this.updateState({ isUploading });
  }

  getTotalUploadSize(): number {
    const currentState = this.getUploadState();
    return currentState.uploadItems.reduce((sum, item) => sum + item.size, 0);
  }

  checkUploadSizeLimit(): { 
    isOverLimit: boolean; 
    isNearLimit: boolean; 
    totalSize: number;
    maxSize: number;
  } {
    const totalSize = this.getTotalUploadSize();
    const maxSize = this.maxFileSize;
    const warningThreshold = maxSize * 0.9;

    return {
      isOverLimit: totalSize > maxSize,
      isNearLimit: totalSize > warningThreshold && totalSize <= maxSize,
      totalSize,
      maxSize
    };
  }

  setFileValidationErrors(errors: Array<{
    fileName: string;
    error: 'size' | 'type';
    actualSize?: number;
    actualType?: string;
  }>): FileValidationError[] {
    const formattedErrors: FileValidationError[] = errors.map(error => {
      let message = '';
      
      if (error.error === 'size') {
        const actualSize = this.formatFileSize(error.actualSize!);
        const maxSize = this.formatFileSize(this.maxFileSize);
        message = `File "${error.fileName}" too big (${actualSize}). Max size: ${maxSize}`;
      } else if (error.error === 'type') {
        const fileType = error.actualType || 'unknown';
        message = `File type "${error.fileName}" is not supported (${fileType})`;
      }
      
      return {
        ...error,
        message
      };
    });

    this.updateState({
      fileValidationErrors: formattedErrors,
      showErrorNotification: true
    });

    return formattedErrors;
  }

  hideErrorNotification(): void {
    this.updateState({ showErrorNotification: false });
  }

  handleFileUpload(files: File[], message?: string, isEditing: boolean = false): {
    validFiles: File[];
    errors: FileValidationError[];
    shouldOpenModal: boolean;
  } {
    const { validFiles, errors } = this.validateFiles(files);
    const formattedErrors = errors.length > 0 ? this.setFileValidationErrors(errors) : [];

    if (validFiles.length > 0 && !isEditing) {
      this.setUploadItems(validFiles);
      this.setUploadCaption(message || '');
      this.openUploadModal();
            
      return {
        validFiles,
        errors: formattedErrors,
        shouldOpenModal: true
      };
    }

    return {
      validFiles,
      errors: formattedErrors,
      shouldOpenModal: false
    };
  }

  handleFileDrop(files: File[], draftText?: string, isEditing: boolean = false): {
    validFiles: File[];
    errors: FileValidationError[];
  } {
    const { validFiles, errors } = this.validateFiles(files);
    const formattedErrors = errors.length > 0 ? this.setFileValidationErrors(errors) : [];

    if (validFiles.length > 0 && !isEditing) {
      const currentState = this.getUploadState();
      
      this.addUploadItems(validFiles);

      if (draftText?.trim() && !currentState.uploadCaption) {
        this.setUploadCaption(draftText);
      }

      if (!currentState.isUploadModalOpen) {
        this.openUploadModal();
      }
    }

    return {
      validFiles,
      errors: formattedErrors
    };
  }

  handleModalFileInput(files: File[]): {
    validFiles: File[];
    errors: FileValidationError[];
  } {
    const { validFiles, errors } = this.validateFiles(files);
    const formattedErrors = errors.length > 0 ? this.setFileValidationErrors(errors) : [];

    if (validFiles.length > 0) {
      this.addUploadItems(validFiles);
    }

    return {
      validFiles,
      errors: formattedErrors
    };
  }

  getMaxFileSize(): number {
    return this.maxFileSize;
  }

  resetState(): void {
    this.clearUploadItems();
    this.uploadStateSubject.next({
      uploadItems: [],
      isUploadModalOpen: false,
      uploadCaption: '',
      isUploading: false,
      fileValidationErrors: [],
      showErrorNotification: false
    });
  }
}