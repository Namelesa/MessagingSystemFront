import { Directive, Input, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Subject } from 'rxjs';
import { BaseMessage, ParsedContent, CachedParsedContent } from './widget-interface';
import { FileUploadApiService } from '../../../features/file-sender';
import { ImageViewerItem } from '../../../shared/image-viewer';

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
  protected messageContentCache = new Map<string, CachedParsedContent>();
  
  public urlCache = new Map<string, { url: string; timestamp: number }>();
  protected readonly URL_EXPIRATION_TIME = 10 * 60 * 1000;
  protected refreshingUrls = new Map<string, Promise<string | null>>();
  protected pendingUrlRefreshBatch = new Set<string>();
  protected batchRefreshTimer?: any;
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

    if (this.batchRefreshTimer) {
      clearTimeout(this.batchRefreshTimer);
    }
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
  
    const filtered = messages.filter(m => {
      if (!m.isDeleted) return true;
      if (m.isDeleted && this.isMyMessageBase(m)) return false;

      return true;
    });
  
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
    return `${file.uniqueId || file.fileName}_${file._version || 0}_${index}`;
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
      return this.refreshingUrls.get(cacheKey)!;
    }
  
    const promise = (async () => {
      try {
        const urls = await this.fileUploadApi.getDownloadUrls([fileName]);
        if (urls && urls.length > 0 && urls[0].url) {
          const newUrl = urls[0].url;
          this.urlCache.set(cacheKey, {
            url: newUrl,
            timestamp: Date.now()
          });
          return newUrl;
        }
      } catch (error) {
        console.error('Failed to refresh URL:', error);
      }
      return null;
    })();
  
    this.refreshingUrls.set(cacheKey, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      this.refreshingUrls.delete(cacheKey);
    }
  }

protected invalidateMessageCache(messageId: string): void {
  this.messageContentCache.delete(messageId);
}

protected invalidateAllCache(): void {
  this.messageContentCache.clear();
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
      this.invalidateMessageCache(msgId);
      (currentMsg as any)._version = Date.now();
    }
  });

  cdr.markForCheck();
}

  clearMessageCache(messageId: string, messages: TMessage[], cdr: ChangeDetectorRef): void {
    this.invalidateMessageCache(messageId);
    const message = messages.find(m => this.getMessageIdFromMessage(m) === messageId);
    if (message) {
      delete (message as any).parsedContent;
      delete (message as any)._cachedVersion;
    }
    cdr.markForCheck();
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
      this.invalidateMessageCache(messageId);
      cdr.markForCheck();
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
          file.uniqueFileName === uniqueFileName || 
          file.uniqueId === uniqueFileName ||
          file.fileName === uniqueFileName
        );
  
        if (fileIndex !== -1) {
          const fileToRemove = parsed.files[fileIndex];
          const cacheKeys = [
            fileToRemove.uniqueFileName,
            fileToRemove.fileName,
            fileToRemove.uniqueId,
            uniqueFileName
          ].filter(Boolean);
  
          cacheKeys.forEach(key => {
            if (this.urlCache.has(key)) {
              this.urlCache.delete(key);
            }
          });
          parsed.files.splice(fileIndex, 1);
          message.content = JSON.stringify(parsed);
          this.invalidateMessageCache(messageId);
          (message as any)._version = Date.now();
          cdr.markForCheck();
        } else {
          console.warn('File not found for removal:', uniqueFileName);
        }
      }
    } catch (error) {
      console.error('❌ Error removing file:', error);
    }
  }

  async replaceFileInMessageBase(
    messageId: string,
    messages: TMessage[],
    oldUniqueFileName: string,
    newFileData: { fileName: string; uniqueFileName: string; url: string; type?: string },
    cdr: ChangeDetectorRef
  ) {
    const message = messages.find(m => this.getMessageIdFromMessage(m) === messageId);
    if (!message) return;
    try {
      const parsed = JSON.parse(message.content);
      if (!parsed.files) return;
      const fileIndex = parsed.files.findIndex((file: any) =>
        file.uniqueFileName === oldUniqueFileName || 
        file.uniqueId === oldUniqueFileName ||
        file.fileName === oldUniqueFileName
      );
      if (fileIndex === -1) return;
  
      const oldFile = parsed.files[fileIndex];
      const oldCacheKeys = [
        oldFile.uniqueFileName,
        oldFile.fileName,
        oldFile.uniqueId
      ].filter(Boolean);
  
      oldCacheKeys.forEach(key => {
        if (this.urlCache.has(key)) {
          this.urlCache.delete(key);
        }
      });
      const newFile = {
        fileName: newFileData.fileName,
        uniqueFileName: newFileData.uniqueFileName,
        url: newFileData.url,
        type: newFileData.type || this.detectFileType(newFileData.fileName),
        uniqueId: newFileData.uniqueFileName,
        _version: Date.now()
      };
      parsed.files[fileIndex] = newFile;
      const newCacheKeys = [
        newFileData.uniqueFileName,
        newFileData.fileName
      ].filter(Boolean);
  
      newCacheKeys.forEach(key => {
        this.urlCache.set(key, {
          url: newFileData.url,
          timestamp: Date.now()
        });
      });
  
      message.content = JSON.stringify(parsed);
      this.invalidateMessageCache(messageId);
      (message as any)._version = Date.now();
      
      cdr.markForCheck();
      
    } catch (error) {
      console.error('❌ Error replacing file:', error);
    }
  }

  fullMessageRerenderBase(messageId: string, messages: TMessage[], cdr: ChangeDetectorRef): void {
    const message = messages.find(m => this.getMessageIdFromMessage(m) === messageId);
    if (!message) return;
  
    this.invalidateMessageCache(messageId);
    delete (message as any).parsedContent;
    (message as any)._version = Date.now();
  
    try {
      const parsed = JSON.parse(message.content);
      if (parsed.files) {
        parsed.files.forEach((file: any) => {
          file._version = Date.now();
        });
        message.content = JSON.stringify(parsed);
      }
    } catch (e) {
      console.error('Error in fullMessageRerender:', e);
    }
  
    cdr.markForCheck();
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
  }

  forceFileRefreshBase(messageId: string, messages: TMessage[], fileUniqueId: string, cdr: ChangeDetectorRef): void {
    const message = messages.find(m => this.getMessageIdFromMessage(m) === messageId);
    if (!message) return;
  
    try {
      const parsed = JSON.parse(message.content);
      if (parsed.files) {
        const file = parsed.files.find((f: any) =>
          f.uniqueId === fileUniqueId || f.uniqueFileName === fileUniqueId
        );
  
        if (file) {
          file._version = Date.now();
          message.content = JSON.stringify(parsed);
          this.invalidateMessageCache(messageId);
        }
      }
    } catch (e) {
      console.error('Error in forceFileRefresh:', e);
    }
  
    cdr.markForCheck();
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
    const fileRequests = new Map<string, {
      messageIdx: number;
      fileIdx: number;
      uniqueName?: string;
    }[]>();
  
    for (let i = 0; i < messages.length; i++) {
      try {
        const parsed = JSON.parse(messages[i].content);
        if (!parsed.files) continue;
  
        for (let j = 0; j < parsed.files.length; j++) {
          const file = parsed.files[j];
          const cacheKey = file.uniqueFileName || file.fileName;
          const cachedUrl = this.urlCache.get(cacheKey);
  
          const needsUpdate = !file.url || 
                             !cachedUrl || 
                             this.isUrlExpired(cachedUrl.timestamp);
  
          if (needsUpdate && file.fileName) {
            if (!fileRequests.has(file.fileName)) {
              fileRequests.set(file.fileName, []);
            }
            fileRequests.get(file.fileName)!.push({
              messageIdx: i,
              fileIdx: j,
              uniqueName: file.uniqueFileName
            });
          }
        }
      } catch {}
    }
    if (fileRequests.size === 0) return;
    try {
      const fileUrls = await this.fileUploadApi.getDownloadUrls(
        Array.from(fileRequests.keys())
      );
      const urlMap = new Map(fileUrls.map(fu => [fu.originalName, fu]));
      fileRequests.forEach((locations, fileName) => {
        const fileUrl = urlMap.get(fileName);
        if (!fileUrl) return;
  
        for (const loc of locations) {
          const msg = messages[loc.messageIdx];
          const parsed = JSON.parse(msg.content);
          
          if (parsed.files[loc.fileIdx]) {
            parsed.files[loc.fileIdx].url = fileUrl.url;
            parsed.files[loc.fileIdx].uniqueFileName = fileUrl.uniqueFileName;
            msg.content = JSON.stringify(parsed);
          }
        }
        const cacheKey = fileUrl.uniqueFileName || fileName;
        this.urlCache.set(cacheKey, { url: fileUrl.url, timestamp: Date.now() });
      });
      messages.forEach(msg => 
        this.invalidateMessageCache(this.getMessageIdFromMessage(msg))
      );
  
      this.cdr.detectChanges();
    } catch {}
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

  protected handleInitialLoadBase(
    messages: TMessage[],
    getTimeField: (msg: TMessage) => string | Date,
    scrollContainer: ElementRef<HTMLDivElement>
  ): number {
    let latestTime = 0;
  
    if (messages.length > 0) {
      const sortedMessages = [...messages].sort((a, b) => {
        const timeA = getTimeField(a);
        const timeB = getTimeField(b);
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      });
      latestTime = new Date(getTimeField(sortedMessages[0])).getTime();
    }
  
    const messagesWithFiles = messages.filter(msg => {
      try {
        const parsed = JSON.parse(msg.content);
        return parsed.files?.length > 0;
      } catch {
        return false;
      }
    });
  
    if (messagesWithFiles.length > 0) {
      this.loadFilesForMessagesBase(messagesWithFiles);
    }
  
    setTimeout(() => {
      this.scrollToBottomBase(scrollContainer);
    }, 100);
  
    return latestTime;
  }

protected handleMessagesUpdateBase(
  messages: TMessage[],
  newMsgs: TMessage[],
  deletedMsgIds: string[],
  latestMessageTime: number,
  getTimeField: (msg: TMessage) => string | Date,
  scrollContainer: ElementRef<HTMLDivElement>,
  isScrolledToBottom: () => boolean
): number {
  const oldMessagesMap = new Map(messages.map(m => [this.getMessageIdFromMessage(m), m]));
  const actuallyNewMessages = newMsgs.filter(msg => !oldMessagesMap.has(this.getMessageIdFromMessage(msg)));

  let newLatestTime = latestMessageTime;

  if (actuallyNewMessages.length > 0) {
    const realtimeNewMessages = actuallyNewMessages.filter(msg => {
      const msgTime = new Date(getTimeField(msg)).getTime();
      return msgTime > latestMessageTime;
    });

    if (realtimeNewMessages.length > 0) {
      const sortedNew = [...realtimeNewMessages].sort((a, b) => {
        const timeA = getTimeField(a);
        const timeB = getTimeField(b);
        return new Date(timeB).getTime() - new Date(timeA).getTime();
      });
      const newestTime = new Date(getTimeField(sortedNew[0])).getTime();
      if (newestTime > latestMessageTime) {
        newLatestTime = newestTime;
      }
    }

    const messagesNeedingFiles = actuallyNewMessages.filter(msg => {
      try {
        const parsed = JSON.parse(msg.content);
        return parsed.files?.length > 0;
      } catch {
        return false;
      }
    });

    if (messagesNeedingFiles.length > 0) {
      this.loadFilesForMessagesBase(messagesNeedingFiles);
    }

    if (realtimeNewMessages.length > 0) {
      const wasAtBottom = isScrolledToBottom();
      setTimeout(() => {
        if (wasAtBottom) {
          this.scrollToBottomBase(scrollContainer);
        }
      }, 100);
    }
  }

  if (deletedMsgIds.length > 0) {
    setTimeout(() => this.cdr.detectChanges(), 50);
  }

  return newLatestTime;
}

protected handleNewMessagesBase(
  currentMessages: TMessage[],
  newMsgs: TMessage[],
  latestMessageTime: number,
  getTimeField: (msg: TMessage) => string | Date,
  scrollContainer: ElementRef<HTMLDivElement>,
  isScrolledToBottom: () => boolean
): { messages: TMessage[]; latestTime: number } {
  const isInitialLoad = currentMessages.length === 0;
  const allMessagesMap = new Map<string, TMessage>();
  const deletedMsgIds: string[] = [];
  let newLatestTime = latestMessageTime;
  for (const msg of currentMessages) {
    allMessagesMap.set(this.getMessageIdFromMessage(msg), msg);
  }
  for (const msg of newMsgs) {
    const msgId = this.getMessageIdFromMessage(msg);
    const existing = allMessagesMap.get(msgId);
    if (existing) {
      if (existing.isDeleted !== msg.isDeleted && msg.isDeleted) {
        deletedMsgIds.push(msgId);
        this.invalidateMessageCache(msgId);
      } else if (existing.content !== msg.content) {
        this.invalidateMessageCache(msgId);
      }
    }
    allMessagesMap.set(msgId, msg);
    const msgTime = new Date(getTimeField(msg)).getTime();
    if (msgTime > newLatestTime) {
      newLatestTime = msgTime;
    }
  }

  const sortedMessages = Array.from(allMessagesMap.values()).sort((a, b) =>
    new Date(getTimeField(a)).getTime() - new Date(getTimeField(b)).getTime()
  );

  const messagesWithFiles = sortedMessages.filter(msg => {
    try {
      const parsed = JSON.parse(msg.content);
      return parsed.files?.length > 0;
    } catch {
      return false;
    }
  });

  if (messagesWithFiles.length) {
    this.loadFilesForMessagesBase(messagesWithFiles);
  }

  if (isInitialLoad || isScrolledToBottom()) {
    setTimeout(() => this.scrollToBottomBase(scrollContainer), 100);
  }
  this.cdr.detectChanges();
  return { messages: sortedMessages, latestTime: newLatestTime };
}
}