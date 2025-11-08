import { Injectable, inject, ChangeDetectorRef } from '@angular/core';
import { combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { OtoChat } from './oto.chat';
import { OtoMessage } from '../../../entities/oto-message';
import { UserStateService, ChatState, UserDeletionInfo, UserUpdateInfo } from './user-state.service';
import { MessageStateService, MessageState } from './message-state.service';
import { UserSearchService, UserSearchState } from './user-search.service';
import { ChatNavigationService } from './chat-navigation.service';
import { FileEditStateService } from '../model/file-edit-state-service';
import { MessageCacheService } from '../model/messages-cache-service';
import { DraftStateService } from '../model/draft-state-service';
import { FileUploadOperationsService } from './file-upload-operations.service';

export interface CompleteChatState {
  chat: ChatState;
  messages: MessageState;
  search: UserSearchState;
  displayInfo: {
    displayName: string;
    displayImage: string;
  };
  userDeletedNotification: {
    show: boolean;
    userName: string;
  };
}

@Injectable({ providedIn: 'root' })
export class ChatFacadeService {
  private userStateService = inject(UserStateService);
  private messageStateService = inject(MessageStateService);
  private userSearchService = inject(UserSearchService);
  private chatNavigationService = inject(ChatNavigationService);
  private fileEditStateService = inject(FileEditStateService);
  private messageCacheService = inject(MessageCacheService);
  private draftStateService = inject(DraftStateService);
  private fileUploadOpsService = inject(FileUploadOperationsService);

  public fileEditState$ = this.fileEditStateService.fileEditState$;

  public completeChatState$ = combineLatest([
    this.userStateService.chatState$,
    this.messageStateService.messageState$,
    this.userSearchService.searchState$,
    this.userStateService.displayChatInfo$,
    this.userStateService.userDeletedNotification$
  ]).pipe(
    map(([chat, messages, search, displayInfo, userDeletedNotification]) => ({
      chat,
      messages,
      search,
      displayInfo,
      userDeletedNotification
    }))
  );

  public chatState$ = this.userStateService.chatState$;
  public messageState$ = this.messageStateService.messageState$;
  public searchState$ = this.userSearchService.searchState$;
  public displayChatInfo$ = this.userStateService.displayChatInfo$;
  public userDeletedNotification$ = this.userStateService.userDeletedNotification$;
  public user$ = this.userSearchService.user$;

  initializeChat(): void { this.chatNavigationService.checkForOpenChatUser(); }
  handlePendingChatUser(chatListComponent?: any): void { this.chatNavigationService.handlePendingChatUser(chatListComponent); }
  selectChat(chat: OtoChat): void { this.chatNavigationService.selectChat(chat); }
  selectFoundUser(userData: { nick: string; image: string }): void { this.chatNavigationService.selectFoundUser(userData); }
  openChatWithUser(userData: { nickName: string; image: string }): void { this.chatNavigationService.selectFoundUser({ nick: userData.nickName, image: userData.image }); }
  closeCurrentChat(): void { this.chatNavigationService.closeCurrentChat(); }

  async sendMessage(content: string): Promise<void> { return this.messageStateService.sendMessage(content); }
  startEditMessage(message: OtoMessage): void { this.messageStateService.startEditMessage(message); }
  async completeEdit(messageId: string, content: string): Promise<void> { return this.messageStateService.completeEdit(messageId, content); }
  cancelEdit(): void { this.messageStateService.cancelEdit(); }
  startDeleteMessage(message: OtoMessage): void { this.messageStateService.startDeleteMessage(message); }
  async confirmDelete(): Promise<void> { return this.messageStateService.confirmDelete(); }
  closeDeleteModal(): void { this.messageStateService.closeDeleteModal(); }
  setDeleteForBoth(value: boolean): void { this.messageStateService.setDeleteForBoth(value); }
  startReplyToMessage(message: OtoMessage): void { this.messageStateService.startReplyToMessage(message); }
  cancelReply(): void { this.messageStateService.cancelReply(); }

  onSearchQueryChange(query: string): void { this.userSearchService.onSearchQueryChange(query); }
  onSearchFocus(): void { this.userSearchService.onSearchFocus(); }
  onSearchActiveChange(isActive: boolean): void { this.userSearchService.onSearchActiveChange(isActive); }
  clearSearch(): void { this.userSearchService.clearSearch(); }
  onSearchResult(results: string[]): void { this.userSearchService.onSearchResult(results); }
  startChatWithUser(userData: { nick: string; image: string }): void { this.userSearchService.startChatWithUser(userData); }

  subscribeToUserDeletion(callback: (deletedUserInfo: UserDeletionInfo) => void) { return this.userStateService.subscribeToUserDeletion(callback); }
  subscribeToUserInfoUpdates(callback: (userInfo: UserUpdateInfo) => void) { return this.userStateService.subscribeToUserInfoUpdates(callback); }
  handleUserDeletion(deletedUserInfo: UserDeletionInfo) { return this.userStateService.handleUserDeletion(deletedUserInfo); }
  handleUserInfoUpdate(userInfo: UserUpdateInfo) { return this.userStateService.handleUserInfoUpdate(userInfo); }
  refreshChats(): void { this.userStateService.refreshChats(); }

  getCurrentChatState(): ChatState { return { selectedChat: this.userStateService.getSelectedChat(), selectedChatImage: this.userStateService.getSelectedChatImage(), selectedOtoChat: this.userStateService.getSelectedOtoChat(), currentUserNickName: this.userStateService.getCurrentUserNickName() }; }
  getCurrentMessageState(): MessageState { return this.messageStateService.getCurrentMessageState(); }
  getCurrentSearchState(): UserSearchState { return this.userSearchService.getCurrentSearchState(); }
  isChatWithCurrentUser(chatNickName: string): boolean { return this.userStateService.isChatWithCurrentUser(chatNickName); }
  getDisplayChatName(chatNickName: string): string { return this.userStateService.getDisplayChatName(chatNickName); }
  sortChats(chats: OtoChat[]): OtoChat[] { return this.userStateService.sortChats(chats); }
  isChatActive(chatNickName: string): boolean { return this.userStateService.isChatActive(chatNickName); }
  resetAllStates(): void { this.chatNavigationService.resetSelectedChat(); }
  resetEditingStates(): void { this.messageStateService.resetEditingStates(); }


  get isEditFileUploading(): boolean { 
    return this.fileEditStateService.isEditFileUploading; 
  }
  
  get editingOriginalFiles(): Array<any> { 
    return this.fileEditStateService.editingOriginalFiles; 
  }
  
  setEditingOriginalFiles(files: Array<any>): void { 
    this.fileEditStateService.setEditingOriginalFiles(files); 
  }
  
  clearEditingOriginalFiles(): void { 
    this.fileEditStateService.clearEditingOriginalFiles(); 
  }
  
  async addFilesToEditingMessage(
    editingMessage: OtoMessage,
    files: File[],
    message: string | undefined,
    currentUserNickName: string
  ): Promise<OtoMessage> {
    return this.fileEditStateService.addFilesToEditingMessage(
      editingMessage, 
      files, 
      message, 
      currentUserNickName
    );
  }
  
  async replaceFileInMessage(
    oldFile: any,
    newFile: File,
    currentUserNickName: string
  ): Promise<any> {
    return this.fileEditStateService.replaceFileInMessage(
      oldFile, 
      newFile, 
      currentUserNickName
    );
  }
  
  async deleteFilesFromMessage(
    message: OtoMessage,
    currentUserNickName: string
  ): Promise<{ success: boolean; failedFiles: string[] }> {
    return this.fileEditStateService.deleteFilesFromMessage(
      message, 
      currentUserNickName
    );
  }
  
  async deleteRemovedFilesAfterEdit(
    originalFiles: any[],
    finalFiles: any[],
    currentUserNickName: string
  ): Promise<{ success: boolean; failedCount: number }> {
    return this.fileEditStateService.deleteRemovedFilesAfterEdit(
      originalFiles, 
      finalFiles, 
      currentUserNickName
    );
  }
  
  async deleteReplacedFiles(
    uniqueFileNames: string[],
    currentUserNickName: string
  ): Promise<void> {
    return this.fileEditStateService.deleteReplacedFiles(
      uniqueFileNames, 
      currentUserNickName
    );
  }
  
  async cleanupTemporaryFiles(
    editingMessage: OtoMessage | undefined,
    currentUserNickName: string
  ): Promise<void> {
    return this.fileEditStateService.cleanupTemporaryFiles(
      editingMessage, 
      currentUserNickName
    );
  }
  
  async updateFileDownloadUrls(
    files: any[],
    currentUserNickName: string
  ): Promise<any[]> {
    return this.fileEditStateService.updateFileDownloadUrls(
      files, 
      currentUserNickName
    );
  }
  
  resetFileEditState(): void { 
    this.fileEditStateService.resetState(); 
  }

  invalidateMessageCache(messageId: string): void {
    this.messageCacheService.invalidateMessage(messageId);
  }

  clearAllMessageCaches(): void {
    this.messageCacheService.clearAllCaches();
  }

  clearMessageWithMetadata(messageId: string, message: OtoMessage): void {
    this.messageCacheService.clearMessageWithMetadata(messageId, message);
  }

  forceCompleteMessageUpdate(messageId: string, cdr?: ChangeDetectorRef): void {
    this.messageCacheService.forceCompleteMessageUpdate(messageId, cdr);
  }

  forceReloadImages(messageId: string): void {
    this.messageCacheService.forceReloadImages(messageId);
  }

  invalidateAndUpdateMessage(messageId: string, cdr?: ChangeDetectorRef): void {
    this.messageCacheService.invalidateAndUpdate(messageId, cdr);
  }

  getCachedUrl(key: string) {
    return this.messageCacheService.getCachedUrl(key);
  }

  setCachedUrl(key: string, url: string): void {
    this.messageCacheService.setCachedUrl(key, url);
  }

  invalidateUrlsByKeys(keys: string[]): void {
    this.messageCacheService.invalidateUrlsByKeys(keys);
  }

  isUrlExpired(timestamp: number): boolean {
    return this.messageCacheService.isUrlExpired(timestamp);
  }

  generateFileVersion(options: any) {
    return this.messageCacheService.generateFileVersion(options);
  }

  enhanceFileWithVersion(file: any, options?: any): any {
    return this.messageCacheService.enhanceFileWithVersion(file, options);
  }

  generateUniqueFileId(fileName: string): string {
    return this.messageCacheService.generateUniqueFileId(fileName);
  }

  generateRefreshKey(): string {
    return this.messageCacheService.generateRefreshKey();
  }

  updateEditingMessageFile(editingMessage: OtoMessage, oldFile: any, newFileData: any): OtoMessage {
    return this.messageCacheService.updateEditingMessageFile(editingMessage, oldFile, newFileData);
  }

  updateMessagesArrayWithFile(
    messages: OtoMessage[],
    messageId: string,
    oldFile: any,
    newFileData: any
  ): OtoMessage[] {
    return this.messageCacheService.updateMessagesArrayWithFile(messages, messageId, oldFile, newFileData);
  }

  get messageContentCache() {
    return this.messageCacheService.messageContentCache;
  }

  get urlCache() {
    return this.messageCacheService.urlCache;
  }

  getTimestamp(): number {
    return this.messageCacheService.getTimestamp();
  }

  getRandomKey(): string {
    return this.messageCacheService.generateRandomKey();
  }

  setMessagesWidget(widget: any): void {
    this.messageCacheService.setMessagesWidget(widget);
  }  

  get currentDraft$() {
    return this.draftStateService.currentDraft$;
  }

  getCurrentDraft(): string {
    return this.draftStateService.getCurrentDraft();
  }

  setCurrentDraft(text: string): void {
    this.draftStateService.setCurrentDraft(text);
  }

  clearCurrentDraft(): void {
    this.draftStateService.clearCurrentDraft();
  }

  switchToChatDraft(chatId: string): void {
    this.draftStateService.switchToChat(chatId);
  }

  closeCurrentChatDraft(): void {
    this.draftStateService.closeCurrentChat();
  }

  saveDraftForChat(chatId: string, text: string): void {
    this.draftStateService.saveDraftForChat(chatId, text);
  }

  getDraftForChat(chatId: string) {
    return this.draftStateService.getDraftForChat(chatId);
  }

  deleteDraftForChat(chatId: string): void {
    this.draftStateService.deleteDraftForChat(chatId);
  }

  hasDraftForChat(chatId: string): boolean {
    return this.draftStateService.hasDraftForChat(chatId);
  }

  clearAllDrafts(): void {
    this.draftStateService.clearAllDrafts();
  }

  getDraftsStatistics() {
    return this.draftStateService.getStatistics();
  }

  async uploadAndSendFiles(selectedChat: string, currentUserNickName: string) {
    return this.fileUploadOpsService.uploadAndSend(selectedChat, currentUserNickName);
  }
  
  cancelFileUpload(index: number): void {
    this.fileUploadOpsService.cancelFileUpload(index);
  }
  
  removeFileFromList(index: number): void {
    this.fileUploadOpsService.removeFileFromList(index);
  }
  
  closeUploadModal(): void {
    this.fileUploadOpsService.closeUploadModal();
  }
  
  handleModalFileInput(event: Event): void {
    this.fileUploadOpsService.handleModalFileInput(event);
  }
  
  handleFileDrop(files: File[], selectedChat: string, draftText: string, isEditing: boolean) {
    return this.fileUploadOpsService.handleFileDrop(files, selectedChat, draftText, isEditing);
  }
  
  checkUploadSizeLimit(): void {
    this.fileUploadOpsService.checkUploadSizeLimit();
  }
}