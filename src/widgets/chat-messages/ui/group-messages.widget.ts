import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, AfterViewInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GroupMessage } from '../../../entities/group-message';
import { isToday, truncateText, computeContextMenuPosition } from '../../../shared/realtime';
import { BaseChatMessagesWidget } from '../../../shared/chat-widget';
import { ImageViewerItem, ImageViewerComponent } from '../../../shared/image-viewer';
import { FileUploadApiService, FileUrl } from '../../../features/file-sender';
import { CustomAudioPlayerComponent } from "../../../shared/custom-player/component/custom-audio-player.component";

@Component({
  selector: 'widgets-group-messages',
  standalone: true,
  imports: [CommonModule, TranslateModule, ImageViewerComponent, CustomAudioPlayerComponent],
  templateUrl: './group-messages.widget.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroupMessagesWidget extends BaseChatMessagesWidget<GroupMessage> implements OnChanges, AfterViewInit, OnDestroy {
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
  take = 20;
  skip = 0;
  showImageViewer = false;
  imageViewerImages: ImageViewerItem[] = [];
  imageViewerInitialIndex = 0;
  imageViewerKey = 0;
  private avatarCache = new Map<string, string | undefined>();
  
  private urlCache = new Map<string, { url: string; timestamp: number }>();
  private readonly URL_EXPIRATION_TIME = 55 * 60 * 1000; 
  private refreshingUrls = new Set<string>();

  constructor(
    private cdr: ChangeDetectorRef,
    private fileUploadApi: FileUploadApiService
  ) {
    super();
  }

  override getMessageIdFromMessage(msg: GroupMessage): string {
    return msg.id || '';
  }

  private isUrlExpired(timestamp: number): boolean {
    return Date.now() - timestamp > this.URL_EXPIRATION_TIME;
  }

  private async refreshFileUrl(fileName: string, uniqueFileName: string): Promise<string | null> {
    const cacheKey = uniqueFileName || fileName;

    if (this.refreshingUrls.has(cacheKey)) {
      return null;
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
      }
    } catch (error) {
      console.error('❌ Failed to refresh URL:', fileName, error);
    } finally {
      this.refreshingUrls.delete(cacheKey);
    }

    return null;
  }

  parseContent(msg: GroupMessage): { text: string; files: any[] } {
    const currentContent = msg.content;
    const messageId = this.getMessageIdFromMessage(msg);
    const cachedContent = this.messageContentCache.get(messageId);
    const hasCachedResult = !!(msg as any).parsedContent;

    if (cachedContent !== currentContent || !hasCachedResult) {
      delete (msg as any).parsedContent;
      this.messageContentCache.delete(messageId);
      this.messageContentCache.set(messageId, currentContent);

      try {
        const parsed = JSON.parse(currentContent);
        if (parsed.files && Array.isArray(parsed.files)) {
          parsed.files = parsed.files.map((file: any, index: number) => {
            const cacheKey = file.uniqueFileName || file.fileName;
            const cachedUrl = this.urlCache.get(cacheKey);

            if (cachedUrl && this.isUrlExpired(cachedUrl.timestamp)) {
              this.refreshFileUrl(file.fileName, file.uniqueFileName).then(newUrl => {
                if (newUrl) {
                  file.url = newUrl;
                  file._refreshKey = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                  this.cdr.markForCheck();
                }
              });
            } else if (cachedUrl) {
              file.url = cachedUrl.url;
            } else if (file.url) {
              this.urlCache.set(cacheKey, {
                url: file.url,
                timestamp: Date.now()
              });
            }

            return {
              ...file,
              type: file.type || this.detectFileType(file.fileName),
              uniqueId: file.uniqueFileName || file.url || `${file.fileName}_${Date.now()}_${index}`,
              _refreshKey: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
          });

          (msg as any).parsedContent = { text: parsed.text || '', files: parsed.files };
        } else {
          (msg as any).parsedContent = { text: parsed.text || currentContent, files: [] };
        }
        return (msg as any).parsedContent;
      } catch (e) {
        (msg as any).parsedContent = { text: currentContent, files: [] };
        return (msg as any).parsedContent;
      }
    }

    return (msg as any).parsedContent;
  }

  onImageError(event: Event, file: any, messageId: string) {
    const img = event.target as HTMLImageElement;
    if (img.dataset['retryCount']) {
      const retryCount = parseInt(img.dataset['retryCount']);
      if (retryCount >= 3) {
        console.error('❌ Max retries reached for:', file.fileName);
        file.isRefreshing = false;
        this.cdr.markForCheck();
        return;
      }
      img.dataset['retryCount'] = (retryCount + 1).toString();
    } else {
      img.dataset['retryCount'] = '1';
    }

    file.isRefreshing = true;
    this.cdr.markForCheck();

    this.refreshFileUrl(file.fileName, file.uniqueFileName).then(newUrl => {
      file.isRefreshing = false;
      
      if (newUrl) {
        const message = this.messages.find(m => this.getMessageIdFromMessage(m) === messageId);
        if (message) {
          const parsed = this.parseContent(message);
          const fileIndex = parsed.files.findIndex(f => 
            f.fileName === file.fileName || f.uniqueFileName === file.uniqueFileName
          );
          if (fileIndex !== -1) {
            parsed.files[fileIndex].url = newUrl;
            parsed.files[fileIndex]._refreshKey = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            parsed.files[fileIndex].isRefreshing = false;
            message.content = JSON.stringify(parsed);
            delete (message as any).parsedContent;
            this.messageContentCache.delete(messageId);
            this.cdr.markForCheck();
          }
        }
      } else {
        this.cdr.markForCheck();
      }
    }).catch(error => {
      console.error('❌ Error refreshing URL:', error);
      file.isRefreshing = false;
      this.cdr.markForCheck();
    });
  }

  openFileViewer(fileIndex: number, messageId: string) {
    const sourceMessage = this.messages.find(msg => this.getMessageIdFromMessage(msg) === messageId);
    if (!sourceMessage) return;

    const sourceContent = this.parseContent(sourceMessage);
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
      sender: sourceMessage.sender
    }));

    this.imageViewerInitialIndex = mediaIndex;
    this.imageViewerKey++;
    this.showImageViewer = true;
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

  private async loadFilesForMessages(messages: GroupMessage[]) {
    const fileNames: string[] = [];
    const messageFileMap = new Map<string, { messageIndex: number; fileIndex: number; originalName: string; uniqueFileName?: string }>();

    messages.forEach((msg, messageIndex) => {
      try {
        const parsed = JSON.parse(msg.content);
        if (parsed.files) {
          parsed.files.forEach((file: any, fileIndex: number) => {
            if (file.fileName) {
              fileNames.push(file.fileName);
              messageFileMap.set(`${file.fileName}_${messageIndex}_${fileIndex}`, {
                messageIndex,
                fileIndex,
                originalName: file.fileName,
                uniqueFileName: file.uniqueFileName
              });
            }
          });
        }
      } catch {}
    });

    if (fileNames.length === 0) return;

    try {
      const fileUrls = await this.fileUploadApi.getDownloadUrls(fileNames);
      const filesByOriginalName = new Map<string, FileUrl[]>();

      fileUrls.forEach(fileUrl => {
        if (!filesByOriginalName.has(fileUrl.originalName)) 
          filesByOriginalName.set(fileUrl.originalName, []);
        filesByOriginalName.get(fileUrl.originalName)!.push(fileUrl);
      });

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
        }
      });

      messages.forEach(msg => {
        delete (msg as any).parsedContent;
        this.messageContentCache.set(this.getMessageIdFromMessage(msg), msg.content);
      });

      this.cdr.detectChanges();
    } catch (error) {
      console.error('❌ Failed to load files:', error);
    }
  }

  ngAfterViewInit() {
    setTimeout(() => this.scrollToBottom(), 0);
    this.setupContextMenuListener();
    this.subscribeToUserInfoUpdates();
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
    this.urlCache.clear();
    this.refreshingUrls.clear();
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

  private scrollToBottom() {
    this.scrollToBottomBase(this.scrollContainer);
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

    this.messages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(newMsgs => {
        const filtered = newMsgs.filter(m => !m.isDeleted || this.isMyMessage(m));
        const newMap = new Map(filtered.map(m => [m.id, m]));
        const oldMap = new Map(this.messages.map(m => [m.id, m]));
        const hasNewMessages = filtered.some(m => !oldMap.has(m.id));

        for (const m of filtered) oldMap.set(m.id!, m);
        for (const id of Array.from(oldMap.keys())) {
          if (!newMap.has(id)) oldMap.delete(id);
        }

        const prevLength = this.messages.length;
        this.messages = Array.from(oldMap.values())
          .sort((a, b) => new Date(a.sendTime).getTime() - new Date(b.sendTime).getTime());

        if (prevLength === 0 && this.messages.length > 0) {
          this.skip = this.messages.length;
          this.loadFilesForMessages(this.messages);
        } else if (hasNewMessages) {
          const newMessages = this.messages.filter(m => !oldMap.has(m.id));
          if (newMessages.length > 0) {
            this.loadFilesForMessages(newMessages);
          }
        }

        if (hasNewMessages && (this.isScrolledToBottom() || this.shouldScrollToBottom)) {
          setTimeout(() => this.scrollToBottom(), 0);
          this.shouldScrollToBottom = false;
        }

        this.cdr.markForCheck();
      });
  }

  protected loadMore() {
    if (this.loading || this.allLoaded) return;
    this.loading = true;
    const currentSkip = this.skip;

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
            this.skip += newMsgs.length;
            this.loading = false;
            this.cdr.markForCheck();
            return;
          }

          const existingIds = new Set(this.messages.map(m => m.id));
          const unique = filtered.filter(m => !existingIds.has(m.id));

          if (unique.length === 0) {
            this.skip += filtered.length;
            this.loading = false;
            this.cdr.markForCheck();
            return;
          }

          this.loadFilesForMessages(unique);
          const prevHeight = this.scrollContainer?.nativeElement.scrollHeight || 0;
          this.messages = [...unique, ...this.messages];
          this.skip += unique.length;

          setTimeout(() => {
            if (this.scrollContainer) {
              const el = this.scrollContainer.nativeElement;
              const newHeight = el.scrollHeight;
              el.scrollTop = newHeight - prevHeight;
            }
          }, 0);

          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
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