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
  
  @Input() editingMessage?: BaseMessage;
  @Input() replyingToMessage?: BaseMessage;
  @Input() maxFileSize: number = 10 * 1024 * 1024; // 10MB по умолчанию
  @Input() allowedFileTypes: string[] = ['image/*', 'video/*', 'audio/*', 'application/pdf', 'text/*'];

  message = '';
  readonly maxLength = 2000;
  readonly maxBytes = 8000;
  private lastSentAt = 0;
  private minIntervalMs = 400;
  
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

  // File handling methods
  private handleFiles(files: File[]) {
    const validFiles = files.filter(file => this.isFileValid(file));
    
    if (validFiles.length > 0) {
      this.fileUpload.emit({
        files: validFiles,
        message: this.message.trim()
      });
      
      // Clear message after file upload
      this.message = '';
    }
  }

  private isFileValid(file: File): boolean {
    // Check file size
    if (file.size > this.maxFileSize) {
      console.warn(`File ${file.name} is too large. Max size: ${this.maxFileSize} bytes`);
      return false;
    }

    // Check file type
    const isValidType = this.allowedFileTypes.some(type => {
      if (type.endsWith('/*')) {
        const category = type.replace('/*', '');
        return file.type.startsWith(category);
      }
      return file.type === type;
    });

    if (!isValidType) {
      console.warn(`File type ${file.type} is not allowed`);
      return false;
    }

    return true;
  }

  // File input handler for manual file selection
  onFileInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFiles(Array.from(input.files));
      // Reset input value to allow selecting the same file again
      input.value = '';
    }
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