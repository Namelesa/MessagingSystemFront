import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, OnChanges, SimpleChanges, AfterViewInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Observable, Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { OtoMessage } from '../../../entities/oto-message';
import { isToday, truncateText, computeContextMenuPosition } from '../../../shared/chat';
import { FileUploadApiService, FileUrl } from '../../../features/file-sender';
import { ImageViewerComponent, ImageViewerItem } from '../../../shared/image-viewer';
import { CustomAudioPlayerComponent } from '../../../shared/custom-player';

@Component({
  selector: 'widgets-oto-chat-messages',
  standalone: true,
  imports: [CommonModule, ImageViewerComponent, CustomAudioPlayerComponent, TranslateModule],
  templateUrl: './oto-chat-messages.widget.html',
  changeDetection: ChangeDetectionStrategy.OnPush
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
  f: any;

  constructor(
    private fileUploadApi: FileUploadApiService,
    public cdr: ChangeDetectorRef
  ) {}

  public messages: OtoMessage[] = [];
  take = 20;
  skip = 0;
  allLoaded = false;
  loading = false;
  private prevScrollHeight = 0;
  contextMenuMessageId: string | null = null;
  contextMenuPosition = { x: 0, y: 0 };
  showContextMenu = false;
  highlightedMessageId: string | null = null;
  
  private messageContentCache = new Map<string, string>();

  // Can be shared
  isMessageHighlighted(id: string): boolean {
    return this.highlightedMessageId === id;
  }

  // Can be shared
  private highlightMessage(messageId: string) {
    this.highlightedMessageId = null;
    this.highlightedMessageId = messageId;
    setTimeout(() => {
      if (this.highlightedMessageId === messageId) this.highlightedMessageId = null;
    }, 1500);
  }
  
  // Can be abstracted
  parseContent(msg: OtoMessage): { text: string; files: any[] } {
    const currentContent = msg.content;
    const messageId = msg.messageId;
    
    const lastUpdated = (msg as any).lastUpdated;
    const cachedContent = this.messageContentCache.get(messageId);
    const hasCachedResult = !!(msg as any).parsedContent;
  
    const hasTemporaryChanges = (msg as any)._hasTemporaryChanges;
    const forceRerender = (msg as any)._forceRerender;
    const contentUpdated = (msg as any)._contentUpdated;
    
    const shouldReparse = lastUpdated || 
                         cachedContent !== currentContent || 
                         !hasCachedResult ||
                         hasTemporaryChanges ||
                         forceRerender ||
                         contentUpdated ||
                         (msg as any).forceRefresh;
    
    if (shouldReparse) {      
      delete (msg as any).parsedContent;
      delete (msg as any).forceRefresh;
      delete (msg as any)._forceRerender;
      delete (msg as any)._contentUpdated;
      this.messageContentCache.delete(messageId);
      this.messageContentCache.set(messageId, currentContent);
      
      let result: { text: string; files: any[] };
  
      try {
        const parsed = JSON.parse(currentContent);
        
        if (typeof parsed === 'object' && parsed !== null && (parsed.hasOwnProperty('text') || parsed.hasOwnProperty('files'))) {
          const filesWithType = (parsed.files || []).map((file: any, index: number) => {
            if (!file.type && file.fileName) {
              file.type = this.detectFileType(file.fileName);
            }
            if (!file.uniqueId) {
              file.uniqueId = file.uniqueFileName || file.url || `${file.fileName}_${Date.now()}_${index}`;
            }
            
            if (file._isTemporary || file._isNew) {
              file._refreshKey = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 15)}`;
              file._tempKey = `temporary_${index}_${Date.now()}`;
            } else {
              file._refreshKey = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }
            
            if (file._forceUpdate) {
              file._refreshKey = `force_${file._forceUpdate}_${Math.random().toString(36).substr(2, 9)}`;
            }
            
            if (file._typeChanged) {
              file._typeKey = `type_changed_${Date.now()}`;
            }

            if (file.type?.startsWith('video/') && file._videoRefreshKey) {
              file._refreshKey = `video_${file._videoRefreshKey}_${Math.random().toString(36).substr(2, 9)}`;
            }
            
            return file;
          });
  
          result = {
            text: parsed.text || '',
            files: filesWithType
          };
        } else {
          result = { 
            text: currentContent, 
            files: [] 
          };
        }
      } catch (error) {

        if (currentContent && typeof currentContent === 'string') {
          const detectedType = this.detectFileType(currentContent);
          if (detectedType) {
            result = {
              text: '',
              files: [{
                url: currentContent,
                fileName: currentContent.split('/').pop() || 'file',
                type: detectedType,
                uniqueId: `${currentContent}_${Date.now()}`,
                _refreshKey: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
              }]
            };
          } else {
            result = { 
              text: currentContent, 
              files: [] 
            };
          }
        } else {
          result = { 
            text: currentContent || '', 
            files: [] 
          };
        }
      }
  
      (msg as any).parsedContent = result;
      
      delete (msg as any).lastUpdated;
      delete (msg as any)._hasTemporaryChanges;
      
      return result;
    }
  
    return (msg as any).parsedContent;
  }  

  // Can be shared
  getFileSize(file: any): string {
    return file.size ? this.formatFileSize(file.size) : 'Unknown size';
  }

  // Can be shared
  getFileExtension(fileName: string): string {
    if (!fileName) return 'File';
    const extension = fileName.split('.').pop()?.toUpperCase();
    return extension || 'File';
  }

  // Can be shared
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  // Can be shared
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

  // Can be shared
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

  // Can be shared
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

  // Can be shared
  onImageViewerClosed() {
    this.showImageViewer = false;
    this.imageViewerImages = [];
    this.imageViewerInitialIndex = 0;
    this.imageViewerKey = 0; 
  }

  // Can be shared
  onScrollToReplyMessage(messageId: string) {
    this.scrollToMessage(messageId);
  }

  private destroy$ = new Subject<void>();
  private shouldScrollToBottom = false;
  private hideContextMenuHandler?: () => void;

  // Can be abstracted
  ngAfterViewInit() {
    const hideContextMenu = () => (this.showContextMenu = false);
    document.addEventListener('click', hideContextMenu);
    this.hideContextMenuHandler = hideContextMenu;
    this.subscribeToUserDeletion();
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }
  
  // Can be abstracted or shared
  ngOnChanges(changes: SimpleChanges) {
    if (changes['chatNickName'] && this.chatNickName) {
      this.initChat();
    }
    
    if (changes['messages$'] && this.messages$) {
      this.messages$.pipe(takeUntil(this.destroy$)).subscribe(messages => {
        const previousMessages = this.messages;
        
        this.messages = messages;
        
        this.clearCacheForUpdatedMessages(previousMessages, messages);
        
        if (!previousMessages || previousMessages.length === 0) {
          this.initChat();
        } else {
          const newMessages = messages.filter(msg => 
            !previousMessages.some(prevMsg => prevMsg.messageId === msg.messageId)
          );
          
          const updatedMessages = messages.filter(msg => {
            const prevMsg = previousMessages.find(prevMsg => prevMsg.messageId === msg.messageId);
            return prevMsg && prevMsg.content !== msg.content;
          });
          
          
          if (newMessages.length > 0 || updatedMessages.length > 0) {
            const messagesNeedingFiles = [...newMessages, ...updatedMessages].filter(msg => {
              try {
                const parsed = JSON.parse(msg.content);
                return parsed.files && parsed.files.length > 0 && 
                       parsed.files.some((file: any) => !file.url);
              } catch {
                return false;
              }
            });
            
            if (messagesNeedingFiles.length > 0) {
              this.loadFilesForMessages(messagesNeedingFiles);
            }
            
            this.cdr.markForCheck();
            setTimeout(() => this.cdr.detectChanges(), 0);
          }
        }
      });
    }
  }

  // Can be abstracted
  private clearCacheForUpdatedMessages(previousMessages: OtoMessage[], currentMessages: OtoMessage[]) {
    if (!previousMessages) return;
    
    const prevMap = new Map(previousMessages.map(msg => [msg.messageId, msg.content]));
    
    currentMessages.forEach(currentMsg => {
      const prevContent = prevMap.get(currentMsg.messageId);
      
      if (!prevContent || prevContent !== currentMsg.content) {
        delete (currentMsg as any).parsedContent;
        (currentMsg as any).forceRefresh = true;
        this.messageContentCache.delete(currentMsg.messageId);
        this.messageContentCache.set(currentMsg.messageId, currentMsg.content);
        
      }
    });
    
    this.cdr.markForCheck();
    this.cdr.detectChanges();

    setTimeout(() => {
      this.cdr.detectChanges();
    }, 50); 
  }

  // Can be abstracted
  public clearMessageCache(messageId: string): void {    
    this.messageContentCache.delete(messageId);
    
    const message = this.messages.find(m => m.messageId === messageId);
    if (message) {
      delete (message as any).parsedContent;
      delete (message as any).parsedFiles;
      (message as any)._cacheCleared = Date.now();
    }
    
    this.cdr.detectChanges();
  }

  // Can be shared
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.hideContextMenuHandler) {
      document.removeEventListener('click', this.hideContextMenuHandler);
    }
    this.messageContentCache.clear();
  }

  // Can be abstracted or shared
  async addFileToMessage(messageId: string, fileData: { fileName: string; uniqueFileName: string; url: string; type?: string }) {
    const message = this.messages.find(m => m.messageId === messageId);
    if (!message) {
      return;
    }

    try {
      const parsed = JSON.parse(message.content);
      if (!parsed.files) {
        parsed.files = [];
      }
      
      const newFile = {
        fileName: fileData.fileName,
        uniqueFileName: fileData.uniqueFileName,
        url: fileData.url,
        type: fileData.type || this.detectFileType(fileData.fileName),
        uniqueId: fileData.uniqueFileName || `${fileData.fileName}_${Date.now()}`
      };
      
      parsed.files.push(newFile);
      
      message.content = JSON.stringify(parsed);
      delete (message as any).parsedContent;
      this.messageContentCache.set(messageId, message.content);

      this.cdr.detectChanges();
      
    } catch (error) {
    }
  }

  // Can be abstracted or shared
  async removeFileFromMessage(messageId: string, uniqueFileName: string) {
    const message = this.messages.find(m => m.messageId === messageId);
    if (!message) return;

    try {
      const parsed = JSON.parse(message.content);
      if (parsed.files) {
        const fileIndex = parsed.files.findIndex((file: any) => 
          file.uniqueFileName === uniqueFileName || file.uniqueId === uniqueFileName
        );
        if (fileIndex !== -1) {
          const removedFile = parsed.files.splice(fileIndex, 1)[0];
          message.content = JSON.stringify(parsed);
          delete (message as any).parsedContent;
          this.messageContentCache.set(messageId, message.content);
          
          this.cdr.detectChanges();
        }
      }
    } catch (error) {
    }
  }

  // Can be abstracted or shared
  trackByFileWithRefresh(index: number, file: any): string {
    const baseKey = file.uniqueId || file.uniqueFileName || file.url || `file_${index}`;
    const refreshKey = file._refreshKey || Date.now();
    const typeKey = file.type || 'unknown';
    const sizeKey = file.size || 0;
    const nameKey = file.fileName || 'unknown';
    const forceUpdateKey = file._forceUpdate || '';
    const typeChangeKey = file._typeKey || '';
    const tempKey = file._tempKey || '';
    const videoRefreshKey = file._videoRefreshKey || '';
    const isTemporary = file._isTemporary ? 'temp' : 'perm';
    const isNew = file._isNew ? 'new' : 'existing';
    const replacementKey = file._replacementKey || '';
    
    return `${baseKey}_${refreshKey}_${typeKey}_${sizeKey}_${nameKey}_${index}_${forceUpdateKey}_${typeChangeKey}_${tempKey}_${videoRefreshKey}_${isTemporary}_${isNew}_${replacementKey}`;
  }

  // Can be abstracted or shared
  public fullMessageRerender(messageId: string): void {    
    const message = this.messages.find(m => m.messageId === messageId);
    if (!message) {
      return;
    }
    
    delete (message as any).parsedContent;
    this.messageContentCache.delete(messageId);
    
    (message as any).forceRefresh = true;
    (message as any).lastUpdated = Date.now();
    (message as any).rerenderKey = Date.now();
    (message as any)._forceRerender = Date.now();

    try {
      const parsed = JSON.parse(message.content);
      if (parsed.files) {
        parsed.files.forEach((file: any) => {
          file._refreshKey = `rerender_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          if (file.type?.startsWith('video/')) {
            file._videoRefreshKey = Date.now();
          }
          
          if (file.type?.startsWith('image/')) {
            file._imageRefreshKey = Date.now();
          }
        });
        
        message.content = JSON.stringify(parsed);
      }
    } catch (e) {
    }

    this.cdr.markForCheck();
    this.cdr.detectChanges();
    
    setTimeout(() => this.cdr.detectChanges(), 0);
    setTimeout(() => this.cdr.detectChanges(), 50);
    setTimeout(() => this.cdr.detectChanges(), 100);
  }  
  
  // Can be abstracted or shared
  trackByMessage(index: number, message: OtoMessage): string {
    return message.messageId;
  }

  // Can be abstracted or shared
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

  // Can be abstracted or shared
  trackByGroup(index: number, group: { date: string; messages: OtoMessage[] }): string {
    return group.date;
  }

  // Can be abstracted or shared
  trackByMessageId(index: number, msg: OtoMessage): string {
    return msg.messageId;
  }

  isToday = isToday;
  truncateText = truncateText;

  // Can be abstracted or shared
  onScroll() {
    if (this.showContextMenu) this.showContextMenu = false;
    if (!this.scrollContainer) return;
    const el = this.scrollContainer.nativeElement;
    if (el.scrollTop < 300 && !this.loading && !this.allLoaded) {
      this.prevScrollHeight = el.scrollHeight;
      this.loadMore();
    }
  }

  // Can be abstracted or shared
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

  // Can be abstracted or shared
  getRepliedMessage(messageId: string): OtoMessage {
    return this.messages.find(m => m.messageId === messageId) || undefined as any;
  }

  // Can be abstracted or shared
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

  // Can be abstracted or shared
  onEditMessage() {
    const msg = this.messages.find(m => m.messageId === this.contextMenuMessageId);
    if (msg) this.editMessage.emit(msg);
    this.showContextMenu = false;
  }

  // Can be abstracted or shared
  onDeleteMessage() {
    const msg = this.messages.find(m => m.messageId === this.contextMenuMessageId);
    if (msg) this.deleteMessage.emit(msg);
    this.showContextMenu = false;
  }

  // Can be abstracted or shared
  onReplyToMessage() {
    const msg = this.messages.find(m => m.messageId === this.contextMenuMessageId);
    if (msg) this.replyToMessage.emit(msg);
    this.showContextMenu = false;
  }

  // Can be abstracted or shared
  canEditOrDelete(): boolean {
    const msg = this.messages.find(m => m.messageId === this.contextMenuMessageId);
    if (!msg) return false;

    if (this.isMessageDeleted(msg)) return false;
    return this.isMyMessage(msg);
  }

  // Can be abstracted or shared
  private initChat() {
    this.messages = [];
    this.skip = 0;
    this.allLoaded = false;
    this.shouldScrollToBottom = true;
    this.messageContentCache.clear();
    this.loadMore();

    if (!this.messages$) return;

    this.messages$.pipe(takeUntil(this.destroy$)).subscribe((newMsgs: OtoMessage[]) => {
      const filtered = newMsgs.filter(msg => !msg.isDeleted || !this.isMyMessage(msg));
      const newMap = new Map(filtered.map(m => [m.messageId, m]));
      const oldMap = new Map(this.messages.map(m => [m.messageId, m]));
      for (const m of filtered) oldMap.set(m.messageId, m);
      for (const id of Array.from(oldMap.keys())) if (!newMap.has(id)) oldMap.delete(id);
      this.messages = Array.from(oldMap.values()).sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
      
      if (this.messages.length > 0) {
        this.loadFilesForMessages(this.messages);
      }
      
      this.skip = this.messages.length;

      if (this.isScrolledToBottom() || this.shouldScrollToBottom) {
        this.shouldScrollToBottom = true;
      }
    });
  }

  // Can be abstracted or shared
  private async loadFilesForMessages(messages: OtoMessage[]) {    
    if (!messages || messages.length === 0) {
      return;
    }
        
    try {
      const fileNames: string[] = [];
      const messageFileMap = new Map<string, { messageIndex: number, fileIndex: number, originalName: string }>();

      messages.forEach((msg, messageIndex) => {
        try {
          const parsed = JSON.parse(msg.content);
          if (parsed.files && Array.isArray(parsed.files)) {
            const uniqueFiles = parsed.files.filter((file: any, index: number, self: any[]) => 
              index === self.findIndex((f: any) => 
                f.fileName === file.fileName && f.uniqueFileName === file.uniqueFileName
              )
            );
            
            if (uniqueFiles.length !== parsed.files.length) {
              parsed.files = uniqueFiles;
              msg.content = JSON.stringify(parsed);
            }
            
            uniqueFiles.forEach((file: any, fileIndex: number) => {
              if (file.fileName) {
                fileNames.push(file.fileName);
                const uniqueKey = `${file.fileName}_${messageIndex}_${fileIndex}`;
                messageFileMap.set(uniqueKey, { messageIndex, fileIndex, originalName: file.fileName });
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
                const uniqueKey = `${fileName}_${messageIndex}_0`;
                messageFileMap.set(uniqueKey, { messageIndex, fileIndex: 0, originalName: fileName });
              }
            }
          }
        }
      });

      const fileUrls = await this.fileUploadApi.getDownloadUrls(fileNames);

      const filesByOriginalName = new Map<string, FileUrl[]>();
      fileUrls.forEach(fileUrl => {
        if (!filesByOriginalName.has(fileUrl.originalName)) {
          filesByOriginalName.set(fileUrl.originalName, []);
        }
        filesByOriginalName.get(fileUrl.originalName)!.push(fileUrl);
      });

      messageFileMap.forEach((mapping, uniqueKey) => {
        const fileName = mapping.originalName;
        const message = messages[mapping.messageIndex];
        
        let availableFiles = filesByOriginalName.get(fileName);
        
        if (!availableFiles || availableFiles.length === 0) {
          for (const [originalName, files] of filesByOriginalName.entries()) {
            if (originalName === fileName || 
                originalName.toLowerCase() === fileName.toLowerCase() ||
                this.normalizeFileName(originalName) === this.normalizeFileName(fileName)) {
              availableFiles = files;
              break;
            }
          }
        }
         
        if (availableFiles && availableFiles.length > 0) {
          let bestMatch: FileUrl;
          
          if (availableFiles.length === 1) {
            bestMatch = availableFiles[0];
          } else {
            const messageTime = new Date(message.sentAt).getTime();
            bestMatch = availableFiles.reduce((best, current) => {
              const currentTime = this.extractTimestampFromFileName(current.uniqueFileName);
              const bestTime = this.extractTimestampFromFileName(best.uniqueFileName);
              
              const currentDiff = Math.abs(currentTime - messageTime);
              const bestDiff = Math.abs(bestTime - messageTime);
              
              return currentDiff < bestDiff ? current : best;
            });
          }
          
          try {
            const parsed = JSON.parse(message.content);
            if (parsed.files && parsed.files[mapping.fileIndex]) {
              parsed.files[mapping.fileIndex].url = bestMatch.url;
              parsed.files[mapping.fileIndex].uniqueFileName = bestMatch.uniqueFileName;
              parsed.files[mapping.fileIndex].originalName = bestMatch.originalName;
              message.content = JSON.stringify(parsed);
            }
          } catch {
            if (message.content.includes(fileName)) {
              message.content = bestMatch.url;
            }
          }
        } else {
        }
      });

      messages.forEach(msg => {
        delete (msg as any).parsedContent;
        this.messageContentCache.set(msg.messageId, msg.content);
      });
      
      this.cdr.detectChanges();
    } catch (error) {
    }
  }

  // Can be abstracted or shared
  private extractTimestampFromFileName(fileName: string): number {
    try {
      const parts = fileName.split('_');
      if (parts.length >= 2) {
        const timestamp = parseInt(parts[0]);
        if (!isNaN(timestamp)) {
          return timestamp;
        }
      }
      return Date.now();
    } catch {
      return Date.now();
    }
  }

  // Can be abstracted or shared
  private normalizeFileName(fileName: string): string {
    try {
      return fileName.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch {
      return fileName.toLowerCase().trim();
    }
  }

  // Can be abstracted or shared
  private subscribeToUserDeletion() {
    const global$ = this.userInfoDeleted$;
    if (global$) {
      global$
        .pipe(takeUntil(this.destroy$), filter((info: any) => info?.userName === this.chatNickName))
        .subscribe(() => this.handleChatUserDeleted());
    }
  }

  // Can be abstracted or shared
  private handleChatUserDeleted() {
    this.messages = [];
    this.messageContentCache.clear();
    this.chatUserDeleted.emit();
  }

  // Can be abstracted or shared
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
        if (newMsgs.length === 0) {
          this.allLoaded = true;
        } else {
          const filtered = newMsgs.filter(m => !m.isDeleted || !this.isMyMessage(m));
          const existingIds = new Set(this.messages.map(m => m.messageId));
          const unique = filtered.filter(m => !existingIds.has(m.messageId));
        
          if (unique.length > 0) {
            this.messages = [...unique, ...this.messages];
            this.skip += unique.length;
        
            this.loadFilesForMessages(unique);
        
            if (!this.shouldScrollToBottom) {
              setTimeout(() => {
                const el = this.scrollContainer.nativeElement;
                el.scrollTop = el.scrollHeight - this.prevScrollHeight;
              }, 0);
            }
          }
        }

        this.loading = false;
      });
  }

  // Can be abstracted or shared
  private isScrolledToBottom(): boolean {
    if (!this.scrollContainer) return false;
    const el = this.scrollContainer.nativeElement;
    return el.scrollHeight - el.scrollTop <= el.clientHeight + 10;
  }

  // Can be abstracted or shared
  private scrollToBottom() {
    if (!this.scrollContainer) return;
    const el = this.scrollContainer.nativeElement;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }

  // Can be abstracted or shared
  isMyMessage(msg: OtoMessage): boolean {
    return msg.sender?.trim().toLowerCase() === this.currentUserNickName.trim().toLowerCase();
  }

  // Can be abstracted or shared
  isMessageDeleted(msg: OtoMessage): boolean {
    return msg.isDeleted === true;
  }

  // Can be abstracted or shared
  getMessageContent(msg: OtoMessage): string {
    if (msg.isDeleted) return msg.content;
    if (msg.isDeleted) return 'This message was deleted';
    return msg.content;
  }

  // Can be abstracted or shared
  clearMessagesForDeletedUser(): void {
    this.messages = [];
    this.skip = 0;
    this.allLoaded = false;
    this.messageContentCache.clear();
  }

  // Can be abstracted or shared
  private scheduleMappingCheck(messages: OtoMessage[], fileNames: string[], messageFileMap: Map<string, { messageIndex: number, fileIndex: number, originalName: string }>) {
    
    let checkCount = 0;
    const maxChecks = 6;
    const checkInterval = 5000;
    
    const checkTimer = setInterval(async () => {
      try {
        checkCount++;
        
        const batchMappings = await this.fileUploadApi.getBatchFileMappings(fileNames);
        
        if (batchMappings.mappings && batchMappings.mappings.length > 0) {
          clearInterval(checkTimer);
          await this.loadFilesWithNewSystem(messages, fileNames, messageFileMap);
        } else if (checkCount >= maxChecks) {
          clearInterval(checkTimer);
        }
      } catch (error) {
        if (checkCount >= maxChecks) {
          clearInterval(checkTimer);
        }
      }
    }, checkInterval);
  }

  // Can be abstracted or shared
  private async loadFilesWithNewSystem(messages: OtoMessage[], fileNames: string[], messageFileMap: Map<string, { messageIndex: number, fileIndex: number, originalName: string }>) {
    try {
      
      let fileUrls: any[] = [];
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          fileUrls = await this.fileUploadApi.getDownloadUrls(fileNames);
          
          if (fileUrls && fileUrls.length > 0) {
            break;
          }
          
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          retryCount++;
          if (retryCount < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      if (fileUrls && fileUrls.length > 0) {
        fileUrls.forEach(fileUrl => {
          const mapping = messageFileMap.get(fileUrl.originalName);
          if (mapping) {
            const message = messages[mapping.messageIndex];
            try {
              const parsed = JSON.parse(message.content);
              if (parsed.files && parsed.files[mapping.fileIndex]) {
                parsed.files[mapping.fileIndex].url = fileUrl.url;
                parsed.files[mapping.fileIndex].uniqueFileName = fileUrl.uniqueFileName;
                parsed.files[mapping.fileIndex].version = fileUrl.version || 1;
                parsed.files[mapping.fileIndex].displayName = `${fileUrl.originalName} (v${fileUrl.version || 1})`;
                parsed.files[mapping.fileIndex].originalName = fileUrl.originalName;
                message.content = JSON.stringify(parsed);
              }
            } catch (parseError) {
              if (message.content.includes(fileUrl.originalName)) {
                message.content = fileUrl.url;
              }
            }
          }
        });
        
        messages.forEach(msg => {
          delete (msg as any).parsedContent;
          this.messageContentCache.set(msg.messageId, msg.content);
        });
        
        this.cdr.detectChanges();
        
      } else {
        this.scheduleMappingCheck(messages, fileNames, messageFileMap);
      }
      
    } catch (error) {
      this.scheduleMappingCheck(messages, fileNames, messageFileMap);
    }
  }

  // Can be abstracted or shared
  public forceMessageRefresh(messageId: string, newMessage?: OtoMessage): void {    
    this.messageContentCache.delete(messageId);
    
    const messageIndex = this.messages.findIndex(m => m.messageId === messageId);
    if (messageIndex !== -1) {
      if (newMessage) {
        this.messages[messageIndex] = { ...newMessage };
      }
      const message = this.messages[messageIndex];
      delete (message as any).parsedContent;
      (message as any).forceRefresh = true;
      (message as any).lastUpdated = Date.now();
      this.parseContent(message);
    }

    this.cdr.markForCheck();
    this.cdr.detectChanges();

    setTimeout(() => {
      this.cdr.detectChanges();
    }, 10);
    
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 100);
  }

  // Can be abstracted or shared
  public forceFileRefresh(messageId: string, fileUniqueId: string): void {
    const message = this.messages.find(m => m.messageId === messageId);
    if (!message) return;
    
    try {
      const parsed = JSON.parse(message.content);
      if (parsed.files) {
        const fileIndex = parsed.files.findIndex((f: any) => 
          f.uniqueId === fileUniqueId || f.uniqueFileName === fileUniqueId
        );
        
        if (fileIndex >= 0) {
          const file = parsed.files[fileIndex];
          file._refreshKey = `file_refresh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          file._forceUpdate = Date.now();
          
          if (file.type?.startsWith('video/')) {
            file._videoRefreshKey = Date.now();
          }
          
          message.content = JSON.stringify(parsed);
          delete (message as any).parsedContent;
          this.messageContentCache.delete(messageId);
        }
      }
    } catch (e) {
    }
    
    this.cdr.detectChanges();
  }

  // Can be abstracted or shared
  getMediaFiles(files: any[]): any[] {
    if (!files) return [];
    return files.filter(file => 
      file.type?.startsWith('image/') || file.type?.startsWith('video/')
    );
  }
  
  // Can be abstracted or shared
  getOriginalFileIndex(allFiles: any[], targetFile: any): number {
    return allFiles.findIndex(file => 
      file.uniqueId === targetFile.uniqueId || 
      file.url === targetFile.url || 
      file.fileName === targetFile.fileName
    );
  }
}