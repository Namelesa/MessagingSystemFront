import { Directive, Input, ViewChild, ElementRef } from '@angular/core';
import { Subject } from 'rxjs';

export interface BaseMessage {
  id?: string;
  messageId?: string;
  sender: string;
  isDeleted?: boolean;
  sendTime?: string;
  sentAt?: string;
  content: string;
}

@Directive()
export abstract class BaseChatMessagesWidget<TMessage extends BaseMessage> {
  @Input() currentUserNickName!: string;
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  highlightedMessageId: string | null = null;
  showContextMenu = false;
  allLoaded = false;
  loading = false;
  contextMenuMessageId: string | null = null;
  contextMenuPosition = { x: 0, y: 0 };

  protected prevScrollHeight = 0;
  protected destroy$ = new Subject<void>();
  protected shouldScrollToBottom = false;
  protected hideContextMenuHandler?: () => void;
  protected messageContentCache = new Map<string, string>();

  // Abstract methods that must be implemented by child classes
  protected abstract loadMore(): void;
  protected abstract initChat(): void;

  // Shared lifecycle methods
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
  }

  // Message highlighting
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

  // Scroll handling
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

  // Message state checks
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

  // Context menu handling
  protected canEditOrDeleteBase(messages: TMessage[]): boolean {
    const msg = messages.find(m => 
      (m.id && m.id === this.contextMenuMessageId) || 
      (m.messageId && m.messageId === this.contextMenuMessageId)
    );
    
    if (!msg) return false;
    if (this.isMessageDeletedBase(msg)) return false;
    return this.isMyMessageBase(msg);
  }

  // Utility methods
  protected getMessageIdFromMessage(msg: TMessage): string {
    return msg.messageId || msg.id || '';
  }

  protected groupMessagesByDate(
    messages: TMessage[], 
    getTimeField: (msg: TMessage) => string
  ): { date: string; messages: TMessage[] }[] {
    const groups: { date: string; messages: TMessage[] }[] = [];
    let lastDate = '';
    
    const filtered = messages.filter(m => !m.isDeleted || this.isMyMessageBase(m));
    const sorted = [...filtered].sort((a, b) => 
      new Date(getTimeField(a)).getTime() - new Date(getTimeField(b)).getTime()
    );

    for (const msg of sorted) {
      const d = new Date(getTimeField(msg)).toDateString();
      if (d !== lastDate) {
        groups.push({ date: d, messages: [msg] });
        lastDate = d;
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }
    
    return groups;
  }

  // Track by functions
  trackByGroupBase = (_: number, group: { date: string; messages: TMessage[] }) => group.date;
  
  trackByMessageBase = (_: number, msg: TMessage) => 
    msg.messageId || msg.id || '';

  // ============================================
  // FILE HANDLING METHODS
  // ============================================

  /**
   * Определяет тип файла по имени или URL
   */
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

  /**
   * Форматирует размер файла в читаемый вид
   */
  protected formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Получает размер файла
   */
  getFileSize(file: any): string {
    return file.size ? this.formatFileSize(file.size) : 'Unknown size';
  }

  /**
   * Получает расширение файла
   */
  getFileExtension(fileName: string): string {
    if (!fileName) return 'File';
    const extension = fileName.split('.').pop()?.toUpperCase();
    return extension || 'File';
  }

  /**
   * Фильтрует медиа-файлы (изображения и видео)
   */
  getMediaFiles(files: any[]): any[] {
    if (!files) return [];
    return files.filter(file => 
      file.type?.startsWith('image/') || 
      file.type?.startsWith('video/') ||
      file.type?.startsWith('audio/')
    );
  }

  /**
   * Находит индекс файла в массиве всех файлов
   */
  getOriginalFileIndex(allFiles: any[], targetFile: any): number {
    return allFiles.findIndex(file => 
      file.uniqueId === targetFile.uniqueId || 
      file.url === targetFile.url || 
      file.fileName === targetFile.fileName
    );
  }

  /**
   * TrackBy функция для файлов с поддержкой refresh
   */
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

  /**
   * Извлекает timestamp из имени файла
   */
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

  /**
   * Нормализует имя файла для сравнения
   */
  protected normalizeFileName(fileName: string): string {
    try {
      return fileName.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch {
      return fileName.toLowerCase().trim();
    }
  }

  /**
   * Очищает кэш для обновленных сообщений
   */
  protected clearCacheForUpdatedMessages(
    previousMessages: TMessage[], 
    currentMessages: TMessage[],
    cdr: any
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

  /**
   * Очищает кэш для конкретного сообщения
   */
  clearMessageCache(messageId: string, messages: TMessage[], cdr: any): void {
    this.messageContentCache.delete(messageId);
    
    const message = messages.find(m => this.getMessageIdFromMessage(m) === messageId);
    if (message) {
      delete (message as any).parsedContent;
      delete (message as any).parsedFiles;
      (message as any)._cacheCleared = Date.now();
    }
    
    cdr.detectChanges();
  }

  /**
   * Добавляет файл к сообщению
   */
  async addFileToMessageBase(
    messageId: string, 
    messages: TMessage[],
    fileData: { fileName: string; uniqueFileName: string; url: string; type?: string },
    cdr: any
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
      console.error('Error adding file to message:', error);
    }
  }

  /**
   * Удаляет файл из сообщения
   */
  async removeFileFromMessageBase(
    messageId: string,
    messages: TMessage[],
    uniqueFileName: string,
    cdr: any
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
      console.error('Error removing file from message:', error);
    }
  }

  /**
   * Полный ререндер сообщения
   */
  fullMessageRerenderBase(messageId: string, messages: TMessage[], cdr: any): void {
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

  /**
   * Принудительное обновление сообщения
   */
  forceMessageRefreshBase(
    messageId: string, 
    messages: TMessage[],
    parseContentFn: (msg: TMessage) => any,
    newMessage: TMessage | undefined,
    cdr: any
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

  /**
   * Принудительное обновление файла
   */
  forceFileRefreshBase(messageId: string, messages: TMessage[], fileUniqueId: string, cdr: any): void {
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
}