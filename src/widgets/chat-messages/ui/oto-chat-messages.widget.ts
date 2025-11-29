import { Component, Input, Output, EventEmitter, OnChanges, 
  SimpleChanges, AfterViewInit, OnDestroy, ChangeDetectionStrategy, 
  ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { BaseChatMessagesWidget } from '../shared/widget';
import { OtoMessage } from '../../../entities/oto-message';
import { FileUploadApiService } from '../../../features/file-sender';
import { ImageViewerComponent } from '../../../shared/image-viewer';
import { isToday, truncateText, computeContextMenuPosition } from '../../../shared/chat';
import { CustomAudioPlayerComponent } from '../../../shared/custom-player';

@Component({
  selector: 'widgets-oto-chat-messages',
  standalone: true,
  imports: [CommonModule, ImageViewerComponent, CustomAudioPlayerComponent, TranslateModule],
  templateUrl: './oto-chat-messages.widget.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OtoChatMessagesWidget extends BaseChatMessagesWidget<OtoMessage>
  implements OnChanges, AfterViewInit, OnDestroy {

  @Input() chatNickName!: string;
  @Input() messages$?: Observable<OtoMessage[]>;
  @Input() userInfoDeleted$?: Observable<{ userName: string }>;
  @Input() loadHistory?: (nick: string, take: number, skip: number) => Observable<OtoMessage[]>;
  @Input() messageDecryptor?: (sender: string, content: string, messageId?: string) => Promise<string>;

  @Output() editMessage = new EventEmitter<OtoMessage>();
  @Output() deleteMessage = new EventEmitter<OtoMessage>();
  @Output() replyToMessage = new EventEmitter<OtoMessage>();
  @Output() chatUserDeleted = new EventEmitter<void>();

  messages: OtoMessage[] = [];

  private historyLoadedCount = 0; 
  private latestMessageTime: number = 0; 

  private decryptionQueue: Map<string, Promise<void>> = new Map();
  private isDecryptingForContact: Map<string, boolean> = new Map();

  private urlCheckInterval?: any;
  private fileRefreshQueue = new Map<string, Set<string>>();
  private fileRefreshTimer?: any;

  constructor(
    public override cdr: ChangeDetectorRef,
    protected override fileUploadApi: FileUploadApiService
  ) {
    super(cdr, fileUploadApi);
  }

  override getMessageIdFromMessage(msg: OtoMessage): string {
    return msg.messageId || '';
  }

  ngAfterViewInit() {
    this.setupContextMenuListener();
    this.subscribeToUserDeletion();
    this.startUrlExpirationCheck();
  
    setTimeout(() => {
      if (this.messages.length > 0) {
        this.scrollToBottomBase(this.scrollContainer);
      }
    }, 200);

    setTimeout(() => {
      if (this.messages && this.messages.length > 0) {
        const messagesWithFiles = this.messages.filter(msg => {
          try {
            const parsed = JSON.parse(msg.content);
            if (!parsed.files || parsed.files.length === 0) return false;
            
            return parsed.files.some((file: any) => {
              if (!file.url) return true;
              const cacheKey = file.uniqueFileName || file.fileName;
              const cachedUrl = this.urlCache.get(cacheKey);
              return !cachedUrl;
            });
          } catch {
            return false;
          }
        });
  
        if (messagesWithFiles.length > 0) {
          this.loadFilesForMessagesBase(messagesWithFiles);
        }
      }
    }, 2000);
  }

  ngOnDestroy() {
    this.baseDestroy();
    if (this.urlCheckInterval) {
      clearInterval(this.urlCheckInterval);
    }
  }
  
  private async decryptMessageQueued(msg: OtoMessage): Promise<void> {
    const contactId = msg.sender;
    const messageId = msg.messageId;
    
    const existingQueue = this.decryptionQueue.get(contactId);
    if (existingQueue) {
      await existingQueue;
    }
    
    const decryptionPromise = this.performDecryption(msg);
    this.decryptionQueue.set(contactId, decryptionPromise);
    
    try {
      await decryptionPromise;
    } finally {
      if (this.decryptionQueue.get(contactId) === decryptionPromise) {
        this.decryptionQueue.delete(contactId);
      }
    }
  }
  
  private async performDecryption(msg: OtoMessage): Promise<void> {
    const currentContent = msg.content;
    
    try {
      const tempParsed = JSON.parse(currentContent);
      if (tempParsed.messageId) {
        msg.messageId = tempParsed.messageId;
      }
    } catch (e) {
    }
    
    const messageId = msg.messageId;

    let attempts = 0;
    while (!this.messageDecryptor && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!this.messageDecryptor) {      
      (msg as any)._isDecrypting = false;
      (msg as any)._decryptionFailed = true;
      msg.content = '[No decryptor available]';
      this.cdr.markForCheck();
      return;
    }
    
    try {
      const decrypted = await this.messageDecryptor(
        msg.sender, 
        currentContent,
        messageId
      );

      msg.content = decrypted;
      (msg as any)._decrypted = true;
      (msg as any)._isDecrypting = false;
      delete (msg as any)._decryptionFailed;
      
      this.messageContentCache.delete(messageId);
    
      this.cdr.markForCheck();
    
      setTimeout(() => {
        try {
          const parsed = JSON.parse(decrypted);
          if (parsed.files && parsed.files.length > 0) {
            this.loadFilesForMessagesBase([msg]);
          }
        } catch (e) {
        }
      }, 100);
      
    } catch (error: any) {
      msg.content = `[Decryption failed: ${error.message || 'Unknown error'}]`;
      (msg as any)._isDecrypting = false;
      (msg as any)._decryptionFailed = true;
      delete (msg as any)._decrypted;
      
      this.messageContentCache.delete(messageId);
      
      this.cdr.markForCheck();
    }
  }

  private startUrlExpirationCheck() {
    this.urlCheckInterval = setInterval(() => {
      this.checkAndRefreshExpiredUrls();
    }, 5 * 60 * 1000);
  }
  
onImageError(event: Event, file: any) {
  const img = event.target as HTMLImageElement;
 
  if (!file.url || file.url === 'undefined' || file.url === 'null') return;
  const baseUrl = file.url.split('?')[0];
  setTimeout(() => {
    img.src = '';
    setTimeout(() => {
      img.src = baseUrl + `?retry=${Date.now()}`;
    }, 100);
  }, 500);
}

  private checkAndRefreshExpiredUrls() {
    if (!this.messages || this.messages.length === 0) return;
  
    let foundExpired = false;
    const filesToRefresh: { 
      fileName: string; 
      uniqueFileName: string; 
      messageId: string; 
      fileIndex: number 
    }[] = [];
  
    this.messages.forEach(msg => {
      try {
        const parsed = JSON.parse(msg.content);
        if (parsed.files && parsed.files.length > 0) {
          parsed.files.forEach((file: any, fileIndex: number) => {
            if (file.url) {
              const cacheKey = file.uniqueFileName || file.fileName;
              const cachedUrl = this.urlCache.get(cacheKey);
              
              if (cachedUrl && this.isUrlExpired(cachedUrl.timestamp)) {
                foundExpired = true;
                filesToRefresh.push({
                  fileName: file.fileName,
                  uniqueFileName: file.uniqueFileName,
                  messageId: this.getMessageIdFromMessage(msg),
                  fileIndex: fileIndex
                });
              }
            }
          });
        }
      } catch (e) {}
    });
  
    if (foundExpired) {
      const uniqueFileNames = [...new Set(filesToRefresh.map(f => f.fileName))];
      this.fileUploadApi.getDownloadUrls(uniqueFileNames).then(fileUrls => {
        const urlMap = new Map<string, string>();
        fileUrls.forEach(fu => {
          urlMap.set(fu.originalName, fu.url);
          const cacheKey = fu.uniqueFileName || fu.originalName;
          this.urlCache.set(cacheKey, {
            url: fu.url,
            timestamp: Date.now()
          });
        });
  
        filesToRefresh.forEach(item => {
          const newUrl = urlMap.get(item.fileName);
          if (newUrl) {
            const message = this.messages.find(m => this.getMessageIdFromMessage(m) === item.messageId);
            if (message) {
              try {
                const parsed = JSON.parse(message.content);
                if (parsed.files && parsed.files[item.fileIndex]) {
                  parsed.files[item.fileIndex].url = newUrl;
                  parsed.files[item.fileIndex]._refreshKey = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                  message.content = JSON.stringify(parsed);
                  delete (message as any).parsedContent;
                  this.invalidateMessageCache(item.messageId);
                }
              } catch (e) {
              }
            }
          }
        });
  
        this.cdr.markForCheck();
      }).catch(error => {
      });
    } else {
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['chatNickName'] && this.chatNickName) {
      this.initChat();
    }
  }

  parseContent(msg: OtoMessage): { text: string; files: any[] } {
    const currentContent = msg.content;
    try {
      const parsed = JSON.parse(currentContent);
      
      if (parsed.messageId) {
        msg.messageId = parsed.messageId;
      }
    } catch (e) {
    }
    
    const messageId = msg.messageId;
    const cachedData = this.messageContentCache.get(messageId);
  
    const needsReparse = !cachedData ||
      cachedData.timestamp < (msg as any)._version ||
      (msg as any).forceRefresh ||
      (msg as any)._forceRefresh ||
      (msg as any)._forceRerender ||
      (msg as any)._hasTemporaryChanges;
  
    if (!needsReparse) {
      return { text: cachedData.text, files: cachedData.files };
    }
  
    delete (msg as any).forceRefresh;
    delete (msg as any)._forceRefresh;
    delete (msg as any)._forceRerender;
    delete (msg as any)._hasTemporaryChanges;
  
    let result: { text: string; files: any[] } = { text: '', files: [] };
  
    try {
      const parsed = JSON.parse(currentContent);
      
      if (parsed.ciphertext && 
          parsed.ephemeralKey && 
          parsed.nonce && 
          parsed.messageNumber !== undefined) {
        
        if (!(msg as any)._isDecrypting &&
            !(msg as any)._decrypted &&
            !(msg as any)._decryptionFailed) {
          
          (msg as any)._isDecrypting = true;
          
          this.decryptMessageQueued(msg).catch(err => {
          });
          
          result = {
            text: '[Decrypting...]',
            files: []
          };
          
          return result;
        }
        
        if ((msg as any)._isDecrypting) {
          return {
            text: '[Decrypting...]',
            files: []
          };
        }
        
        if ((msg as any)._decryptionFailed) {
          return {
            text: '[Decryption failed]',
            files: []
          };
        }
      }
      
      if (typeof parsed === 'object' && parsed !== null &&
          !parsed.ciphertext &&
          (parsed.hasOwnProperty('text') || parsed.hasOwnProperty('files'))) {
        
        const filesWithType = (parsed.files || []).map((file: any) => {
          const cacheKey = file.uniqueFileName || file.fileName;
          const cachedUrl = this.urlCache.get(cacheKey);
  
          const timestamp = Date.now();
          const randomKey = Math.random().toString(36).substr(2, 9);
  
          const newFile = {
            ...file,
            uniqueId: file.uniqueFileName || `${file.fileName}_${timestamp}_${randomKey}`,
            _version: file._version || timestamp,
            _refreshKey: file._refreshKey || `${timestamp}_${randomKey}`,
            type: file.type || this.detectFileType(file.fileName)
          };
  
          if (file.url && file._version && file._refreshKey) {
            newFile.url = file.url;
          } else if (cachedUrl && !this.isUrlExpired(cachedUrl.timestamp)) {
            newFile.url = cachedUrl.url;
          } else {
            newFile.needsLoading = true;
            if (cachedUrl) {
              this.urlCache.delete(cacheKey);
            }
            this.queueFileUrlRefresh(newFile, messageId);
          }
  
          return newFile;
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
      result = {
        text: currentContent,
        files: []
      };
    }
  
    this.messageContentCache.set(messageId, {
      ...result,
      timestamp: Date.now(),
      version: (msg as any)._version || Date.now()
    });
  
    return result;
  }

  getTimestamp(): number {
    return Date.now();
  }

  private queueFileUrlRefresh(file: any, messageId: string) {
    const cacheKey = file.uniqueFileName || file.fileName;
    
    if (!this.fileRefreshQueue.has(cacheKey)) {
      this.fileRefreshQueue.set(cacheKey, new Set());
    }
    this.fileRefreshQueue.get(cacheKey)!.add(messageId);
  
    if (this.fileRefreshTimer) {
      clearTimeout(this.fileRefreshTimer);
    }
  
    this.fileRefreshTimer = setTimeout(() => {
      this.processPendingFileRefreshes();
    }, 100);
  }
  
  private async processPendingFileRefreshes() {
    if (this.fileRefreshQueue.size === 0) return;
  
    const fileNames = Array.from(this.fileRefreshQueue.keys());
    this.fileRefreshQueue.clear();
  
    try {
      const fileUrls = await this.fileUploadApi.getDownloadUrls(fileNames);
      
      fileUrls.forEach(fileUrl => {
        const cacheKey = fileUrl.uniqueFileName || fileUrl.originalName;
        this.urlCache.set(cacheKey, {
          url: fileUrl.url,
          timestamp: Date.now()
        });
      });
  
      this.messages.forEach(msg => {
        try {
          const parsed = JSON.parse(msg.content);
          if (parsed.files?.some((f: any) => fileNames.includes(f.fileName))) {
            this.invalidateMessageCache(this.getMessageIdFromMessage(msg));
          }
        } catch (e) {}
      });
  
      this.cdr.markForCheck();
    } catch (error) {
    }
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

    this.imageViewerImages = mediaFiles.map(file => ({
      url: file.url,
      fileName: file.fileName,
      type: file.type,
      messageId: sourceMessage.messageId,
      sender: sourceMessage.sender
    }));

    this.imageViewerInitialIndex = mediaIndex;
    this.imageViewerKey++;
    this.showImageViewer = true;

    if (clickedFile.type?.startsWith('video/')) {
      setTimeout(() => {
        const videoElement = document.querySelector('video') as HTMLVideoElement;
        if (videoElement) {
          videoElement.play().catch(() => {});
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
    this.onImageViewerClosedBase();
  }

  onScrollToReplyMessage(messageId: string) {
    this.scrollToMessage(messageId);
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
    this.invalidateAllCache();
    this.chatUserDeleted.emit();
  }

  clearMessagesForDeletedUser(): void {
    this.messages = [];
    this.skip = 0;
    this.allLoaded = false;
    this.invalidateAllCache();
  }

  protected override initChat() {
    this.messages = [];
    this.skip = 0;
    this.allLoaded = false;
    this.shouldScrollToBottom = true;
    this.invalidateAllCache();
    this.historyLoadedCount = 0;
    this.latestMessageTime = 0;
    this.decryptionQueue.clear();
    this.isDecryptingForContact.clear();
  
    this.messages.forEach(msg => {
      delete (msg as any)._isDecrypting;
      delete (msg as any)._decrypted;
      delete (msg as any)._decryptionFailed;
    });
  
    if (this.messages$) {
      this.messages$
        .pipe(takeUntil(this.destroy$))
        .subscribe(msgs => {
          this.handleNewMessages(msgs);
        });
    }
  
    setTimeout(() => {
      this.loadMore();
    }, 100);
  }

  public handleNewMessages(newMsgs: OtoMessage[]) {
    if (!newMsgs || newMsgs.length === 0) return;
  
    const updatedMessages: OtoMessage[] = [];
    const messagesToRemove: string[] = [];
  
    newMsgs.forEach(msg => {
      const index = this.messages.findIndex(m => m.messageId === msg.messageId);
  
      if (index !== -1) {
        this.messages[index] = { ...this.messages[index], ...msg };
        this.clearMessageCacheBase(msg.messageId);
        updatedMessages.push(this.messages[index]);
      } else {
        this.messages.push(msg);
        updatedMessages.push(msg);
      }
    });
  
    newMsgs.forEach(msg => {
      if (msg.isDeleted && this.isMyMessage(msg)) {
        messagesToRemove.push(msg.messageId);
      }
    });
  
    const newIds = newMsgs.map(m => m.messageId);
    const hardDeleted = this.messages.filter(m => !newIds.includes(m.messageId));
    if (hardDeleted.length > 0) {
      messagesToRemove.push(...hardDeleted.map(m => m.messageId));
    }
  
    if (messagesToRemove.length > 0) {
      this.messages = this.messages.filter(m => !messagesToRemove.includes(m.messageId));
      this.cdr.markForCheck();
    }
  
    this.messages.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
    this.latestMessageTime = this.messages.length > 0
      ? Math.max(...this.messages.map(m => new Date(m.sentAt).getTime()))
      : 0;
  
    this.cdr.markForCheck();
  }  

  trackByMessageId(index: number, message: OtoMessage) {
    return message.messageId;
  }

  protected loadMore() {
    if (this.loading || this.allLoaded) return;  
    this.loading = true;
    const loadHistory = this.loadHistory;
    if (!loadHistory) {
      this.loading = false;
      return;
    }
    const currentSkip = this.historyLoadedCount;
    const scrollContainer = this.scrollContainer?.nativeElement;
    const prevScrollHeight = scrollContainer ? scrollContainer.scrollHeight : 0;
    const prevScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
  
    loadHistory(this.chatNickName, this.take, currentSkip)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newMsgs: OtoMessage[]) => {
          if (newMsgs.length === 0) {
            this.allLoaded = true;
            this.loading = false;
          
            if (this.shouldScrollToBottom && this.messages.length > 0) {
              setTimeout(() => {
                this.scrollToBottomBase(this.scrollContainer);
                this.shouldScrollToBottom = false;
              }, 150);
            }
            
            this.cdr.markForCheck();
            return;
          }
  
          const filtered = newMsgs.filter(m => !m.isDeleted || !this.isMyMessage(m));
          if (filtered.length === 0) {
            this.historyLoadedCount += newMsgs.length;
            this.loading = false;
            if (newMsgs.length < this.take) {
              this.allLoaded = true;
            } else {
              setTimeout(() => this.loadMore(), 100);
            }
            this.cdr.markForCheck();
            return;
          }
          const existingIds = new Set(this.messages.map(m => m.messageId));
          const unique = filtered.filter(m => !existingIds.has(m.messageId));
  
          if (unique.length === 0) {
            this.historyLoadedCount += filtered.length;
            this.loading = false;
            
            if (filtered.length < this.take) {
              this.allLoaded = true;
            } else {
              setTimeout(() => this.loadMore(), 100);
            }
            
            this.cdr.markForCheck();
            return;
          }
          this.historyLoadedCount += unique.length;
          this.loadFilesForMessagesBase(unique);
          this.messages = [...unique, ...this.messages];

          if (unique.length < this.take) {
            this.allLoaded = true;
          }
  
          if (!this.shouldScrollToBottom) {
            setTimeout(() => this.restoreScrollPosition(prevScrollHeight, prevScrollTop), 0);
            setTimeout(() => this.restoreScrollPosition(prevScrollHeight, prevScrollTop), 50);
            setTimeout(() => this.restoreScrollPosition(prevScrollHeight, prevScrollTop), 100);
            setTimeout(() => this.restoreScrollPosition(prevScrollHeight, prevScrollTop), 200);
          } else {
            setTimeout(() => {
              this.scrollToBottomBase(this.scrollContainer);
              this.shouldScrollToBottom = false;
            }, 150);
          }
  
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }
    
  private restoreScrollPosition(prevScrollHeight: number, prevScrollTop: number): void {
    if (!this.scrollContainer) return;
  
    const el = this.scrollContainer.nativeElement;
    const newScrollHeight = el.scrollHeight;
    const heightDiff = newScrollHeight - prevScrollHeight;
  
    if (heightDiff > 0) {
      el.scrollTop = prevScrollTop + heightDiff;
    }
  }

  get groupedMessages() {
    const groups: { date: string; messages: OtoMessage[] }[] = [];
    let lastDate = '';
    const filtered = this.messages.filter(msg => {
      if (!msg.isDeleted) return true;
      if (msg.isDeleted && this.isMyMessage(msg)) return false;
      return true;
    });
  
    const sorted = [...filtered].sort((a, b) => 
      new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
    );
  
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
  override trackByFileWithRefresh(index: number, file: any): string {
    if (!file) return String(index);
    
    const uniquePart = file.uniqueId || file.uniqueFileName || file.fileName || index;
    const versionPart = file._refreshKey || file._version || 0;
    const typePart = file._typeKey || file.type || '';
    
    return `${uniquePart}_${versionPart}_${typePart}_${index}`;
  }

  isToday = isToday;
  truncateText = truncateText;

  onScroll() {
    this.onScrollBase(this.scrollContainer);
  }

  scrollToMessage(messageId: string): void {
    this.scrollToMessageBase(messageId, this.scrollContainer);
  }

  public scrollToBottomAfterNewMessage() {
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.scrollToBottomBase(this.scrollContainer);
      }, 150);
    });
  }

  getRepliedMessage(messageId: string): OtoMessage {
    return this.messages.find(m => m.messageId === messageId) || undefined as any;
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
    return this.canEditOrDeleteBase(this.messages);
  }

  isMyMessage(msg: OtoMessage): boolean {
    return this.isMyMessageBase(msg);
  }

  isMessageDeleted(msg: OtoMessage): boolean {
    return this.isMessageDeletedBase(msg);
  }

  getMessageContent(msg: OtoMessage): string {
    if (msg.isDeleted) return 'This message was deleted';
    return msg.content;
  }

  isMessageHighlighted(id: string): boolean {
    return this.isMessageHighlightedBase(id);
  }

  highlightMessage(messageId: string) {
    this.highlightMessageBase(messageId);
  }

  public clearMessageCacheBase(messageId: string): void {
    this.clearMessageCache(messageId, this.messages, this.cdr);
  }

  async addFileToMessage(messageId: string, fileData: { fileName: string; uniqueFileName: string; url: string; type?: string }) {
    await this.addFileToMessageBase(messageId, this.messages, fileData, this.cdr);
  }

  async removeFileFromMessage(messageId: string, uniqueFileName: string) {
    await this.removeFileFromMessageBase(messageId, this.messages, uniqueFileName, this.cdr);
  }

  public fullMessageRerender(messageId: string): void {
    this.fullMessageRerenderBase(messageId, this.messages, this.cdr);
  }

  public forceMessageRefresh(messageId: string, newMessage?: OtoMessage): void {
    this.forceMessageRefreshBase(
      messageId, 
      this.messages, 
      (msg) => this.parseContent(msg), 
      newMessage, 
      this.cdr
    );
  }

  public forceFileRefresh(messageId: string, fileUniqueId: string): void {
    this.forceFileRefreshBase(messageId, this.messages, fileUniqueId, this.cdr);
  }

  async replaceFileInMessage(
    messageId: string, 
    oldUniqueFileName: string,
    newFileData: { fileName: string; uniqueFileName: string; url: string; type?: string }
  ) {
    await this.replaceFileInMessageBase(messageId, this.messages, oldUniqueFileName, newFileData, this.cdr);
  }
}