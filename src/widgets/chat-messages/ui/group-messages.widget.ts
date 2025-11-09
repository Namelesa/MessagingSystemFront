import { Component, Input, Output, EventEmitter, OnChanges,
  SimpleChanges, AfterViewInit, OnDestroy, ChangeDetectorRef,
  ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BaseChatMessagesWidget } from '../shared/widget';
import { GroupMessage } from '../../../entities/group-message';
import { FileUploadApiService } from '../../../features/file-sender';
import { isToday, truncateText, computeContextMenuPosition } from '../../../shared/realtime';
import { ImageViewerComponent } from '../../../shared/image-viewer';
import { CustomAudioPlayerComponent } from "../../../shared/custom-player";

@Component({
  selector: 'widgets-group-messages',
  standalone: true,
  imports: [CommonModule, TranslateModule, ImageViewerComponent, CustomAudioPlayerComponent],
  templateUrl: './group-messages.widget.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupMessagesWidget extends BaseChatMessagesWidget<GroupMessage> 
  implements OnChanges, AfterViewInit, OnDestroy {

  @Input() groupId!: string;
  @Input() members: { nickName: string; image: string }[] = [];
  @Input() messages$!: Observable<GroupMessage[]>;
  @Input() userInfoChanged$!: Observable<{ userName: string; image?: string; updatedAt: string; oldNickName: string }>;
  @Input() loadHistory!: (groupId: string, take: number, skip: number) => Observable<GroupMessage[]>;

  @Output() editMessage = new EventEmitter<GroupMessage>();
  @Output() deleteMessage = new EventEmitter<GroupMessage>();
  @Output() replyToMessage = new EventEmitter<GroupMessage>();

  messages: GroupMessage[] = [];
  private localMembers: { nickName: string; image: string }[] = [];
  private avatarCache = new Map<string, string | undefined>();

  private fileRefreshQueue = new Map<string, Set<string>>();
  private fileRefreshTimer?: any;
  private latestMessageTime: number = 0;

  private urlCheckInterval?: any;

  constructor(
    protected override cdr: ChangeDetectorRef,
    protected override fileUploadApi: FileUploadApiService
  ) {
    super(cdr, fileUploadApi);
  }

  override getMessageIdFromMessage(msg: GroupMessage): string {
    return msg.id || '';
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
      console.error('Failed to refresh file URLs:', error);
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.scrollToBottomBase(this.scrollContainer);
    }, 200);
    
    this.setupContextMenuListener();
    this.subscribeToUserInfoUpdates();
    this.startUrlExpirationCheck();

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
          this.loadFilesForMessages(messagesWithFiles);
        }
      }
    }, 2000);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['groupId'] && this.groupId) {
      this.initChat();
    }

    if (changes['members'] && this.members) {
      this.localMembers = [...this.members];
      this.clearAvatarCache();
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy() {
    this.baseDestroy();
    
    if (this.urlCheckInterval) {
      clearInterval(this.urlCheckInterval);
    }
    
    if (this.fileRefreshTimer) {
      clearTimeout(this.fileRefreshTimer);
    }
  }

  private startUrlExpirationCheck() {
    this.urlCheckInterval = setInterval(() => {
      this.checkAndRefreshExpiredUrls();
    }, 5 * 60 * 1000);
  }

  private checkAndRefreshExpiredUrls() {
    if (!this.messages || this.messages.length === 0) return;
  
    const filesToRefresh: { 
      fileName: string; 
      uniqueFileName: string; 
      messageId: string; 
      fileIndex: number 
    }[] = [];
  
    this.messages.forEach(msg => {
      try {
        const parsed = JSON.parse(msg.content);
        if (parsed.files?.length > 0) {
          parsed.files.forEach((file: any, fileIndex: number) => {
            if (file.url) {
              const cacheKey = file.uniqueFileName || file.fileName;
              const cachedUrl = this.urlCache.get(cacheKey);
              
              if (cachedUrl && this.isUrlExpired(cachedUrl.timestamp)) {
                filesToRefresh.push({
                  fileName: file.fileName,
                  uniqueFileName: file.uniqueFileName,
                  messageId: this.getMessageIdFromMessage(msg),
                  fileIndex
                });
              }
            }
          });
        }
      } catch (e) {}
    });
  
    if (filesToRefresh.length === 0) return;
  
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
              if (parsed.files?.[item.fileIndex]) {
                parsed.files[item.fileIndex].url = newUrl;
                parsed.files[item.fileIndex]._version = Date.now();
                message.content = JSON.stringify(parsed);
                this.invalidateMessageCache(item.messageId);
              }
            } catch (e) {
              console.error('Error updating message:', e);
            }
          }
        }
      });
  
      this.cdr.markForCheck();
    }).catch(error => {
      console.error('Failed to refresh expired URLs:', error);
    });
  }

  parseContent(msg: GroupMessage): { text: string; files: any[] } {
    const messageId = msg.id || '';
    if (msg.isDeleted) {
      return {
        text: msg.content,
        files: []
      };
    }
    const currentContent = msg.content;
    const cachedData = this.messageContentCache.get(messageId);
    const needsReparse = !cachedData || 
                        cachedData.timestamp < (msg as any)._version ||
                        (msg as any).forceRefresh;

    if (!needsReparse) return { text: cachedData.text, files: cachedData.files };
  
    delete (msg as any).forceRefresh;
    let result: { text: string; files: any[] };
    try {
      const parsed = JSON.parse(currentContent);
      if (typeof parsed === 'object' && parsed !== null &&
          (parsed.hasOwnProperty('text') || parsed.hasOwnProperty('files'))) {
        
        const filesWithType = (parsed.files || []).map((file: any, index: number) => {
          const cacheKey = file.uniqueFileName || file.fileName;
          const cachedUrl = this.urlCache.get(cacheKey);
  
          if (cachedUrl && !this.isUrlExpired(cachedUrl.timestamp)) {
            file.url = cachedUrl.url;
          } else if (!file.url || (cachedUrl && this.isUrlExpired(cachedUrl.timestamp))) {
            file.needsLoading = true;
            this.queueFileUrlRefresh(file, messageId);
          }
  
          if (!file.type && file.fileName) {
            file.type = this.detectFileType(file.fileName);
          }
  
          if (!file.uniqueId) {
            file.uniqueId = file.uniqueFileName || file.url || `${file.fileName}_${Date.now()}_${index}`;
          }
  
          file._version = file._version || Date.now();
  
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
      result = {
        text: currentContent || '',
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

  openFileViewer(fileIndex: number, messageId: string) {
    this.openFileViewerBase(
      fileIndex,
      messageId,
      this.messages,
      (msg) => this.parseContent(msg),
      (msg) => msg.sender
    );
  }

  onImageViewerClosed() {
    this.onImageViewerClosedBase();
  }

  onScrollToReplyMessage(messageId: string) {
    this.scrollToMessage(messageId);
  }

  private async loadFilesForMessages(messages: GroupMessage[]) {
    await this.loadFilesForMessagesBase(messages);
  }

  private subscribeToUserInfoUpdates() {
    this.userInfoChanged$
      .pipe(takeUntil(this.destroy$))
      .subscribe(userInfo => {
        if (userInfo) this.handleUserInfoUpdate(userInfo);
      });

    this.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(messages => {
        const uniqueSenders = [...new Set(messages.map(m => m.sender))];
        const missing = uniqueSenders.filter(s => !this.localMembers.some(m => m.nickName === s));
        if (missing.length > 0) {
          console.warn('Missing members:', missing);
        }
      });
  }

  private handleUserInfoUpdate(userInfo: { userName: string; image?: string; updatedAt: string; oldNickName: string }) {
    this.clearAvatarCache({ oldNick: userInfo.oldNickName, newNick: userInfo.userName });
    this.updateMessagesSenders(userInfo);
    this.updateLocalMembers(userInfo);
    this.cdr.detectChanges();
  }

  private updateMessagesSenders(userInfo: { userName: string; image?: string; updatedAt: string; oldNickName: string }) {
    this.messages = this.messages.map(msg =>
      msg.sender === userInfo.oldNickName
        ? { ...msg, sender: userInfo.userName, oldSender: userInfo.oldNickName, senderImage: userInfo.image || (msg as any).senderImage }
        : msg
    );
  }

  private updateLocalMembers(userInfo: { userName: string; image?: string; updatedAt: string; oldNickName: string }) {
    const cleanOld = userInfo.oldNickName.trim().toLowerCase();
    const cleanNew = userInfo.userName.trim().toLowerCase();

    let index = this.localMembers.findIndex(m =>
      m.nickName.toLowerCase().trim() === cleanOld ||
      m.nickName.toLowerCase().trim() === cleanNew
    );

    const image = userInfo.image?.trim() || '';

    if (index !== -1) {
      this.localMembers[index] = { nickName: userInfo.userName, image };
    } else {
      this.localMembers.push({ nickName: userInfo.userName, image });
    }

    this.avatarCache.delete(cleanOld);
    if (image) {
      this.avatarCache.set(cleanNew, image);
    } else {
      this.avatarCache.set(cleanNew, undefined);
    }
  }

  private clearAvatarCache(specific?: { oldNick?: string; newNick?: string }) {
    if (specific) {
      if (specific.oldNick) this.avatarCache.delete(specific.oldNick.trim().toLowerCase());
      if (specific.newNick) this.avatarCache.delete(specific.newNick.trim().toLowerCase());
    } else {
      this.avatarCache.clear();
    }
  }

  get groupedMessages() {
    return this.groupMessagesByDate(this.messages, msg => msg.sendTime);
  }

  trackByGroup = this.trackByGroupBase;
  trackByMessageId = this.trackByMessageBase;
  isToday = isToday;
  truncateText = truncateText;

  onScroll() {
    this.onScrollBase(this.scrollContainer);
  }

  scrollToMessage(messageId: string) {
    this.scrollToMessageBase(messageId, this.scrollContainer);
  }

  private isScrolledToBottom(): boolean {
    return this.isScrolledToBottomBase(this.scrollContainer);
  }  

  public scrollToBottomAfterNewMessage() {
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.scrollToBottomBase(this.scrollContainer);
      }, 150);
    });
  }

  getRepliedMessage(messageId: string): GroupMessage | undefined {
    return this.messages.find(m => m.id === messageId) || undefined;
  }

  onMessageRightClick(event: MouseEvent, msg: GroupMessage) {
    event.preventDefault();
    event.stopPropagation();

    const target = event.target as HTMLElement;
    const messageContainer = target.closest('.message-container') as HTMLElement;

    if (!messageContainer || !this.scrollContainer) return;

    const messageBlock = messageContainer.querySelector('[class*="px-3 py-2 rounded-2xl"]') as HTMLElement;
    if (!messageBlock) return;

    const blockRect = messageBlock.getBoundingClientRect();
    const containerRect = this.scrollContainer.nativeElement.getBoundingClientRect();
    const pos = computeContextMenuPosition(blockRect, containerRect, this.isMyMessage(msg));

    this.contextMenuMessageId = msg.id;
    this.contextMenuPosition = pos;
    this.showContextMenu = true;
  }

  onEditMessage() {
    const msg = this.messages.find(m => m.id === this.contextMenuMessageId);
    if (msg) this.editMessage.emit(msg);
    this.showContextMenu = false;
  }

  onDeleteMessage() {
    const msg = this.messages.find(m => m.id === this.contextMenuMessageId);
    if (msg) this.deleteMessage.emit(msg);
    this.showContextMenu = false;
  }

  onReplyToMessage() {
    const msg = this.messages.find(m => m.id === this.contextMenuMessageId);
    if (msg) this.replyToMessage.emit(msg);
    this.showContextMenu = false;
  }

  canEditOrDelete(): boolean {
    return this.canEditOrDeleteBase(this.messages);
  }

  protected initChat() {
    this.messages = [];
    this.skip = 0;
    this.allLoaded = false;
    this.shouldScrollToBottom = true;
    this.invalidateAllCache();
    this.latestMessageTime = 0;
  
    if (this.messages$) {
      this.messages$
        .pipe(takeUntil(this.destroy$))
        .subscribe((newMsgs: GroupMessage[]) => {
          this.handleNewMessages(newMsgs);
        });
    }
  }
  
  private handleNewMessages(newMsgs: GroupMessage[]) {
    if (!newMsgs || newMsgs.length === 0) return;

    const updatedMessages: GroupMessage[] = [];
    const messagesToRemove: string[] = [];
  
    newMsgs.forEach(msg => {
      const index = this.messages.findIndex(m => m.id === msg.id);
  
      if (index !== -1) {
        const existing = this.messages[index];
    
        if (existing.content !== msg.content) {
          (msg as any).forceRefresh = true;
          (msg as any)._version = Date.now();
        }
        
        this.messages[index] = { ...existing, ...msg };
        this.invalidateMessageCache(msg.id!);
        updatedMessages.push(this.messages[index]);
      } else {
        this.messages.push(msg);
        updatedMessages.push(msg);
      }
    });
  
    newMsgs.forEach(msg => {
      if (msg.isDeleted && !this.isMyMessage(msg)) {
        messagesToRemove.push(msg.id!);
      }
    });
  
    const newIds = newMsgs.map(m => m.id);
    const hardDeleted = this.messages.filter(m => !newIds.includes(m.id));
    if (hardDeleted.length > 0) {
      messagesToRemove.push(...hardDeleted.map(m => m.id!));
    }
  
    if (messagesToRemove.length > 0) {    
      this.messages = this.messages.filter(m => !messagesToRemove.includes(m.id!));
      messagesToRemove.forEach(id => {
        this.messageContentCache.delete(id);
        const msg = newMsgs.find(m => m.id === id);
        if (msg) {
          try {
            const parsed = JSON.parse(msg.content);
            if (parsed.files?.length > 0) {
              parsed.files.forEach((file: any) => {
                const cacheKey = file.uniqueFileName || file.fileName;
                this.urlCache.delete(cacheKey);
              });
            }
          } catch (e) {}
        }
      });
    }
  
    this.messages.sort((a, b) => 
      new Date(a.sendTime).getTime() - new Date(b.sendTime).getTime()
    );
  
    this.latestMessageTime = this.messages.length > 0
      ? Math.max(...this.messages.map(m => new Date(m.sendTime).getTime()))
      : 0;
  
    this.cdr.markForCheck();
  
    if (this.shouldScrollToBottom || this.isScrolledToBottom()) {
      setTimeout(() => {
        this.scrollToBottomBase(this.scrollContainer);
      }, 100);
    }
  }

  protected loadMore() {
    if (this.loading || this.allLoaded) return;
  
    this.loading = true;
    const currentSkip = this.messages.length;
    const scrollContainer = this.scrollContainer?.nativeElement;
    const prevScrollHeight = scrollContainer ? scrollContainer.scrollHeight : 0;
    const prevScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;
  
    this.loadHistory(this.groupId, this.take, currentSkip)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newMsgs) => {          
          if (newMsgs.length === 0) {
            this.allLoaded = true;
            this.loading = false;
            this.cdr.markForCheck();
            return;
          }
  
          const filtered = newMsgs.filter(m => !m.isDeleted || this.isMyMessage(m));
  
          if (filtered.length === 0) {
            this.loading = false;
            if (newMsgs.length < this.take) {
              this.allLoaded = true;
            } else {
              setTimeout(() => this.loadMore(), 100);
            }
            this.cdr.markForCheck();
            return;
          }
  
          const existingIds = new Set(this.messages.map(m => m.id));
          const unique = filtered.filter(m => !existingIds.has(m.id));
  
          if (unique.length === 0) {
            if (filtered.length < this.take) {
              this.allLoaded = true;
            } else {
              setTimeout(() => this.loadMore(), 100);
            }
            this.loading = false;
            this.cdr.markForCheck();
            return;
          }
  
          this.loadFilesForMessages(unique);
          this.messages = [...unique, ...this.messages];
          if (unique.length < this.take) {
            this.allLoaded = true;
          }
  
          setTimeout(() => this.restoreScrollPosition(prevScrollHeight, prevScrollTop), 0);
          setTimeout(() => this.restoreScrollPosition(prevScrollHeight, prevScrollTop), 50);
          setTimeout(() => this.restoreScrollPosition(prevScrollHeight, prevScrollTop), 100);
          setTimeout(() => this.restoreScrollPosition(prevScrollHeight, prevScrollTop), 200);
  
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

  isMyMessage(msg: GroupMessage): boolean {
    return this.isMyMessageBase(msg);
  }

  isMessageDeleted(msg: GroupMessage): boolean {
    return this.isMessageDeletedBase(msg);
  }

  getMessageContent(msg: GroupMessage): string {
    return this.getMessageContentBase(msg);
  }

  isMessageHighlighted(id: string): boolean {
    return this.isMessageHighlightedBase(id);
  }

  highlightMessage(messageId: string) {
    this.highlightMessageBase(messageId);
  }

  shouldShowSenderName(messages: GroupMessage[], idx: number): boolean {
    return this.shouldShowSenderNameBase(messages, idx);
  }

  getMemberAvatar(nick: string, oldNick?: string, forceRefresh = false): string | undefined {
    if (!nick) return undefined;

    const cleanNick = nick.trim().toLowerCase();
    const cleanOld = oldNick?.trim().toLowerCase();

    if (forceRefresh) {
      this.avatarCache.delete(cleanNick);
      if (cleanOld) this.avatarCache.delete(cleanOld);
    }

    if (!forceRefresh && this.avatarCache.has(cleanNick)) {
      return this.avatarCache.get(cleanNick) ?? undefined;
    }

    if (!forceRefresh && cleanOld && this.avatarCache.has(cleanOld)) {
      const cached = this.avatarCache.get(cleanOld);
      if (cached) {
        this.avatarCache.set(cleanNick, cached);
        return cached;
      }
    }

    const mLocal = this.localMembers.find(m =>
      m.nickName.trim().toLowerCase() === cleanNick ||
      (cleanOld && m.nickName.trim().toLowerCase() === cleanOld)
    );

    if (mLocal?.image) {
      const image = mLocal.image.trim();
      this.avatarCache.set(cleanNick, image);
      if (cleanOld) this.avatarCache.set(cleanOld, image);
      return image;
    }

    const mOriginal = this.members.find(m =>
      m.nickName.trim().toLowerCase() === cleanNick ||
      (cleanOld && m.nickName.trim().toLowerCase() === cleanOld)
    );

    if (mOriginal?.image) {
      const image = mOriginal.image.trim();
      this.avatarCache.set(cleanNick, image);
      if (cleanOld) this.avatarCache.set(cleanOld, image);
      return image;
    }

    if (this.localMembers.length > 0) {
      this.avatarCache.set(cleanNick, undefined);
      if (cleanOld) this.avatarCache.set(cleanOld, undefined);
    }

    return undefined;
  }

  getMessageAvatar(msg: GroupMessage): string | undefined {
    const oldSender = (msg as any).oldSender;
    const force = !!oldSender;
    return this.getMemberAvatar(msg.sender, oldSender, force);
  }

  isImageFile(file: any): boolean {
    return file.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.fileName);
  }

  isVideoFile(file: any): boolean {
    return file.type?.startsWith('video/') || /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(file.fileName);
  }

  isAudioFile(file: any): boolean {
    return file.type?.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(file.fileName);
  }

  override formatFileSize(bytes: number): string {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  downloadFile(file: any): void {
    if (file.url) {
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.fileName || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  markFileAsRefreshing(file: any, isRefreshing: boolean): void {
    file.isRefreshing = isRefreshing;
    this.cdr.markForCheck();
  }
}