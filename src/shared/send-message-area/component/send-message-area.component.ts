import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

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

interface EditingFile {
  fileName: string;
  url: string;
  type?: string;
  size?: number;
  uniqueId?: string;
  uniqueFileName?: string;
  file? : File;
}

@Component({
  selector: 'shared-send-message-area',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './send-message-area.component.html',
})
export class SendAreaComponent implements OnChanges {
  @Output() send = new EventEmitter<string>();
  @Output() editComplete = new EventEmitter<{ messageId: string; content: string }>();
  @Output() editCancel = new EventEmitter<void>();
  @Output() replyCancel = new EventEmitter<void>();
  @Output() fileUpload = new EventEmitter<FileUploadEvent>();
  @Output() fileValidationError = new EventEmitter<FileValidationError[]>();
  @Output() removeFileFromEditingMessage = new EventEmitter<{ messageId: string; uniqueFileName: string }>();
  @Output() editFile = new EventEmitter<{ messageId: string; file: EditingFile }>();
  @Output() draftTextChange = new EventEmitter<string>();
  
  @Input() draftText: string = '';
  @Input() editingMessage?: BaseMessage;
  @Input() replyingToMessage?: BaseMessage;
  @Input() maxFileSize: number = 1024 * 1024 * 1024;  
  @Input() editFileUploading: boolean = false;

  message = '';
  editingFiles: EditingFile[] = [];

  fileBeingEdited?: EditingFile;

  replyingFiles: EditingFile[] = [];
  replyingText: string = '';
  
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
  
  constructor(private translate: TranslateService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['editingMessage']) {
      if (this.editingMessage) {
        this.parseEditingMessage();
      } else {
        this.message = '';
        this.editingFiles = [];
      }
    }
    
    if (changes['replyingToMessage']) {
      if (this.replyingToMessage) {
        this.parseReplyingMessage();
      } else if (!this.editingMessage) {
        this.message = '';
        this.replyingFiles = [];
      }
    }

    if (changes['draftText']) {
      this.message = this.draftText || '';
    }
  }

  public parseReplyingMessage() {
    if (!this.replyingToMessage) return;
  
    try {
      const parsed = JSON.parse(this.replyingToMessage.content);
  
      this.replyingText = parsed.text || ''; 
      this.replyingFiles = (parsed.files || []).map((file: any) => ({
        fileName: file.fileName || 'Unknown file',
        url: file.url || '',
        type: file.type,
        size: file.size,
        uniqueId: file.uniqueId || file.uniqueFileName,
        uniqueFileName: file.uniqueFileName
      }));
    } catch (e) {
      this.replyingText = this.replyingToMessage.content;
      this.replyingFiles = [];
    }
  }
  
  private parseEditingMessage() {
    if (!this.editingMessage) return;
  
    let parsed: any = null;
    
    if ((this.editingMessage as any).parsedFiles) {
      this.editingFiles = (this.editingMessage as any).parsedFiles.map((file: any) => ({
        fileName: file.fileName || file.originalName || file.uniqueFileName || 'Unknown file',
        url: file.url || '',
        type: file.type,
        size: file.size,
        uniqueId: file.uniqueId || file.uniqueFileName || undefined,
        uniqueFileName: file.uniqueFileName || file.uniqueId || undefined
      }));
      
      try {
        const contentParsed = JSON.parse(this.editingMessage.content);
        this.message = contentParsed.text || '';
      } catch {
        this.message = this.editingMessage.content || '';
      }
      return;
    }
    
    if ((this.editingMessage as any).parsedContent) {
      parsed = (this.editingMessage as any).parsedContent;
    } else if (this.editingMessage.content) {
      try {
        parsed = JSON.parse(this.editingMessage.content);
      } catch (err) {
        parsed = this.editingMessage.content;
      }
    } else {
      this.message = '';
      this.editingFiles = [];
      return;
    }
  
    if (parsed && typeof parsed === 'object' && (parsed.text !== undefined || parsed.files !== undefined)) {
      this.message = parsed.text || '';
      this.editingFiles = (parsed.files || []).map((file: any) => ({
        fileName: file.fileName || file.originalName || file.uniqueFileName || 'Unknown file',
        url: file.url || '',
        type: file.type,
        size: file.size,
        uniqueId: file.uniqueId || file.uniqueFileName || undefined,
        uniqueFileName: file.uniqueFileName || file.uniqueId || undefined
      }));
      return;
    }
  
    if (typeof parsed === 'string') {
      this.message = parsed;
      this.editingFiles = [];
      return;
    }
  
    this.message = '';
    this.editingFiles = [];
  } 

  public detectFileType(fileNameOrUrl: string): string | null {
    const lower = fileNameOrUrl.toLowerCase();
    if (lower.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg|ico)$/)) {
      return 'image';
    }
    if (lower.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v|3gp)$/)) {
      return 'video';
    }
    if (lower.match(/\.(mp3|wav|ogg|aac|flac|wma|m4a)$/)) {
      return 'audio';
    }
    if (lower.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf)$/)) {
      return 'document';
    }
    return 'file';
  }

  getFileIcon(file: EditingFile): string {
    const type = this.detectFileType(file.fileName);
    switch (type) {
      case 'image':
        return '🖼️';
      case 'video':
        return '🎥';
      case 'audio':
        return '🎵';
      case 'document':
        return '📄';
      default:
        return '📎';
    }
  }

  getFileExtension(fileName: string): string {
    if (!fileName) return 'File';
    const extension = fileName.split('.').pop()?.toUpperCase();
    return extension || 'File';
  }

  formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  removeEditingFile(file: EditingFile) {
    if (!this.editingMessage || !file.uniqueId) return;
    
    this.editingFiles = this.editingFiles.filter(f => f.uniqueId !== file.uniqueId);
  
    this.removeFileFromEditingMessage.emit({
      messageId: this.editingMessage.messageId || this.editingMessage.id || '',
      uniqueFileName: file.uniqueId
    });
  }

  setFileToEdit(file: EditingFile) {
    this.fileBeingEdited = file;
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
      
      if (!this.isEditing) {
        this.message = '';
      }
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
    if (this.isEditing) {
      return this.translate.instant('messages.editPlaceholder');
    }
    if (this.isReplying) {
      return this.translate.instant('messages.replyToPlaceholder', {
        sender: this.replyingToMessage?.sender ?? ''
      });
    }
    return this.translate.instant('messages.sendPlaceholder');
  }

  emitMessage() {

    if (this.editFileUploading) {
      return;
    }

    const text = this.message.trim();
    const hasFiles = this.editingFiles.length > 0;
  
    if (!text && !hasFiles){
      return;
    };
    
    if (this.isTooLong) return;
    if (new Blob([text]).size > this.maxBytes) return;
  
    const now = Date.now();
    if (now - this.lastSentAt < this.minIntervalMs) return;
  
    if (this.isEditing && this.editingMessage) {
      let content: string;
    
      if (hasFiles || text) {
        const filesForContent = this.editingFiles.map(file => ({
          fileName: file.fileName,
          url: file.url,
          type: file.type,
          size: file.size,
          uniqueId: file.uniqueId,
          uniqueFileName: file.uniqueFileName
        }));
  
        content = JSON.stringify({
          text: text || '',
          files: filesForContent
        });
      } else {
        content = '';
      }
    
      this.editComplete.emit({
        messageId: (this.editingMessage.messageId || this.editingMessage.id)!,
        content
      });
    } else {
      this.send.emit(text);
    }    
  
    this.message = '';
    this.lastSentAt = now;
    this.draftTextChange.emit('');
  }
  
  cancelEdit() {
    this.editCancel.emit();
    this.message = '';
    this.editingFiles = [];
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

  trackByFile(index: number, file: EditingFile): string {
    return file.uniqueId || file.uniqueFileName || file.fileName || index.toString();
  }

  onEditFileInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0 && this.fileBeingEdited && this.editingMessage) {
      const newFile = input.files[0];
  
      this.editingFiles = this.editingFiles.map(f =>
        f.uniqueId === this.fileBeingEdited?.uniqueId ? {
          fileName: newFile.name,
          url: '',
          type: newFile.type,
          size: newFile.size,
          uniqueId: this.fileBeingEdited?.uniqueId,
          uniqueFileName: this.fileBeingEdited?.uniqueFileName,
          file: newFile
        } : f
      );
  
      const updatedFile = this.editingFiles.find(f => f.uniqueId === this.fileBeingEdited?.uniqueId)!;
  
      this.editFile.emit({
        messageId: this.editingMessage.messageId || this.editingMessage.id || '',
        file: updatedFile
      });
  
      this.fileBeingEdited = undefined;
      input.value = '';
    }
  }
}