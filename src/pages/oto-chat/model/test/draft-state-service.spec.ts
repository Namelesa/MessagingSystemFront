import { DraftStateService, ChatDraft } from '../draft-state-service';

describe('DraftStateService', () => {
  let service: DraftStateService;

  beforeEach(() => {
    localStorage.clear();
    service = new DraftStateService();
  });

  it('should initialize with empty draft', () => {
    expect(service.getCurrentDraft()).toBe('');
    expect(service.getCurrentChatId()).toBeUndefined();
  });

  it('should set and get current draft', () => {
    service.switchToChat('chat1');
    service.setCurrentDraft('hello');

    expect(service.getCurrentDraft()).toBe('hello');
    expect(service.getDraftForChat('chat1')!.text).toBe('hello');
  });

  it('should clear current draft', () => {
    service.switchToChat('chat1');
    service.setCurrentDraft('abc');

    service.clearCurrentDraft();

    expect(service.getCurrentDraft()).toBe('');
    expect(service.getDraftForChat('chat1')).toBeUndefined();
  });

  it('should save draft when switching chats', () => {
    service.switchToChat('chat1');
    service.setCurrentDraft('text1');

    service.switchToChat('chat2');
    service.setCurrentDraft('text2');

    expect(service.getDraftForChat('chat1')!.text).toBe('text1');
    expect(service.getDraftForChat('chat2')!.text).toBe('text2');
  });

  it('should load draft when switching back to a chat', () => {
    service.switchToChat('chatA');
    service.setCurrentDraft('hello');

    service.switchToChat('chatB');
    service.setCurrentDraft('second');

    service.switchToChat('chatA');
    expect(service.getCurrentDraft()).toBe('hello');
  });

  it('should close chat and save draft', () => {
    service.switchToChat('chatX');
    service.setCurrentDraft('draftX');

    service.closeCurrentChat();

    expect(service.getCurrentDraft()).toBe('');
    expect(service.getCurrentChatId()).toBeUndefined();
    expect(service.getDraftForChat('chatX')!.text).toBe('draftX');
  });

  it('should delete draft for empty text', () => {
    service.switchToChat('chatZ');
    service.setCurrentDraft('something');

    service.saveDraftForChat('chatZ', ''); 

    expect(service.getDraftForChat('chatZ')).toBeUndefined();
  });

  it('should delete draft', () => {
    service.switchToChat('chat1');
    service.setCurrentDraft('toDelete');

    service.deleteDraftForChat('chat1');

    expect(service.getDraftForChat('chat1')).toBeUndefined();
  });

  it('should return all drafts', () => {
    service.switchToChat('1');
    service.setCurrentDraft('a');

    service.switchToChat('2');
    service.setCurrentDraft('b');

    expect(service.getAllDrafts().length).toBe(2);
  });

  it('should clear all drafts', () => {
    service.switchToChat('1');
    service.setCurrentDraft('a');

    service.switchToChat('2');
    service.setCurrentDraft('b');

    service.clearAllDrafts();

    expect(service.getAllDrafts().length).toBe(0);
    expect(service.getCurrentDraft()).toBe('');
    expect(service.getCurrentChatId()).toBeUndefined();
  });

  it('should cleanup old drafts', () => {
    const old = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const fresh = Date.now();

    localStorage.setItem(
      'chat_drafts',
      JSON.stringify([
        { chatId: 'old', text: 'xxx', timestamp: old },
        { chatId: 'new', text: 'yyy', timestamp: fresh }
      ])
    );

    service = new DraftStateService();

    expect(service.hasDraftForChat('old')).toBeFalse();
    expect(service.hasDraftForChat('new')).toBeTrue();
  });

  it('should import valid drafts', () => {
    const json = JSON.stringify([
      { chatId: '1', text: 'abc', timestamp: Date.now() }
    ]);

    const res = service.importDrafts(json);

    expect(res).toBeTrue();
    expect(service.hasDraftForChat('1')).toBeTrue();
  });

  it('should reject invalid import', () => {
    const json = JSON.stringify({ wrong: 'object' });
    const res = service.importDrafts(json);
    expect(res).toBeFalse();
  });

  it('should export drafts', () => {
    service.switchToChat('X');
    service.setCurrentDraft('test');

    const json = service.exportDrafts();
    const arr = JSON.parse(json);

    expect(arr.length).toBe(1);
    expect(arr[0].chatId).toBe('X');
  });

  it('should return correct statistics', () => {
    const now = Date.now();

    service['drafts'] = new Map([
      ['1', { chatId: '1', text: 'aaa', timestamp: now - 1000 }],
      ['2', { chatId: '2', text: 'b', timestamp: now }]
    ]);

    const stats = service.getStatistics();

    expect(stats.total).toBe(2);
    expect(stats.totalCharacters).toBe(4); 
    expect(stats.newestTimestamp).toBe(now);
  });

  it('should format draft date', () => {
    const now = Date.now();

    expect(service.formatDraftDate(now)).toBe('Just now');
    expect(service.formatDraftDate(now - 60000)).toBe('1 min ago');
  });

  it('should destroy service', () => {
    service.switchToChat('chatA');
    service.setCurrentDraft('hello');

    service.destroy();

    expect(service.getDraftForChat('chatA')!.text).toBe('hello');
  });

  it('should return correct drafts count', () => {
    service['drafts'].set('1', { chatId: '1', text: 'a', timestamp: Date.now() });
    service['drafts'].set('2', { chatId: '2', text: 'b', timestamp: Date.now() });
  
    expect(service.getDraftsCount()).toBe(2);
  });

  it('should clear storage by calling localStorage.removeItem', () => {
    const spy = spyOn(localStorage, 'removeItem');
  
    service['clearStorage']();
  
    expect(spy).toHaveBeenCalledWith(service['STORAGE_KEY']);
  });  
  
  it('should handle localStorage.removeItem error', () => {
    spyOn(localStorage, 'removeItem').and.throwError('fail');
    const consoleSpy = spyOn(console, 'error');
  
    service['clearStorage']();
  
    expect(consoleSpy).toHaveBeenCalled();
  });
  
  it('should format as hours ago', () => {
    const now = Date.now();
    const ts = now - 5 * 3600000; 
  
    expect(service.formatDraftDate(ts)).toBe('5 hours ago');
  });

  it('should format as days ago', () => {
    const now = Date.now();
    const ts = now - 3 * 86400000; 
  
    expect(service.formatDraftDate(ts)).toBe('3 days ago');
  });

  it('should format as 1 day ago', () => {
    const now = Date.now();
    const ts = now - 86400000;
  
    expect(service.formatDraftDate(ts)).toBe('1 day ago');
  });

  it('should return locale date for old timestamps (> 7 days)', () => {
    const now = Date.now();
    const ts = now - 10 * 86400000;
  
    const expected = new Date(ts).toLocaleDateString();
  
    expect(service.formatDraftDate(ts)).toBe(expected);
  });
  
  it('should log an error if localStorage.removeItem throws', () => {
    spyOn(localStorage, 'removeItem').and.throwError('LS error');
    const consoleSpy = spyOn(console, 'error');
  
    service['clearStorage']();
  
    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.calls.argsFor(0)[0]).toContain('Failed to clear drafts');
  });  

  it('should handle error in saveDraftsToStorage', () => {
    service['drafts'].set('1', {
      chatId: '1',
      text: 'abc',
      timestamp: Date.now()
    });
  
    spyOn(localStorage, 'setItem').and.throwError('Save error');
    const consoleSpy = spyOn(console, 'error');
  
    (service as any).saveDraftsToStorage();
  
    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.calls.argsFor(0)[0]).toContain('Failed to save drafts to localStorage');
  });

  it('should log an error if saveDraftsToStorage throws', () => {
    spyOn(localStorage, 'setItem').and.throwError('save error');
    const consoleSpy = spyOn(console, 'error');
  
    service['saveDraftsToStorage']();
  
    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.calls.argsFor(0)[0]).toContain('Failed to save drafts to localStorage');
  });
  
  it('should handle error in loadDraftsFromStorage and reset drafts', () => {
    spyOn(localStorage, 'getItem').and.returnValue('INVALID_JSON');
    const consoleSpy = spyOn(console, 'error');
  
    service = new DraftStateService();
  
    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.calls.argsFor(0)[0]).toContain('Failed to load drafts from localStorage');
    expect(service['drafts'].size).toBe(0);
  });  

  it('should handle saveDraftsToStorage error', () => {
    service['drafts'].set('1', { chatId: '1', text: 'abc', timestamp: Date.now() });
  
    spyOn(localStorage, 'setItem').and.throwError('save fail');
    const consoleSpy = spyOn(console, 'error');
  
    service['saveDraftsToStorage']();
  
    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.calls.argsFor(0)[0]).toContain('Failed to save drafts');
  });

  it('should handle loadDraftsFromStorage error', () => {
    spyOn(localStorage, 'getItem').and.returnValue('INVALID_JSON');
    const consoleSpy = spyOn(console, 'error');
  
    service['loadDraftsFromStorage']();
  
    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.calls.argsFor(0)[0]).toContain('Failed to load drafts');
    expect(service.getAllDrafts().length).toBe(0);
  });

  it('should return false for invalid draft structure inside array', () => {
    const badJson = JSON.stringify([{ chatId: '1' }]);
    const consoleSpy = spyOn(console, 'error');
  
    const result = service.importDrafts(badJson);
  
    expect(result).toBeFalse();
    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.calls.argsFor(0)[0]).toContain('Failed to import drafts');
  });  

  it('should log error if saveDraftsToStorage fails', () => {
    const spyStorage = spyOn(localStorage, 'setItem').and.throwError('fail');
    const spyConsole = spyOn(console, 'error');
  
    service['drafts'].set('1', { chatId: '1', text: 'a', timestamp: Date.now() });
  
    service['saveDraftsToStorage']();
  
    expect(spyConsole).toHaveBeenCalledWith(
      'Failed to save drafts to localStorage:',
      jasmine.any(Error)
    );
  });

  it('should handle loadDraftsFromStorage parse error', () => {
    spyOn(localStorage, 'getItem').and.returnValue('INVALID_JSON');
    const consoleSpy = spyOn(console, 'error');
  
    service['loadDraftsFromStorage']();
  
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to load drafts from localStorage:',
      jasmine.any(Error)
    );
    expect(service['drafts'].size).toBe(0);
  });
    
  it('should fail import when draft structure is invalid', () => {
    const badJson = JSON.stringify([{ chatId: '1', text: 'abc' }]);
  
    const consoleSpy = spyOn(console, 'error');
  
    const res = service.importDrafts(badJson);
  
    expect(res).toBeFalse();
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should return zero statistics when no drafts', () => {
    service['drafts'] = new Map();
  
    const stats = service.getStatistics();
  
    expect(stats.total).toBe(0);
    expect(stats.totalCharacters).toBe(0);
    expect(stats.oldestTimestamp).toBeNull();
    expect(stats.newestTimestamp).toBeNull();
  });
  
  it('should log an error if saveDraftsToStorage throws', () => {
    spyOn(localStorage, 'setItem').and.throwError('save error');
    const consoleSpy = spyOn(console, 'error');
  
    service['saveDraftsToStorage']();
  
    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.calls.argsFor(0)[0]).toContain('Failed to save drafts');
  });

  
  it('should handle error when loading drafts from storage', () => {
    spyOn(localStorage, 'getItem').and.throwError('load error');
    const consoleSpy = spyOn(console, 'error');
  
    service['loadDraftsFromStorage']();
  
    expect(consoleSpy).toHaveBeenCalled();
    expect(service['drafts'].size).toBe(0);
  });

  
  it('should fail import when draft structure is invalid', () => {
    const badJson = JSON.stringify([
      { chatId: '1', text: 'abc' }
    ]);
  
    const consoleSpy = spyOn(console, 'error');
  
    const result = service.importDrafts(badJson);
  
    expect(result).toBeFalse();
    expect(consoleSpy).toHaveBeenCalled();
  });

  
  it('should return empty statistics when no drafts exist', () => {
    service['drafts'] = new Map();
  
    const stats = service.getStatistics();
  
    expect(stats.total).toBe(0);
    expect(stats.totalCharacters).toBe(0);
    expect(stats.oldestTimestamp).toBeNull();
    expect(stats.newestTimestamp).toBeNull();
  });

  
  it('should return locale date string for timestamps older than 7 days', () => {
    const ts = Date.now() - 10 * 24 * 60 * 60 * 1000;
    const expected = new Date(ts).toLocaleDateString();
  
    expect(service.formatDraftDate(ts)).toBe(expected);
  });

  it('should log error if localStorage.setItem throws when saving drafts', () => {
    spyOn(localStorage, 'setItem').and.throwError('LS set error');
    const consoleSpy = spyOn(console, 'error');

    service['saveDraftsToStorage']();

    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.calls.argsFor(0)[0]).toContain('Failed to save drafts to localStorage');
  });

  it('should handle error during loadDraftsFromStorage and reset drafts', () => {
    spyOn(localStorage, 'getItem').and.throwError('LS get error');
    const consoleSpy = spyOn(console, 'error');
    const svc = new DraftStateService();

    expect(consoleSpy).toHaveBeenCalled();
    expect(svc.getAllDrafts().length).toBe(0);
  });

  it('importDrafts should fail when drafts have invalid structure', () => {
    const consoleSpy = spyOn(console, 'error');

    const badJson = JSON.stringify([
      { chatId: '1', text: '' } 
    ]);

    const res = service.importDrafts(badJson);

    expect(res).toBeFalse();
    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.calls.argsFor(0)[0]).toContain('Failed to import drafts');
  });

  it('getStatistics should return zeros when there are no drafts', () => {
    service.clearAllDrafts();

    const stats = service.getStatistics();

    expect(stats.total).toBe(0);
    expect(stats.totalCharacters).toBe(0);
    expect(stats.oldestTimestamp).toBeNull();
    expect(stats.newestTimestamp).toBeNull();
  });

  it('formatDraftDate should produce singular "1 hour ago" (no s)', () => {
    const now = Date.now();
    const ts = now - 1 * 3600_000;

    expect(service.formatDraftDate(ts)).toBe('1 hour ago');
  });

  it('saveDraftsToStorage writes drafts to localStorage', () => {
    localStorage.clear();
    service['drafts'].set('a', { chatId: 'a', text: 'x', timestamp: Date.now() });

    service['saveDraftsToStorage']();

    const stored = localStorage.getItem(service['STORAGE_KEY']);
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored as string);
    expect(Array.isArray(parsed)).toBeTrue();
    expect(parsed.length).toBe(1);
  });

  it('loadDraftsFromStorage should handle invalid JSON and reset drafts', () => {
    localStorage.setItem('chat_drafts', 'not valid json');
    const consoleSpy = spyOn(console, 'error');

    const svc = new DraftStateService();

    expect(consoleSpy).toHaveBeenCalled();
    expect(svc.getAllDrafts().length).toBe(0);
  });
});
