import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnChanges, SimpleChanges, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { OtoMessage } from '../../../entities/oto-message';
import { isToday, truncateText, computeContextMenuPosition } from '../../../shared/chat';
import { FileUploadApiService } from '../../../features/file-sender';
import { ImageViewerComponent, ImageViewerItem } from '../../../shared/image-viewer';
import { CustomAudioPlayerComponent } from '../../../shared/custom-player';

@Component({
  selector: 'widgets-oto-chat-messages',
  standalone: true,
  imports: [CommonModule, ImageViewerComponent, CustomAudioPlayerComponent],
  templateUrl: './oto-chat-messages.widget.html',
})
export class OtoChatMessagesWidget implements OnChanges, AfterViewInit, OnDestroy {
  @Input() chatNickName!: string;
  @Input() currentUserNickName!: string;
  @Input() messages$?: Observable<OtoMessage[]>;
  @Input() userInfoDeleted$?: Observable<{ userName: string }>;
  @Input() loadHistory?: (nick: string, take: number, skip: number) => Observable<OtoMessage[]>;

  @Output() editMessage = new EventEmitter<OtoMessage>();
  @Output() deleteMessage = new EventEmitter<OtoMessage>();
  @Output() replyToMessage = new EventEmitter<OtoMessage>();
  @Output() chatUserDeleted = new EventEmitter<void>();

  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  showImageViewer = false;
  imageViewerImages: ImageViewerItem[] = [];
  imageViewerInitialIndex = 0;
  imageViewerKey = 0;

  constructor(private fileUploadApi: FileUploadApiService) {}

  messages: OtoMessage[] = [];
  take = 20;
  skip = 0;
  allLoaded = false;
  loading = false;
  private prevScrollHeight = 0;
  contextMenuMessageId: string | null = null;
  contextMenuPosition = { x: 0, y: 0 };
  showContextMenu = false;
  highlightedMessageId: string | null = null;

  isMessageHighlighted(id: string): boolean {
    return this.highlightedMessageId === id;
  }

  private highlightMessage(messageId: string) {
    this.highlightedMessageId = null;
    this.highlightedMessageId = messageId;
    setTimeout(() => {
      if (this.highlightedMessageId === messageId) this.highlightedMessageId = null;
    }, 1500);
  }

  parseContent(msg: OtoMessage): { text: string; files: any[] } {
    if ((msg as any).parsedContent) {
      return (msg as any).parsedContent;
    }
    
    try {
      const parsed = JSON.parse(msg.content);
      const filesWithType = (parsed.files || []).map((file: any) => {
        if (!file.type && file.fileName) {
          file.type = this.detectFileType(file.fileName);
        }
        return file;
      });
      
      const result = {
        text: parsed.text || '',
        files: filesWithType
      };
      
      (msg as any).parsedContent = result;
      return result;
    } catch (error) {
      if (msg.content && typeof msg.content === 'string') {
        const detectedType = this.detectFileType(msg.content);
        
        if (detectedType) {
          return {
            text: '',
            files: [{
              url: msg.content,
              fileName: msg.content.split('/').pop() || 'file',
              type: detectedType
            }]
          };
        }
      }
      
      return { text: msg.content, files: [] };
    }
  }

  getFileSize(file: any): string {
    return file.size ? this.formatFileSize(file.size) : 'Unknown size';
  }
  
  getFileExtension(fileName: string): string {
    if (!fileName) return 'File';
    const extension = fileName.split('.').pop()?.toUpperCase();
    return extension || 'File';
  }
  
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private detectFileType(fileNameOrUrl: string): string | null {
    const lower = fileNameOrUrl.toLowerCase();
    
    if (lower.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg|ico)$/)) {
      return 'image/' + lower.split('.').pop();
    }
    
    if (lower.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv|m4v|3gp)$/)) {
      return 'video/' + lower.split('.').pop();
    }
    
    if (lower.match(/\.(mp3|wav|ogg|aac|flac|wma|m4a)$/)) {
      return 'audio/' + lower.split('.').pop();
    }
    
    if (lower.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|rtf)$/)) {
      return 'application/' + lower.split('.').pop();
    }
    
    if (lower.match(/\.(zip|rar|7z|tar|gz|bz2)$/)) {
      return 'application/' + lower.split('.').pop();
    }
    
    return null;
  }

  openFileViewer(fileIndex: number, messageId: string) {
    const sourceMessage = this.messages.find(msg => msg.messageId === messageId);
    if (!sourceMessage) return;
    
    const sourceContent = this.parseContent(sourceMessage);
    
    const allFiles = sourceContent.files;
    
    if (fileIndex < 0 || fileIndex >= allFiles.length) return;
    
    const clickedFile = allFiles[fileIndex];
    
    if (!clickedFile.type?.startsWith('image/') && 
        !clickedFile.type?.startsWith('video/') && 
        !clickedFile.type?.startsWith('audio/')) {
      return;
    }
    
    const mediaFiles = allFiles.filter(file => 
      file.type?.startsWith('image/') || 
      file.type?.startsWith('video/') || 
      file.type?.startsWith('audio/')
    );
    
    const mediaIndex = mediaFiles.findIndex(file => 
      file.url === clickedFile.url && 
      file.fileName === clickedFile.fileName && 
      file.type === clickedFile.type
    );
    
    if (mediaIndex === -1) return;
    
    const viewerFiles: ImageViewerItem[] = mediaFiles.map(file => ({
      url: file.url,
      fileName: file.fileName,
      type: file.type,
      messageId: sourceMessage.messageId,
      sender: sourceMessage.sender
    }));
    
    this.imageViewerImages = viewerFiles;
    this.imageViewerInitialIndex = mediaIndex;
    this.imageViewerKey++; 
    this.showImageViewer = true;
    
    if (clickedFile.type?.startsWith('video/')) {
      setTimeout(() => {
        const videoElement = document.querySelector('video') as HTMLVideoElement;
        if (videoElement) {
          videoElement.play().catch(() => {
          });
        }
      }, 100);
    }
  }

  openImageViewer(clickedImageUrl: string, messageId: string) {
    const sourceMessage = this.messages.find(msg => msg.messageId === messageId);
    if (!sourceMessage) return;
    
    const sourceContent = this.parseContent(sourceMessage);
    const sourceFiles = sourceContent.files.filter(file => 
      file.type?.startsWith('image/') || 
      file.type?.startsWith('video/') || 
      file.type?.startsWith('audio/')
    );
    
    const imageIndex = sourceFiles.findIndex(file => file.url === clickedImageUrl);
    if (imageIndex !== -1) {
      this.openFileViewer(imageIndex, messageId);
    }
  }

  onImageViewerClosed() {
    this.showImageViewer = false;
    this.imageViewerImages = [];
    this.imageViewerInitialIndex = 0;
    this.imageViewerKey = 0; 
  }

  onScrollToReplyMessage(messageId: string) {
    this.scrollToMessage(messageId);
  }

  private destroy$ = new Subject<void>();
  private shouldScrollToBottom = false;
  private hideContextMenuHandler?: () => void;

  ngAfterViewInit() {
    setTimeout(() => this.scrollToBottom(), 0);
    const hideContextMenu = () => (this.showContextMenu = false);
    document.addEventListener('click', hideContextMenu);
    this.hideContextMenuHandler = hideContextMenu;
    this.subscribeToUserDeletion();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['chatNickName'] && this.chatNickName) {
      this.initChat();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.hideContextMenuHandler) {
      document.removeEventListener('click', this.hideContextMenuHandler);
    }
  }

  get groupedMessages() {
    const groups: { date: string; messages: OtoMessage[] }[] = [];
    let lastDate = '';
    const filtered = this.messages.filter(msg => !msg.isDeleted || !this.isMyMessage(msg));
    const sorted = [...filtered].sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    for (const msg of sorted) {
      const msgDate = new Date(msg.sentAt).toDateString();
      if (msgDate !== lastDate) {
        groups.push({ date: msgDate, messages: [msg] });
        lastDate = msgDate;
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }
    return groups;
  }

  trackByGroup(index: number, group: { date: string; messages: OtoMessage[] }): string {
    return group.date;
  }

  trackByMessageId(index: number, msg: OtoMessage): string {
    return msg.messageId;
  }

  isToday = isToday;
  truncateText = truncateText;

  onScroll() {
    if (this.showContextMenu) this.showContextMenu = false;
    if (!this.scrollContainer) return;
    const el = this.scrollContainer.nativeElement;
    if (el.scrollTop < 300 && !this.loading && !this.allLoaded) {
      this.prevScrollHeight = el.scrollHeight;
      this.loadMore();
    }
  }

  scrollToMessage(messageId: string): void {
    if (!this.scrollContainer) return;
    const el = this.scrollContainer.nativeElement.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement;
    if (!el) {
      setTimeout(() => {
        const retry = this.scrollContainer!.nativeElement.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement;
        if (retry) {
          retry.scrollIntoView({ behavior: 'smooth', block: 'center' });
          this.highlightMessage(messageId);
        }
      }, 1000);
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => this.highlightMessage(messageId), 300);
  }

  getRepliedMessage(messageId: string): OtoMessage | null {
    return this.messages.find(m => m.messageId === messageId) || null;
  }

  onMessageRightClick(event: MouseEvent, msg: OtoMessage) {
    event.preventDefault();
    event.stopPropagation();
    const target = event.target as HTMLElement;
    const messageContainer = target.closest('.message-container') as HTMLElement;
    if (!messageContainer) return;
    const messageBlock = messageContainer.querySelector('[class*="px-3 py-2 rounded-2xl"]') as HTMLElement;
    if (!messageBlock || !this.scrollContainer) return;
    const blockRect = messageBlock.getBoundingClientRect();
    const containerRect = this.scrollContainer.nativeElement.getBoundingClientRect();
    const pos = computeContextMenuPosition(blockRect, containerRect, this.isMyMessage(msg));
    this.contextMenuMessageId = msg.messageId;
    this.contextMenuPosition = pos;
    this.showContextMenu = true;
  }

  onEditMessage() {
    const msg = this.messages.find(m => m.messageId === this.contextMenuMessageId);
    if (msg) this.editMessage.emit(msg);
    this.showContextMenu = false;
  }

  onDeleteMessage() {
    const msg = this.messages.find(m => m.messageId === this.contextMenuMessageId);
    if (msg) this.deleteMessage.emit(msg);
    this.showContextMenu = false;
  }

  onReplyToMessage() {
    const msg = this.messages.find(m => m.messageId === this.contextMenuMessageId);
    if (msg) this.replyToMessage.emit(msg);
    this.showContextMenu = false;
  }

  canEditOrDelete(): boolean {
    const msg = this.messages.find(m => m.messageId === this.contextMenuMessageId);
    if (!msg) return false;
    if (this.isMessageDeleted(msg)) return false;
    return this.isMyMessage(msg);
  }

  private initChat() {
    this.messages = [];
    this.skip = 0;
    this.allLoaded = false;
    this.shouldScrollToBottom = true;
    this.loadMore();

    if (!this.messages$) return;
    this.messages$.pipe(takeUntil(this.destroy$)).subscribe((newMsgs: OtoMessage[]) => {
      const filtered = newMsgs.filter(msg => !msg.isDeleted || !this.isMyMessage(msg));
      const newMap = new Map(filtered.map(m => [m.messageId, m]));
      const oldMap = new Map(this.messages.map(m => [m.messageId, m]));
      for (const m of filtered) oldMap.set(m.messageId, m);
      for (const id of Array.from(oldMap.keys())) if (!newMap.has(id)) oldMap.delete(id);
      this.messages = Array.from(oldMap.values()).sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
      
      this.loadFilesForMessages(this.messages);
      
      this.skip = this.messages.length;
      if (this.isScrolledToBottom() || this.shouldScrollToBottom) {
        setTimeout(() => this.scrollToBottom(), 0);
        this.shouldScrollToBottom = false;
      }
    });
  }

  private async loadFilesForMessages(messages: OtoMessage[]) {    
    try {
      const fileNames: string[] = [];
      const messageFileMap = new Map<string, { messageIndex: number, fileIndex: number }>();
      
      messages.forEach((msg, messageIndex) => {
        try {
          const parsed = JSON.parse(msg.content);
          if (parsed.files && Array.isArray(parsed.files)) {
            parsed.files.forEach((file: any, fileIndex: number) => {
              if (file.fileName) {
                fileNames.push(file.fileName);
                messageFileMap.set(file.fileName, { messageIndex, fileIndex });
              }
            });
          }
        } catch {
          if (msg.content && typeof msg.content === 'string') {
            const detectedType = this.detectFileType(msg.content);
            if (detectedType) {
              const fileName = msg.content.split('/').pop() || msg.content.split('\\').pop();
              if (fileName && fileName !== msg.content) {
                fileNames.push(fileName);
                messageFileMap.set(fileName, { messageIndex, fileIndex: 0 });
              }
            }
          }
        }
      });
  
      const fileUrls = await this.fileUploadApi.getDownloadUrls(fileNames);
        
      fileUrls.forEach(fileUrl => {
        const mapping = messageFileMap.get(fileUrl.originalName);
        if (mapping) {
          const message = messages[mapping.messageIndex];
          
          try {
            const parsed = JSON.parse(message.content);
            if (parsed.files && parsed.files[mapping.fileIndex]) {
              parsed.files[mapping.fileIndex].url = fileUrl.url;
              message.content = JSON.stringify(parsed);
            }
          } catch {
            if (message.content.includes(fileUrl.originalName)) {
              message.content = fileUrl.url;
            }
          }
        }
      });
      
      messages.forEach(msg => {
        delete (msg as any).parsedContent;
      });
      
    } catch (error) {
      console.error('❌ Failed to load files for messages:', error);
    }
  }

  private subscribeToUserDeletion() {
    const global$ = this.userInfoDeleted$;
    if (global$) {
      global$
        .pipe(takeUntil(this.destroy$), filter((info: any) => info?.userName === this.chatNickName))
        .subscribe(() => this.handleChatUserDeleted());
    }
  }

  private handleChatUserDeleted() {
    this.messages = [];
    this.chatUserDeleted.emit();
  }

  private loadMore() {
    if (this.loading || this.allLoaded) return;
    this.loading = true;
    const loadHistory = this.loadHistory;
    if (!loadHistory) {
      this.loading = false;
      return;
    }
    loadHistory(this.chatNickName, this.take, this.skip)
      .pipe(takeUntil(this.destroy$))
      .subscribe((newMsgs: OtoMessage[]) => {
        const filtered = newMsgs.filter(m => !m.isDeleted || !this.isMyMessage(m));
        const existingIds = new Set(this.messages.map(m => m.messageId));
        const unique = filtered.filter(m => !existingIds.has(m.messageId));
        if (unique.length === 0) {
          this.allLoaded = true;
        } else {
          this.messages = [...unique, ...this.messages];
          this.skip = this.messages.length;
          
          this.loadFilesForMessages(unique);
          
          setTimeout(() => {
            if (this.scrollContainer) {
              const el = this.scrollContainer.nativeElement;
              el.scrollTop = el.scrollHeight - this.prevScrollHeight;
            }
          }, 0);
        }
        this.loading = false;
      });
  }

  private isScrolledToBottom(): boolean {
    if (!this.scrollContainer) return false;
    const el = this.scrollContainer.nativeElement;
    return el.scrollHeight - el.scrollTop <= el.clientHeight + 10;
  }

  private scrollToBottom() {
    if (!this.scrollContainer) return;
    const el = this.scrollContainer.nativeElement;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }

  isMyMessage(msg: OtoMessage): boolean {
    return msg.sender?.trim().toLowerCase() === this.currentUserNickName.trim().toLowerCase();
  }

  isMessageDeleted(msg: OtoMessage): boolean {
    return msg.isDeleted === true;
  }

  getMessageContent(msg: OtoMessage): string {
    if (msg.isDeleted) return msg.content;
    if (msg.isDeleted) return 'This message was deleted';
    return msg.content;
  }

  clearMessagesForDeletedUser(): void {
    this.messages = [];
    this.skip = 0;
    this.allLoaded = false;
  }
}