import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ChatDraft {
  chatId: string;
  text: string;
  timestamp: number;
}

export interface DraftState {
  currentDraft: string;
  currentChatId?: string;
  allDrafts: Map<string, ChatDraft>;
}

@Injectable({ providedIn: 'root' })
export class DraftStateService {
  private readonly STORAGE_KEY = 'chat_drafts';
  private readonly MAX_DRAFT_AGE = 7 * 24 * 60 * 60 * 1000;

  private currentDraftSubject = new BehaviorSubject<string>('');
  public currentDraft$: Observable<string> = this.currentDraftSubject.asObservable();

  private currentChatId?: string;
  private drafts = new Map<string, ChatDraft>();

  constructor() {
    this.loadDraftsFromStorage();
  }

  getCurrentDraft(): string {
    return this.currentDraftSubject.value;
  }

  setCurrentDraft(text: string): void {
    this.currentDraftSubject.next(text);

    if (this.currentChatId) {
      this.saveDraftForChat(this.currentChatId, text);
    }
  }

  clearCurrentDraft(): void {
    this.currentDraftSubject.next('');
    if (this.currentChatId) {
      this.deleteDraftForChat(this.currentChatId);
    }
  }

  switchToChat(chatId: string): void {
    if (this.currentChatId && this.currentDraftSubject.value) {
      this.saveDraftForChat(this.currentChatId, this.currentDraftSubject.value);
    }

    this.currentChatId = chatId;
    const draft = this.getDraftForChat(chatId);
    this.currentDraftSubject.next(draft?.text || '');
  }

  closeCurrentChat(): void {
    if (this.currentChatId && this.currentDraftSubject.value) {
      this.saveDraftForChat(this.currentChatId, this.currentDraftSubject.value);
    }

    this.currentChatId = undefined;
    this.currentDraftSubject.next('');
  }

  getCurrentChatId(): string | undefined {
    return this.currentChatId;
  }

  saveDraftForChat(chatId: string, text: string): void {
    if (!text || text.trim() === '') {
      this.deleteDraftForChat(chatId);
      return;
    }

    const draft: ChatDraft = {
      chatId,
      text: text.trim(),
      timestamp: Date.now()
    };

    this.drafts.set(chatId, draft);
    this.saveDraftsToStorage();
  }

  getDraftForChat(chatId: string): ChatDraft | undefined {
    return this.drafts.get(chatId);
  }

  deleteDraftForChat(chatId: string): void {
    this.drafts.delete(chatId);
    this.saveDraftsToStorage();
  }

  hasDraftForChat(chatId: string): boolean {
    return this.drafts.has(chatId);
  }

  getAllDrafts(): ChatDraft[] {
    return Array.from(this.drafts.values());
  }

  clearAllDrafts(): void {
    this.drafts.clear();
    this.currentDraftSubject.next('');
    this.currentChatId = undefined;
    this.saveDraftsToStorage();
  }

  cleanupOldDrafts(): void {
    const now = Date.now();
    const chatIdsToDelete: string[] = [];

    this.drafts.forEach((draft, chatId) => {
      if (now - draft.timestamp > this.MAX_DRAFT_AGE) {
        chatIdsToDelete.push(chatId);
      }
    });

    chatIdsToDelete.forEach(chatId => {
      this.drafts.delete(chatId);
    });

    if (chatIdsToDelete.length > 0) {
      this.saveDraftsToStorage();
    }
  }

  getDraftsCount(): number {
    return this.drafts.size;
  }

  private saveDraftsToStorage(): void {
    try {
      const draftsArray = Array.from(this.drafts.values());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(draftsArray));
    } catch (error) {
      console.error('Failed to save drafts to localStorage:', error);
    }
  }

  private loadDraftsFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return;

      const draftsArray: ChatDraft[] = JSON.parse(stored);
      
      this.drafts = new Map(
        draftsArray.map(draft => [draft.chatId, draft])
      );

      this.cleanupOldDrafts();
    } catch (error) {
      console.error('Failed to load drafts from localStorage:', error);
      this.drafts = new Map();
    }
  }

  private clearStorage(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear drafts from localStorage:', error);
    }
  }

  exportDrafts(): string {
    const draftsArray = Array.from(this.drafts.values());
    return JSON.stringify(draftsArray, null, 2);
  }

  importDrafts(jsonString: string): boolean {
    try {
      const draftsArray: ChatDraft[] = JSON.parse(jsonString);
      
      if (!Array.isArray(draftsArray)) {
        throw new Error('Invalid format: expected array');
      }

      for (const draft of draftsArray) {
        if (!draft.chatId || !draft.text || !draft.timestamp) {
          throw new Error('Invalid draft structure');
        }
      }

      this.drafts = new Map(
        draftsArray.map(draft => [draft.chatId, draft])
      );
      this.saveDraftsToStorage();

      return true;
    } catch (error) {
      console.error('Failed to import drafts:', error);
      return false;
    }
  }

  getStatistics(): {
    total: number;
    totalCharacters: number;
    oldestTimestamp: number | null;
    newestTimestamp: number | null;
  } {
    const draftsArray = this.getAllDrafts();
    
    if (draftsArray.length === 0) {
      return {
        total: 0,
        totalCharacters: 0,
        oldestTimestamp: null,
        newestTimestamp: null
      };
    }

    const totalCharacters = draftsArray.reduce(
      (sum, draft) => sum + draft.text.length, 
      0
    );

    const timestamps = draftsArray.map(d => d.timestamp);
    const oldestTimestamp = Math.min(...timestamps);
    const newestTimestamp = Math.max(...timestamps);

    return {
      total: draftsArray.length,
      totalCharacters,
      oldestTimestamp,
      newestTimestamp
    };
  }

  formatDraftDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  }

  destroy(): void {
    if (this.currentChatId && this.currentDraftSubject.value) {
      this.saveDraftForChat(this.currentChatId, this.currentDraftSubject.value);
    }
    this.currentDraftSubject.complete();
  }
}