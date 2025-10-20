import { Component, Input, Output, EventEmitter, OnChanges, 
  SimpleChanges, AfterViewInit, OnDestroy, ChangeDetectionStrategy, 
  ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { BaseChatMessagesWidget } from '../shared/widget';
import { OtoMessage } from '../../../entities/oto-message';
import { FileUploadApiService, FileUrl } from '../../../features/file-sender';
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

  @Output() editMessage = new EventEmitter<OtoMessage>();
  @Output() deleteMessage = new EventEmitter<OtoMessage>();
  @Output() replyToMessage = new EventEmitter<OtoMessage>();
  @Output() chatUserDeleted = new EventEmitter<void>();

  messages: OtoMessage[] = [];

  private historyLoadedCount = 0; 
  private latestMessageTime: number = 0; 

  constructor(
    protected override cdr: ChangeDetectorRef,
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
          this.loadFilesForMessages(messagesWithFiles);
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
  
  private urlCheckInterval?: any;
  
  private startUrlExpirationCheck() {
    this.urlCheckInterval = setInterval(() => {
      this.checkAndRefreshExpiredUrls();
    }, 5 * 60 * 1000);
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
                  this.messageContentCache.delete(item.messageId);
                }
              } catch (e) {
                console.error('Error updating message:', e);
              }
            }
          }
        });
  
        this.cdr.markForCheck();
      }).catch(error => {
        console.error('❌ Failed to refresh expired URLs:', error);
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
  
        if (typeof parsed === 'object' && parsed !== null &&
          (parsed.hasOwnProperty('text') || parsed.hasOwnProperty('files'))) {
          
          const filesWithType = (parsed.files || []).map((file: any, index: number) => {
            const cacheKey = file.uniqueFileName || file.fileName;
            const cachedUrl = this.urlCache.get(cacheKey);
  
            if (file.url && !cachedUrl) {
              file.needsLoading = true;
              file.isRefreshing = true;
              
              this.refreshFileUrl(file.fileName, file.uniqueFileName).then(newUrl => {
                if (newUrl) {
                  file.url = newUrl;
                  file.isRefreshing = false;
                  file._refreshKey = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                  
                  const message = this.messages.find(m => this.getMessageIdFromMessage(m) === messageId);
                  if (message) {
                    try {
                      const updatedParsed = JSON.parse(message.content);
                      const fileIndex = updatedParsed.files.findIndex((f: any) =>
                        (f.fileName === file.fileName && f.uniqueFileName === file.uniqueFileName) ||
                        f.uniqueId === file.uniqueId
                      );
                      
                      if (fileIndex !== -1) {
                        updatedParsed.files[fileIndex].url = newUrl;
                        updatedParsed.files[fileIndex]._refreshKey = file._refreshKey;
                        updatedParsed.files[fileIndex].isRefreshing = false;
                        message.content = JSON.stringify(updatedParsed);
                        delete (message as any).parsedContent;
                        this.messageContentCache.delete(messageId);
                        this.cdr.markForCheck();
                      }
                    } catch (e) {
                    }
                  }
                  this.cdr.markForCheck();
                } else {
                  file.isRefreshing = false;
                  this.cdr.markForCheck();
                }
              });
            } else if (cachedUrl) {
              const urlExpired = this.isUrlExpired(cachedUrl.timestamp);
              const urlAboutToExpire = this.isUrlAboutToExpire(cachedUrl.timestamp);
  
              if (urlExpired || urlAboutToExpire) {
                file.isRefreshing = true;
                this.refreshFileUrl(file.fileName, file.uniqueFileName).then(newUrl => {
                  if (newUrl) {
                    file.url = newUrl;
                    file.isRefreshing = false;
                    file._refreshKey = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    
                    const message = this.messages.find(m => this.getMessageIdFromMessage(m) === messageId);
                    if (message) {
                      try {
                        const updatedParsed = JSON.parse(message.content);
                        const fileIndex = updatedParsed.files.findIndex((f: any) =>
                          (f.fileName === file.fileName && f.uniqueFileName === file.uniqueFileName) ||
                          f.uniqueId === file.uniqueId
                        );
                        
                        if (fileIndex !== -1) {
                          updatedParsed.files[fileIndex].url = newUrl;
                          updatedParsed.files[fileIndex]._refreshKey = file._refreshKey;
                          updatedParsed.files[fileIndex].isRefreshing = false;
                          message.content = JSON.stringify(updatedParsed);
                          delete (message as any).parsedContent;
                          this.messageContentCache.delete(messageId);
                          this.cdr.markForCheck();
                        }
                      } catch (e) {
                      }
                    }
                    this.cdr.markForCheck();
                  } else {
                    file.isRefreshing = false;
                    this.cdr.markForCheck();
                  }
                }).catch(error => {
                  file.isRefreshing = false;
                  this.cdr.markForCheck();
                });
              } else {
                file.url = cachedUrl.url;
              }
            } else if (!file.url) {
              file.needsLoading = true;
            }
  
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

  private async loadFilesForMessages(messages: OtoMessage[]) {
    if (!messages || messages.length === 0) return;

    try {
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
          
          if (parsed.files && Array.isArray(parsed.files)) {
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
        this.cdr.detectChanges();
        return;
      }
  
      const fileUrls = await this.fileUploadApi.getDownloadUrls(fileNames);  
      const filesByOriginalName = new Map<string, FileUrl[]>();
      fileUrls.forEach(fileUrl => {
        if (!filesByOriginalName.has(fileUrl.originalName)) {
          filesByOriginalName.set(fileUrl.originalName, []);
        }
        filesByOriginalName.get(fileUrl.originalName)!.push(fileUrl);
      });
  
      let updatedCount = 0;
  
      messageFileMap.forEach((mapping) => {
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
    this.messageContentCache.clear();
    this.chatUserDeleted.emit();
  }

  clearMessagesForDeletedUser(): void {
    this.messages = [];
    this.skip = 0;
    this.allLoaded = false;
    this.messageContentCache.clear();
  }

  protected initChat() {
    this.messages = [];
    this.skip = 0;
    this.allLoaded = false;
    this.shouldScrollToBottom = true;
    this.messageContentCache.clear();
    this.historyLoadedCount = 0;
    this.latestMessageTime = 0;
  
    if (this.messages$) {
      this.messages$
        .pipe(takeUntil(this.destroy$))
        .subscribe((newMsgs: OtoMessage[]) => {
          const filtered = newMsgs.filter(msg => !msg.isDeleted || !this.isMyMessage(msg));
          const isInitialLoad = this.messages.length === 0;
          const allMessagesMap = new Map(this.messages.map(m => [m.messageId, m]));
          
          for (const msg of filtered) {
            allMessagesMap.set(msg.messageId, msg);
          }
  
          this.messages = Array.from(allMessagesMap.values()).sort((a, b) =>
            new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
          );
  
          if (isInitialLoad && this.messages.length > 0) {
  
            if (this.messages.length > 0) {
              const sortedMessages = [...this.messages].sort((a, b) => 
                new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
              );
              this.latestMessageTime = new Date(sortedMessages[0].sentAt).getTime();
            }
  
            const messagesWithFiles = this.messages.filter(msg => {
              try {
                const parsed = JSON.parse(msg.content);
                return parsed.files && parsed.files.length > 0;
              } catch {
                return false;
              }
            });
  
            if (messagesWithFiles.length > 0) {
              this.loadFilesForMessages(messagesWithFiles);
            }
  
            setTimeout(() => {
              this.scrollToBottomBase(this.scrollContainer);
            }, 100);
            
          } else if (!isInitialLoad) {
            const oldMessages = [...this.messages];
            const oldMessagesMap = new Map(oldMessages.map(m => [m.messageId, m]));
            const newMsgIds = new Set(filtered.map(m => m.messageId));
            const messagesToRemove = oldMessages.filter(msg => {
              const msgTime = new Date(msg.sentAt).getTime();
              const isRecent = msgTime > this.latestMessageTime || this.latestMessageTime === 0;
              const notInNewList = !newMsgIds.has(msg.messageId);
              return isRecent && notInNewList;
            });
            
            if (messagesToRemove.length > 0) {
              messagesToRemove.forEach(msg => {
                allMessagesMap.delete(msg.messageId);
              });
              
              this.messages = Array.from(allMessagesMap.values()).sort((a, b) =>
                new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
              );
            }
            
            const actuallyNewMessages = filtered.filter(msg => !oldMessagesMap.has(msg.messageId));
                        
            if (actuallyNewMessages.length > 0) {
              const realtimeNewMessages = actuallyNewMessages.filter(msg => 
                new Date(msg.sentAt).getTime() > this.latestMessageTime
              );
              
              if (realtimeNewMessages.length > 0) {
                const sortedNew = [...realtimeNewMessages].sort((a, b) => 
                  new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
                );
                const newestTime = new Date(sortedNew[0].sentAt).getTime();
                if (newestTime > this.latestMessageTime) {
                  this.latestMessageTime = newestTime;
                }
              }
              
              const messagesNeedingFiles = actuallyNewMessages.filter(msg => {
                try {
                  const parsed = JSON.parse(msg.content);
                  return parsed.files && parsed.files.length > 0;
                } catch {
                  return false;
                }
              });
              
              if (messagesNeedingFiles.length > 0) {
                this.loadFilesForMessages(messagesNeedingFiles);
              }
              
              if (realtimeNewMessages.length > 0) {
                const wasAtBottom = this.isScrolledToBottom();
                setTimeout(() => {
                  if (wasAtBottom) {
                    this.scrollToBottomBase(this.scrollContainer);
                  }
                }, 100);
              }
            }
          }
  
          this.cdr.markForCheck();
        });
    }
  
    setTimeout(() => {
      this.loadMore();
    }, 100);
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
          this.loadFilesForMessages(unique);
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

  trackByMessageId = this.trackByMessageBase;
  isToday = isToday;
  truncateText = truncateText;

  onScroll() {
    this.onScrollBase(this.scrollContainer);
  }

  scrollToMessage(messageId: string): void {
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
    if (msg.isDeleted) return msg.content;
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
}