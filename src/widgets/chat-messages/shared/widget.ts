import { Directive, Input, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { FileUploadApiService, FileUrl } from '../../../features/file-sender';
import { ImageViewerItem } from '../../../shared/image-viewer';

export interface BaseMessage {
  id?: string;
  messageId?: string;
  sender: string;
  isDeleted?: boolean;
  sendTime?: string | Date;
  sentAt?: string | Date;
  content: string;
}

export interface ParsedContent {
  text: string;
  files: any[];
}

@Directive()
export abstract class BaseChatMessagesWidget<TMessage extends BaseMessage> {
  @Input() currentUserNickName!: string;
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  highlightedMessageId: string | null = null;
  showContextMenu = false;
  contextMenuMessageId: string | null = null;
  contextMenuPosition = { x: 0, y: 0 };
  
  showImageViewer = false;
  imageViewerImages: ImageViewerItem[] = [];
  imageViewerInitialIndex = 0;
  imageViewerKey = 0;

  allLoaded = false;
  loading = false;
  
  take = 20;
  skip = 0;

  protected prevScrollHeight = 0;
  protected destroy$ = new Subject<void>();
  protected shouldScrollToBottom = false;
  protected hideContextMenuHandler?: () => void;
  protected messageContentCache = new Map<string, string>();
  
  protected urlCache = new Map<string, { url: string; timestamp: number }>();
  protected readonly URL_EXPIRATION_TIME = 10 * 60 * 1000;
  protected refreshingUrls = new Set<string>();

  abstract messages: TMessage[];

  constructor(
    protected cdr: ChangeDetectorRef,
    protected fileUploadApi: FileUploadApiService
  ) {}

  protected abstract loadMore(): void;
  protected abstract initChat(): void;
  
  protected abstract getMessageIdFromMessage(msg: TMessage): string;

  protected setupContextMenuListener() {
    const hideContextMenu = () => (this.showContextMenu = false);
    document.addEventListener('click', hideContextMenu);
    this.hideContextMenuHandler = hideContextMenu;
  }

  protected cleanupContextMenuListener() {
    if (this.hideContextMenuHandler) {
      document.removeEventListener('click', this.hideContextMenuHandler);
    }
  }

  protected baseDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.cleanupContextMenuListener();
    this.messageContentCache.clear();
    this.urlCache.clear();
    this.refreshingUrls.clear();
  }

  isMessageHighlightedBase(id: string): boolean {
    return this.highlightedMessageId === id;
  }

  protected highlightMessageBase(messageId: string) {
    this.highlightedMessageId = null;
    this.highlightedMessageId = messageId;
    setTimeout(() => {
      if (this.highlightedMessageId === messageId) {
        this.highlightedMessageId = null;
      }
    }, 1500);
  }

  onScrollBase(scrollContainer?: ElementRef<HTMLDivElement>) {
    if (this.showContextMenu) this.showContextMenu = false;
  
    const container = scrollContainer || this.scrollContainer;
    if (!container) return;
  
    const el = container.nativeElement;

    if (el.scrollTop < 300 && !this.loading && !this.allLoaded) {
      this.prevScrollHeight = el.scrollHeight;
      this.loadMore();
    }
  }

  protected isScrolledToBottomBase(scrollContainer?: ElementRef<HTMLDivElement>): boolean {
    const container = scrollContainer || this.scrollContainer;
    if (!container) return false;

    const el = container.nativeElement;
    return el.scrollHeight - el.scrollTop <= el.clientHeight + 10;
  }

  protected scrollToBottomBase(scrollContainer?: ElementRef<HTMLDivElement>) {
    const container = scrollContainer || this.scrollContainer;
    if (!container) return;

    const el = container.nativeElement;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }

  protected scrollToMessageBase(messageId: string, scrollContainer?: ElementRef<HTMLDivElement>) {
    const container = scrollContainer || this.scrollContainer;
    if (!container) return;

    const el = container.nativeElement.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement;

    if (!el) {
      setTimeout(() => {
        const retry = container.nativeElement.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement;
        if (retry) {
          retry.scrollIntoView({ behavior: 'smooth', block: 'center' });
          this.highlightMessageBase(messageId);
        }
      }, 1000);
      return;
    }

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => this.highlightMessageBase(messageId), 300);
  }

  isMyMessageBase(msg: TMessage): boolean {
    return msg.sender?.trim().toLowerCase() === this.currentUserNickName?.trim().toLowerCase();
  }

  isMessageDeletedBase(msg: TMessage): boolean {
    return msg.isDeleted === true;
  }

  getMessageContentBase(msg: TMessage): string {
    if (msg.isDeleted) return 'This message was deleted';
    return msg.content;
  }

  shouldShowSenderNameBase(messages: TMessage[], idx: number): boolean {
    if (idx === 0) return true;
    return messages[idx].sender !== messages[idx - 1].sender;
  }

  protected canEditOrDeleteBase(messages: TMessage[]): boolean {
    const msg = messages.find(m => {
      const msgId = this.getMessageIdFromMessage(m);
      return msgId === this.contextMenuMessageId;
    });

    if (!msg) return false;
    if (this.isMessageDeletedBase(msg)) return false;
    return this.isMyMessageBase(msg);
  }

  protected groupMessagesByDate(
    messages: TMessage[],
    getTimeField: (msg: TMessage) => string | Date
  ): { date: string; messages: TMessage[] }[] {
    const groups: { date: string; messages: TMessage[] }[] = [];
    let lastDate = '';

    const filtered = messages.filter(m => !m.isDeleted || this.isMyMessageBase(m));
    const sorted = [...filtered].sort((a, b) => {
      const timeA = getTimeField(a);
      const timeB = getTimeField(b);
      return new Date(timeA).getTime() - new Date(timeB).getTime();
    });

    for (const msg of sorted) {
      const timeValue = getTimeField(msg);
      const d = new Date(timeValue).toDateString();
      if (d !== lastDate) {
        groups.push({ date: d, messages: [msg] });
        lastDate = d;
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }

    return groups;
  }

  trackByGroupBase = (_: number, group: { date: string; messages: TMessage[] }) => group.date;
  
  trackByMessageBase = (_: number, msg: TMessage) => this.getMessageIdFromMessage(msg);

  protected detectFileType(fileNameOrUrl: string): string | null {
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

  protected formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  getFileSize(file: any): string {
    return file.size ? this.formatFileSize(file.size) : 'Unknown size';
  }

  getFileExtension(fileName: string): string {
    if (!fileName) return 'File';
    const extension = fileName.split('.').pop()?.toUpperCase();
    return extension || 'File';
  }

  getMediaFiles(files: any[]): any[] {
    if (!files) return [];
    return files.filter(file =>
      file.type?.startsWith('image/') ||
      file.type?.startsWith('video/') ||
      file.type?.startsWith('audio/')
    );
  }

  getOriginalFileIndex(allFiles: any[], targetFile: any): number {
    return allFiles.findIndex(file =>
      file.uniqueId === targetFile.uniqueId ||
      file.url === targetFile.url ||
      file.fileName === targetFile.fileName
    );
  }

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

  protected extractTimestampFromFileName(fileName: string): number {
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

  protected normalizeFileName(fileName: string): string {
    try {
      return fileName.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch {
      return fileName.toLowerCase().trim();
    }
  }

  protected isUrlExpired(timestamp: number): boolean {
    const age = Date.now() - timestamp;
    const expired = age > this.URL_EXPIRATION_TIME;
        
    return expired;
  }

  protected isUrlAboutToExpire(timestamp: number): boolean {
    const age = Date.now() - timestamp;
    const threshold = 8 * 60 * 1000; 
    return age > threshold;
  }

  protected async refreshFileUrl(fileName: string, uniqueFileName: string): Promise<string | null> {
    const cacheKey = uniqueFileName || fileName;
  
    if (this.refreshingUrls.has(cacheKey)) {
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (!this.refreshingUrls.has(cacheKey)) {
            clearInterval(checkInterval);
            const cached = this.urlCache.get(cacheKey);
            resolve(cached?.url || null);
          }
        }, 100);

        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(null);
        }, 10000);
      });
    }
  
    this.refreshingUrls.add(cacheKey);
  
    try {
      const urls = await this.fileUploadApi.getDownloadUrls([fileName]);
      if (urls && urls.length > 0 && urls[0].url) {
        const newUrl = urls[0].url;
        this.urlCache.set(cacheKey, {
          url: newUrl,
          timestamp: Date.now()
        });
        
        return newUrl;
      } else {
      }
    } catch (error) {
    } finally {
      this.refreshingUrls.delete(cacheKey);
    }
  
    return null;
  }

  protected clearCacheForUpdatedMessages(
    previousMessages: TMessage[],
    currentMessages: TMessage[],
    cdr: ChangeDetectorRef
  ) {
    if (!previousMessages) return;

    const prevMap = new Map(previousMessages.map(msg => [
      this.getMessageIdFromMessage(msg),
      msg.content
    ]));

    currentMessages.forEach(currentMsg => {
      const msgId = this.getMessageIdFromMessage(currentMsg);
      const prevContent = prevMap.get(msgId);

      if (!prevContent || prevContent !== currentMsg.content) {
        delete (currentMsg as any).parsedContent;
        (currentMsg as any).forceRefresh = true;
        this.messageContentCache.delete(msgId);
        this.messageContentCache.set(msgId, currentMsg.content);
      }
    });

    cdr.markForCheck();
    cdr.detectChanges();
    setTimeout(() => cdr.detectChanges(), 50);
  }

  clearMessageCache(messageId: string, messages: TMessage[], cdr: ChangeDetectorRef): void {
    this.messageContentCache.delete(messageId);

    const message = messages.find(m => this.getMessageIdFromMessage(m) === messageId);
    if (message) {
      delete (message as any).parsedContent;
      delete (message as any).parsedFiles;
      (message as any)._cacheCleared = Date.now();
    }

    cdr.detectChanges();
  }

  async addFileToMessageBase(
    messageId: string,
    messages: TMessage[],
    fileData: { fileName: string; uniqueFileName: string; url: string; type?: string },
    cdr: ChangeDetectorRef
  ) {
    const message = messages.find(m => this.getMessageIdFromMessage(m) === messageId);
    if (!message) return;

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

      cdr.detectChanges();
    } catch (error) {
    }
  }

  async removeFileFromMessageBase(
    messageId: string,
    messages: TMessage[],
    uniqueFileName: string,
    cdr: ChangeDetectorRef
  ) {
    const message = messages.find(m => this.getMessageIdFromMessage(m) === messageId);
    if (!message) return;

    try {
      const parsed = JSON.parse(message.content);
      if (parsed.files) {
        const fileIndex = parsed.files.findIndex((file: any) =>
          file.uniqueFileName === uniqueFileName || file.uniqueId === uniqueFileName
        );

        if (fileIndex !== -1) {
          parsed.files.splice(fileIndex, 1);
          message.content = JSON.stringify(parsed);

          delete (message as any).parsedContent;
          this.messageContentCache.set(messageId, message.content);

          cdr.detectChanges();
        }
      }
    } catch (error) {
    }
  }

  fullMessageRerenderBase(messageId: string, messages: TMessage[], cdr: ChangeDetectorRef): void {
    const message = messages.find(m => this.getMessageIdFromMessage(m) === messageId);
    if (!message) return;

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
    } catch (e) {}

    cdr.markForCheck();
    cdr.detectChanges();
    setTimeout(() => cdr.detectChanges(), 0);
    setTimeout(() => cdr.detectChanges(), 50);
    setTimeout(() => cdr.detectChanges(), 100);
  }

  forceMessageRefreshBase(
    messageId: string,
    messages: TMessage[],
    parseContentFn: (msg: TMessage) => any,
    newMessage: TMessage | undefined,
    cdr: ChangeDetectorRef
  ): void {
    this.messageContentCache.delete(messageId);

    const messageIndex = messages.findIndex(m => this.getMessageIdFromMessage(m) === messageId);
    if (messageIndex !== -1) {
      if (newMessage) {
        messages[messageIndex] = { ...newMessage };
      }

      const message = messages[messageIndex];
      delete (message as any).parsedContent;
      (message as any).forceRefresh = true;
      (message as any).lastUpdated = Date.now();

      parseContentFn(message);
    }

    cdr.markForCheck();
    cdr.detectChanges();
    setTimeout(() => cdr.detectChanges(), 10);
    setTimeout(() => cdr.detectChanges(), 100);
  }

  forceFileRefreshBase(messageId: string, messages: TMessage[], fileUniqueId: string, cdr: ChangeDetectorRef): void {
    const message = messages.find(m => this.getMessageIdFromMessage(m) === messageId);
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
    } catch (e) {}

    cdr.detectChanges();
  }

  protected openFileViewerBase(
    fileIndex: number, 
    messageId: string, 
    messages: TMessage[],
    parseContentFn: (msg: TMessage) => ParsedContent,
    getSenderFn: (msg: TMessage) => string
  ) {
    const sourceMessage = messages.find(msg => this.getMessageIdFromMessage(msg) === messageId);
    if (!sourceMessage) return;

    const sourceContent = parseContentFn(sourceMessage);
    const allFiles = sourceContent.files;

    if (!allFiles[fileIndex]) return;

    const mediaFiles = this.getMediaFiles(allFiles);
    const mediaIndex = this.getOriginalFileIndex(mediaFiles, allFiles[fileIndex]);

    if (mediaIndex === -1) return;

    this.imageViewerImages = mediaFiles.map(file => ({
      url: file.url,
      fileName: file.fileName,
      type: file.type,
      messageId: messageId,
      sender: getSenderFn(sourceMessage)
    }));

    this.imageViewerInitialIndex = mediaIndex;
    this.imageViewerKey++;
    this.showImageViewer = true;
  }

  onImageViewerClosedBase() {
    this.showImageViewer = false;
    this.imageViewerImages = [];
    this.imageViewerInitialIndex = 0;
    this.imageViewerKey = 0;
  }

  protected async loadFilesForMessagesBase(messages: TMessage[]) {
    const fileNames: string[] = [];
    const messageFileMap = new Map<string, {
      messageIndex: number;
      fileIndex: number;
      originalName: string;
      uniqueFileName?: string;
      needsRefresh?: boolean;
    }>();
  
    messages.forEach((msg, messageIndex) => {
      try {
        const parsed = JSON.parse(msg.content);
        if (parsed.files) {
          parsed.files.forEach((file: any, fileIndex: number) => {
            const cacheKey = file.uniqueFileName || file.fileName;
            const cachedUrl = this.urlCache.get(cacheKey);
            
            const urlExpired = cachedUrl && this.isUrlExpired(cachedUrl.timestamp);
            const urlAboutToExpire = cachedUrl && this.isUrlAboutToExpire(cachedUrl.timestamp);
            const notCached = file.url && !cachedUrl; 
            
            if (file.fileName && (!file.url || urlExpired || urlAboutToExpire || notCached)) {
              fileNames.push(file.fileName);
              messageFileMap.set(`${file.fileName}_${messageIndex}_${fileIndex}`, {
                messageIndex,
                fileIndex,
                originalName: file.fileName,
                uniqueFileName: file.uniqueFileName,
                needsRefresh: urlExpired || urlAboutToExpire || notCached
              });
            } else if (file.url && cachedUrl) {
            }
          });
        }
      } catch (e) {
      }
    });
  
    if (fileNames.length === 0) {
      return;
    }
  
    try {
      const fileUrls = await this.fileUploadApi.getDownloadUrls(fileNames);
      const filesByOriginalName = new Map<string, FileUrl[]>();
      fileUrls.forEach(fileUrl => {
        if (!filesByOriginalName.has(fileUrl.originalName))
          filesByOriginalName.set(fileUrl.originalName, []);
        filesByOriginalName.get(fileUrl.originalName)!.push(fileUrl);
      });
  
      let updatedCount = 0;
      
      messageFileMap.forEach((mapping, uniqueKey) => {
        const message = messages[mapping.messageIndex];
        const parsed = JSON.parse(message.content);
        const urls = filesByOriginalName.get(mapping.originalName);
  
        if (urls && urls[0]) {
          const newUrl = urls[0].url;
          parsed.files[mapping.fileIndex].url = newUrl;
          parsed.files[mapping.fileIndex].uniqueFileName = urls[0].uniqueFileName;
          message.content = JSON.stringify(parsed);
          const cacheKey = urls[0].uniqueFileName || mapping.originalName;
  
          this.urlCache.set(cacheKey, {
            url: newUrl,
            timestamp: Date.now() 
          });
          
          updatedCount++;
        } else {
          console.warn('⚠️ No URL found for:', mapping.originalName);
        }
      });
  
      messages.forEach(msg => {
        delete (msg as any).parsedContent;
        this.messageContentCache.set(this.getMessageIdFromMessage(msg), msg.content);
      });
      this.cdr.detectChanges();
      
    } catch (error) {
    }
  }

  protected scrollToBottomAfterSend() {
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.scrollToBottomBase(this.scrollContainer);
      }, 100);
    });
  }

  protected scheduleScrollToBottom() {
    this.shouldScrollToBottom = true;
    setTimeout(() => {
      if (this.shouldScrollToBottom) {
        this.scrollToBottomBase(this.scrollContainer);
        this.shouldScrollToBottom = false;
      }
    }, 0);
  }

  protected forceRefreshAllFileUrls() {
    if (!this.messages || this.messages.length === 0) return;
    const messagesWithFiles = this.messages.filter(msg => {
      try {
        const parsed = JSON.parse(msg.content);
        return parsed.files && parsed.files.length > 0;
      } catch {
        return false;
      }
    });
  
    if (messagesWithFiles.length > 0) {
      this.loadFilesForMessagesBase(messagesWithFiles);
    } else {
    }
  }
}