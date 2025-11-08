import { Injectable } from '@angular/core';
import { OtoMessage } from '../../../entities/oto-message';
import { OtoMessagesService } from '../api/oto-message/oto-messages.api';
import { FileEditStateService } from './file-edit-state-service';
import { MessageStateService } from './message-state.service';
import { MessageCacheService } from './messages-cache-service';
import { ToastService } from '../../../shared/ui-elements';

export interface EditCompleteResult {
  success: boolean;
  error?: string;
}

export interface MessageContent {
  text: string;
  files: any[];
}

@Injectable({ providedIn: 'root' })
export class MessageOperationsService {
  constructor(
    private messageService: OtoMessagesService,
    private fileEditStateService: FileEditStateService,
    private messageStateService: MessageStateService,
    private messageCacheService: MessageCacheService,
    private toastService: ToastService
  ) {}

  parseMessageContent(message: OtoMessage, messagesWidget?: any): MessageContent {
    if (messagesWidget?.parseContent) {
      return messagesWidget.parseContent(message);
    }
    
    try {
      return JSON.parse(message.content);
    } catch {
      return { text: message.content, files: [] };
    }
  }

  extractOriginalFiles(files: any[]): any[] {
    return files.map((f: any) => ({
      ...f,
      originalUniqueId: f.uniqueId || f.uniqueFileName,
      originalFileName: f.fileName,
      originalUniqueFileName: f.uniqueFileName
    }));
  }

  startEditMessage(message: OtoMessage, messagesWidget?: any): {
    editingMessage: OtoMessage & { parsedFiles?: any[] };
    originalFiles: any[];
  } {
    const parsedContent = this.parseMessageContent(message, messagesWidget);
    
    const editingMessage = {
      ...message,
      content: JSON.stringify({
        text: parsedContent.text || '',
        files: parsedContent.files || []
      }),
      parsedFiles: parsedContent.files || []
    } as OtoMessage & { parsedFiles?: any[] };
    
    const originalFiles = this.extractOriginalFiles(parsedContent.files || []);
    this.fileEditStateService.setEditingOriginalFiles(originalFiles);
    
    return { editingMessage, originalFiles };
  }

  async completeEdit(
    editData: { messageId: string; content: string },
    currentUserNickName: string,
    messagesWidget?: any
  ): Promise<EditCompleteResult> {
    try {
      const { parsedContent, filesToDelete } = await this.prepareEditData(
        editData,
        currentUserNickName
      );

      await this.deleteRemovedFiles(currentUserNickName);
      
      if (filesToDelete.length > 0) {
        await this.fileEditStateService.deleteReplacedFiles(
          filesToDelete,
          currentUserNickName
        );
      }

      await this.messageService.editMessage(editData.messageId, editData.content);
      
      this.updateMessageCache(editData.messageId, editData.content, parsedContent, messagesWidget);
      
      this.messageStateService.forceMessageUpdate(editData.messageId);
      this.messageStateService.scrollToBottom();
      
      this.fileEditStateService.clearEditingOriginalFiles();
      
      return { success: true };
    } catch (error) {
      console.error('Error in completeEdit:', error);
      return { success: false, error: String(error) };
    }
  }

  private async prepareEditData(
    editData: { messageId: string; content: string },
    currentUserNickName: string
  ): Promise<{ parsedContent: any; filesToDelete: string[] }> {
    const filesToDelete: string[] = [];
    let parsedContent: any;
    
    try {
      parsedContent = JSON.parse(editData.content);
      
      if (parsedContent.files && parsedContent.files.length > 0) {
        for (const file of parsedContent.files) {
          if (file._replacesFile) {
            filesToDelete.push(file._replacesFile);
            delete file._replacesFile;
          }
        }
        
        parsedContent.files = await this.fileEditStateService.updateFileDownloadUrls(
          parsedContent.files,
          currentUserNickName
        );
        
        editData.content = JSON.stringify(parsedContent);
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      parsedContent = null;
    }
    
    return { parsedContent, filesToDelete };
  }

  private async deleteRemovedFiles(currentUserNickName: string): Promise<void> {
    const originalFiles = this.fileEditStateService.editingOriginalFiles;
    
    if (!originalFiles || originalFiles.length === 0) return;
    
    const result = await this.fileEditStateService.deleteRemovedFilesAfterEdit(
      originalFiles,
      [], 
      currentUserNickName
    );
    
    if (!result.success && result.failedCount > 0) {
      this.toastService.show(
        `Warning: ${result.failedCount} file(s) could not be deleted from storage`,
        'error'
      );
    }
  }

  private updateMessageCache(
    messageId: string,
    content: string,
    parsedContent: any,
    messagesWidget?: any
  ): void {
    if (!messagesWidget) return;
    
    this.messageCacheService.invalidateMessage(messageId);
    
    const message = messagesWidget.messages?.find((m: OtoMessage) => m.messageId === messageId);
    if (message) {
      delete (message as any).parsedContent;
      delete (message as any)._hasTemporaryChanges;
      message.content = content;
      (message as any)._version = Date.now();
    }
    
    if (parsedContent?.files) {
      parsedContent.files.forEach((file: any) => {
        const cacheKeys = [file.uniqueFileName, file.fileName].filter(Boolean);
        cacheKeys.forEach(key => {
          this.messageCacheService.setCachedUrl(key, file.url);
        });
      });
    }
  }

  async cancelEdit(
    editingMessage: OtoMessage | undefined,
    currentUserNickName: string
  ): Promise<void> {
    await this.fileEditStateService.cleanupTemporaryFiles(
      editingMessage,
      currentUserNickName
    );
    
    this.fileEditStateService.clearEditingOriginalFiles();
  }

  async replaceFileInMessage(
    oldFile: any,
    newFile: File,
    messageId: string,
    editingMessage: OtoMessage,
    currentUserNickName: string,
    messagesWidget?: any
  ): Promise<{
    updatedEditingMessage: OtoMessage;
    updatedMessagesArray?: OtoMessage[];
  }> {
    const newFileData = await this.fileEditStateService.replaceFileInMessage(
      oldFile,
      newFile,
      currentUserNickName
    );

    const updatedEditingMessage = this.messageCacheService.updateEditingMessageFile(
      editingMessage,
      oldFile,
      newFileData
    );

    let updatedMessagesArray: OtoMessage[] | undefined;
    if (messagesWidget?.messages) {
      updatedMessagesArray = this.messageCacheService.updateMessagesArrayWithFile(
        messagesWidget.messages,
        messageId,
        oldFile,
        newFileData
      );
    }

    this.messageCacheService.invalidateMessage(messageId);
    this.messageCacheService.forceReloadImages(messageId);

    return { updatedEditingMessage, updatedMessagesArray };
  }

  async deleteMessage(
    message: OtoMessage,
    deleteForBoth: boolean,
    currentUserNickName: string
  ): Promise<{ success: boolean; error?: string }> {
    const deleteType = deleteForBoth ? 'hard' : 'soft';
    const messageId = message.messageId;
    
    try {
      if (deleteType === 'hard') {
        const result = await this.fileEditStateService.deleteFilesFromMessage(
          message,
          currentUserNickName
        );
        
        if (result.failedFiles.length > 0) {
          console.warn('Some files failed to delete:', result.failedFiles);
        }
      }
      
      await this.messageService.deleteMessage(messageId, deleteType);
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting message:', error);
      return { success: false, error: String(error) };
    }
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
}