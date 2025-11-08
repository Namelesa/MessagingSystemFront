import { Injectable, ChangeDetectorRef } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { OtoMessage } from '../../../entities/oto-message';

export interface MessageCacheEntry {
  text: string;
  files: any[];
  timestamp: number;
  version?: number;
}

export interface UrlCacheEntry {
  url: string;
  timestamp: number;
}

export interface FileVersionInfo {
  uniqueId: string;
  version: number;
  refreshKey: string;
  forceUpdate: number;
  typeKey: string;
  isTemporary?: boolean;
  isNew?: boolean;
  replacesFile?: string;
}

export interface FileVersionOptions {
  fileName: string;
  type?: string;
  replacesFile?: string;
  isTemporary?: boolean;
  isNew?: boolean;
}

@Injectable({ providedIn: 'root' })
export class MessageCacheService {
  public messageContentCache = new Map<string, MessageCacheEntry>();
  public urlCache = new Map<string, UrlCacheEntry>();
  private forceReloadSubject = new BehaviorSubject<boolean>(false);
  public forceReload$: Observable<boolean> = this.forceReloadSubject.asObservable();
  private messagesWidget?: any;
  private readonly URL_EXPIRATION_TIME = 55 * 60 * 1000;

  isUrlExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.URL_EXPIRATION_TIME;
  }

  isUrlAboutToExpire(timestamp: number): boolean {
    const age = Date.now() - timestamp;
    const threshold = 48 * 60 * 1000;
    return age > threshold;
  }

  getCachedMessage(messageId: string): MessageCacheEntry | undefined {
    return this.messageContentCache.get(messageId);
  }

  setCachedMessage(
    messageId: string,
    text: string,
    files: any[],
    version?: number
  ): void {
    this.messageContentCache.set(messageId, {
      text,
      files,
      timestamp: Date.now(),
      version: version || Date.now()
    });
  }

  invalidateMessage(messageId: string): void {
    this.messageContentCache.delete(messageId);
  }

  clearMessageCache(): void {
    this.messageContentCache.clear();
  }

  needsReparse(msg: OtoMessage, messageId: string): boolean {
    const cachedData = this.messageContentCache.get(messageId);
    
    return !cachedData ||
      cachedData.timestamp < (msg as any)._version ||
      (msg as any).forceRefresh ||
      (msg as any)._forceRefresh ||
      (msg as any)._forceRerender ||
      (msg as any)._hasTemporaryChanges;
  }

  clearRefreshFlags(msg: OtoMessage): void {
    delete (msg as any).forceRefresh;
    delete (msg as any)._forceRefresh;
    delete (msg as any)._forceRerender;
    delete (msg as any)._hasTemporaryChanges;
  }

  clearMessageWithMetadata(messageId: string, message: OtoMessage): void {
    this.invalidateMessage(messageId);
    delete (message as any).parsedContent;
    delete (message as any)._cachedVersion;
  }

  getCachedUrl(key: string): UrlCacheEntry | undefined {
    return this.urlCache.get(key);
  }

  setCachedUrl(key: string, url: string): void {
    this.urlCache.set(key, {
      url,
      timestamp: Date.now()
    });
  }

  invalidateUrl(key: string): void {
    this.urlCache.delete(key);
  }

  clearUrlCache(): void {
    this.urlCache.clear();
  }

  invalidateUrlsByKeys(keys: string[]): void {
    keys.forEach(key => {
      if (key) {
        this.urlCache.delete(key);
      }
    });
  }

  clearAllCaches(): void {
    this.messageContentCache.clear();
    this.urlCache.clear();
  }

  generateFileVersion(options: FileVersionOptions): FileVersionInfo {
    const timestamp = Date.now();
    const randomKey = Math.random().toString(36).substr(2, 9);
    const sanitizedFileName = options.fileName.replace(/[^a-zA-Z0-9]/g, '_');
    
    return {
      uniqueId: `FILE_${timestamp}_${randomKey}_${sanitizedFileName}`,
      version: timestamp,
      refreshKey: `${timestamp}_${randomKey}`,
      forceUpdate: timestamp,
      typeKey: `${options.type || 'unknown'}_${timestamp}`,
      isTemporary: options.isTemporary,
      isNew: options.isNew,
      replacesFile: options.replacesFile
    };
  }

  enhanceFileWithVersion(
    file: any,
    options?: {
      replacesFile?: string;
      isTemporary?: boolean;
      isNew?: boolean;
    }
  ): any {
    const versionInfo = this.generateFileVersion({
      fileName: file.fileName,
      type: file.type,
      replacesFile: options?.replacesFile,
      isTemporary: options?.isTemporary,
      isNew: options?.isNew
    });

    return {
      ...file,
      uniqueId: versionInfo.uniqueId,
      _version: versionInfo.version,
      _refreshKey: versionInfo.refreshKey,
      _forceUpdate: versionInfo.forceUpdate,
      _typeKey: versionInfo.typeKey,
      _isTemporary: versionInfo.isTemporary,
      _isNew: versionInfo.isNew,
      _replacesFile: versionInfo.replacesFile
    };
  }

  generateUniqueFileId(fileName: string): string {
    const timestamp = Date.now();
    const randomKey = Math.random().toString(36).substr(2, 9);
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9]/g, '_');
    return `FILE_${timestamp}_${randomKey}_${sanitizedFileName}`;
  }

  generateRefreshKey(): string {
    const timestamp = Date.now();
    const randomKey = Math.random().toString(36).substr(2, 9);
    return `${timestamp}_${randomKey}`;
  }

  setMessagesWidget(widget: any): void {
    this.messagesWidget = widget;
  }

  getMessagesWidget(): any {
    return this.messagesWidget;
  }

  triggerForceReload(): void {
    this.forceReloadSubject.next(true);
    setTimeout(() => {
      this.forceReloadSubject.next(false);
    }, 100);
  }

  forceCompleteMessageUpdate(
    messageId: string,
    cdr?: ChangeDetectorRef
  ): void {
    if (!this.messagesWidget) {
      console.warn('⚠️ MessagesWidget not set in MessageCacheService');
      return;
    }

    const message = this.messagesWidget.messages?.find(
      (m: OtoMessage) => m.messageId === messageId
    );

    if (!message) {
      console.warn(`⚠️ Message ${messageId} not found`);
      return;
    }

    delete (message as any).parsedContent;
    delete (message as any).parsedFiles;
    this.invalidateMessage(messageId);
    
    (message as any).forceRefresh = true;
    (message as any).lastUpdated = Date.now();
    (message as any)._hasTemporaryChanges = false;
    (message as any)._forceRerender = Date.now();
    
    try {
      const parsed = JSON.parse(message.content);
      if (parsed.files) {
        parsed.files.forEach((file: any) => {
          if (file.type?.startsWith('video/')) {
            file._videoRefreshKey = Date.now();
          }
        });
        message.content = JSON.stringify(parsed);
      }
    } catch (e) {
      console.error('❌ Error updating video refresh keys:', e);
    }

    if (this.messagesWidget.fullMessageRerender) {
      this.messagesWidget.fullMessageRerender(messageId);
    }

    setTimeout(() => {
      if (this.messagesWidget?.fullMessageRerender) {
        this.messagesWidget.fullMessageRerender(messageId);
      }
    }, 100);

    if (cdr) {
      cdr.markForCheck();
      cdr.detectChanges();
    }
  }

  forceReloadImages(messageId: string): void {
    const delays = [0, 50, 100, 200, 400];
    
    delays.forEach(delay => {
      setTimeout(() => {
        this.forceImageReloadInternal(messageId);
      }, delay);
    });
  }

  private forceImageReloadInternal(messageId: string): void {
    const messageElements = document.querySelectorAll(
      `[data-message-id="${messageId}"]`
    );
    
    messageElements.forEach(msgEl => {
      const images = msgEl.querySelectorAll('img[src]');
      images.forEach((img) => {
        const imgElement = img as HTMLImageElement;
        const currentSrc = imgElement.src;
        
        if (!currentSrc || currentSrc === '') return;
        
        imgElement.removeAttribute('src');
        void imgElement.offsetHeight;
        imgElement.setAttribute('src', currentSrc);
      });
      
      const videos = msgEl.querySelectorAll('video');
      videos.forEach((video) => {
        const videoElement = video as HTMLVideoElement;
        videoElement.load();
      });
    });
  }

  invalidateAndUpdate(
    messageId: string,
    cdr?: ChangeDetectorRef
  ): void {
    this.invalidateMessage(messageId);
    
    if (this.messagesWidget) {
      const message = this.messagesWidget.messages?.find(
        (m: OtoMessage) => m.messageId === messageId
      );
      
      if (message) {
        delete (message as any).parsedContent;
        (message as any)._version = Date.now();
      }
    }
    
    if (cdr) {
      cdr.markForCheck();
    }
  }

  updateEditingMessageFile(
    editingMessage: OtoMessage,
    oldFile: any,
    newFileData: any
  ): OtoMessage {
    const versionTimestamp = Date.now();
    const randomKey = Math.random().toString(36).substr(2, 9);
    
    const enhancedNewFileData = {
      fileName: newFileData.fileName,
      uniqueFileName: newFileData.uniqueFileName,
      url: newFileData.url,
      type: newFileData.type,
      size: newFileData.size,
      uniqueId: this.generateUniqueFileId(newFileData.fileName),
      _version: versionTimestamp,
      _refreshKey: `${versionTimestamp}_${randomKey}`,
      _forceUpdate: versionTimestamp,
      _typeKey: `${newFileData.type}_${versionTimestamp}`,
      _replacesFile: oldFile?.uniqueFileName || oldFile?.fileName,
      _isTemporary: true
    };

    let parsed: any;
    try {
      parsed = JSON.parse(editingMessage.content || '{}');
    } catch {
      parsed = { text: editingMessage.content || '', files: [] };
    }

    parsed.files = parsed.files || [];

    const fileIndex = parsed.files.findIndex((f: any) =>
      f.uniqueFileName === oldFile.uniqueFileName ||
      f.uniqueId === oldFile.uniqueId ||
      f.fileName === oldFile.fileName
    );

    const newFilesArray = [...parsed.files];
    if (fileIndex >= 0) {
      newFilesArray[fileIndex] = { ...enhancedNewFileData };
    } else {
      newFilesArray.push({ ...enhancedNewFileData, _isNew: true });
    }
    
    parsed.files = newFilesArray;

    return {
      messageId: editingMessage.messageId,
      sender: editingMessage.sender,
      sentAt: editingMessage.sentAt,
      content: JSON.stringify(parsed),
      isDeleted: editingMessage.isDeleted,
      isEdited: editingMessage.isEdited,
      editedAt: editingMessage.editedAt,
      replyFor: editingMessage.replyFor,
      _hasTemporaryChanges: true,
      _version: versionTimestamp,
      _refreshKey: `${versionTimestamp}_${randomKey}`
    } as any;
  }

  updateMessagesArrayWithFile(
    messages: OtoMessage[],
    messageId: string,
    oldFile: any,
    newFileData: any
  ): OtoMessage[] {
    const messageIndex = messages.findIndex(
      (m: OtoMessage) => m.messageId === messageId
    );

    if (messageIndex === -1) return messages;

    const message = messages[messageIndex];
    const versionTimestamp = Date.now();
    const randomKey = Math.random().toString(36).substr(2, 9);

    const enhancedNewFileData = this.enhanceFileWithVersion(newFileData, {
      replacesFile: oldFile?.uniqueFileName || oldFile?.fileName,
      isTemporary: true
    });

    let parsedMessage: any;
    try {
      parsedMessage = JSON.parse(message.content || '{}');
    } catch {
      parsedMessage = { text: message.content || '', files: [] };
    }

    parsedMessage.files = parsedMessage.files || [];

    const messageFileIndex = parsedMessage.files.findIndex((f: any) =>
      f.uniqueFileName === oldFile.uniqueFileName ||
      f.uniqueId === oldFile.uniqueId ||
      f.fileName === oldFile.fileName
    );

    const newMessageFilesArray = [...parsedMessage.files];
    if (messageFileIndex >= 0) {
      newMessageFilesArray[messageFileIndex] = { ...enhancedNewFileData };
    } else {
      newMessageFilesArray.push({ ...enhancedNewFileData, _isNew: true });
    }
    
    parsedMessage.files = newMessageFilesArray;

    const updatedMessage: OtoMessage = {
      ...message,
      content: JSON.stringify(parsedMessage),
      _version: versionTimestamp,
      _refreshKey: `${versionTimestamp}_${randomKey}`,
      _forceRerender: versionTimestamp
    } as any;

    const oldCacheKeys = [
      oldFile.uniqueFileName,
      oldFile.fileName,
      oldFile.uniqueId
    ].filter(Boolean);
    this.invalidateUrlsByKeys(oldCacheKeys);

    const newCacheKeys = [
      enhancedNewFileData.uniqueFileName,
      enhancedNewFileData.fileName
    ].filter(Boolean);
    newCacheKeys.forEach(key => {
      this.setCachedUrl(key, enhancedNewFileData.url);
    });

    return [
      ...messages.slice(0, messageIndex),
      updatedMessage,
      ...messages.slice(messageIndex + 1)
    ];
  }

  getTimestamp(): number {
    return Date.now();
  }

  generateRandomKey(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  destroy(): void {
    this.clearAllCaches();
    this.messagesWidget = undefined;
    this.forceReloadSubject.complete();
  }
}