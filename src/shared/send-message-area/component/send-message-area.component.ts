import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface BaseMessage {
  messageId?: string;
  id?: string;
  sender: string;
  content: string;
}

interface FileUploadEvent {
  files: File[];
  message?: string;
}

interface FileValidationError {
  fileName: string;
  error: 'size' | 'type';
  actualSize?: number;
  actualType?: string;
}

@Component({
  selector: 'shared-send-message-area',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './send-message-area.component.html',
})
export class SendAreaComponent implements OnChanges {
  @Output() send = new EventEmitter<string>();
  @Output() editComplete = new EventEmitter<{ messageId: string; content: string }>();
  @Output() editCancel = new EventEmitter<void>();
  @Output() replyCancel = new EventEmitter<void>();
  @Output() fileUpload = new EventEmitter<FileUploadEvent>();
  @Output() fileValidationError = new EventEmitter<FileValidationError[]>();
  
  @Input() editingMessage?: BaseMessage;
  @Input() replyingToMessage?: BaseMessage;
  @Input() maxFileSize: number = 1024 * 1024 * 1024; 

  message = '';
  readonly maxLength = 2000;
  readonly maxBytes = 8000;
  private lastSentAt = 0;
  private minIntervalMs = 400;

  readonly FILE_SIZE_LIMITS = {
    BYTE: 1,
    KB: 1024,
    MB: 1024 * 1024,
    GB: 1024 * 1024 * 1024
  };
  
  ngOnChanges(changes: SimpleChanges) {
    if (changes['editingMessage']) {
      if (this.editingMessage) {
        this.message = this.editingMessage.content;
      } else if (!this.replyingToMessage) {
        this.message = '';
      }
    }
    
    if (changes['replyingToMessage']) {
      if (!this.replyingToMessage && !this.editingMessage) {
        this.message = '';
      }
    }
  }

  private handleFiles(files: File[]) {
    const validationResults = files.map(file => ({
      file,
      isValid: this.isFileValid(file),
      error: this.getFileValidationError(file)
    }));

    const validFiles = validationResults
      .filter(result => result.isValid)
      .map(result => result.file);

    const errors = validationResults
      .filter(result => !result.isValid && result.error)
      .map(result => result.error!);

    if (errors.length > 0) {
      this.fileValidationError.emit(errors);
    }
    
    if (validFiles.length > 0) {
      this.fileUpload.emit({
        files: validFiles,
        message: this.message.trim()
      });
      
      this.message = '';
    }
  }

  private isFileValid(file: File): boolean {
    if (file.size > this.maxFileSize) {
      return false;
    }
    return true;
  }

  private getFileValidationError(file: File): FileValidationError | null {
    if (file.size > this.maxFileSize) {
      return {
        fileName: file.name,
        error: 'size',
        actualSize: file.size
      };
    }

    return null;
  }

  onFileInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
    
      this.handleFiles(files);
      input.value = '';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  get maxFileSizeFormatted(): string {
    return this.formatFileSize(this.maxFileSize);
  }

  checkTotalFileSize(files: File[]): boolean {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    return totalSize <= this.maxFileSize;
  }

  get fileSizeInfo(): string {
    return `Max file size: ${this.maxFileSizeFormatted}`;
  }
  
  get warningThreshold(): number {
    return this.maxLength - 100;
  }

  get messageLength(): number {
    return this.message.length;
  }

  get showCounter(): boolean {
    return this.messageLength >= this.warningThreshold;
  }

  get isTooLong(): boolean {
    return this.messageLength > this.maxLength;
  }

  get remainingMessage(): string {
    return `${this.messageLength}/${this.maxLength}`;
  }

  get remainingChars(): string {
    const remaining = this.maxLength - this.messageLength;
    return remaining >= 0 ? `${remaining}` : `${remaining}`;
  }

  get isEditing(): boolean {
    return !!this.editingMessage;
  }

  get isReplying(): boolean {
    return !!this.replyingToMessage;
  }

  get placeholderText(): string {
    if (this.isEditing) return 'Edit Message...';
    if (this.isReplying) return `Reply to ${this.replyingToMessage?.sender}...`;
    return 'Send message...';
  }

  emitMessage() {
    const text = this.message.trim();
    if (!text || this.isTooLong) return;
    if (new Blob([text]).size > this.maxBytes) return;
    const now = Date.now();
    if (now - this.lastSentAt < this.minIntervalMs) return;

    if (this.isEditing && this.editingMessage) {
      this.editComplete.emit({
        messageId: (this.editingMessage.messageId || this.editingMessage.id)!,
        content: text
      });
    } else {
      this.send.emit(text);
    }
    
    this.message = '';
    this.lastSentAt = now;
  }

  cancelEdit() {
    this.editCancel.emit();
    this.message = '';
  }

  cancelReply() {
    this.replyCancel.emit();
    this.message = '';
  }
  
  truncateText(text: string, maxLength: number = 50): string {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      if (event.shiftKey) {
        return;
      } else {
        event.preventDefault();
        this.emitMessage();
      }
    }
  }
  
  get textareaRows(): number {
    const lines = this.message.split('\n').length;
    return Math.min(Math.max(lines, 1), 5);
  }
}