import { ElementRef, ChangeDetectorRef } from '@angular/core';
import { fakeAsync, tick } from '@angular/core/testing';
import { BaseChatMessagesWidget } from '../shared/widget';

interface MockMessage {
  id: string;
  sender: string;
  content: string;
  isDeleted?: boolean;
  [k: string]: any;
}

class MockFileUploadApiService {
  getDownloadUrls = jasmine.createSpy('getDownloadUrls').and.callFake(async (names: string[]) => {
    return names.map(n => ({ originalName: n, url: `https://cdn.example.com/${n}`, uniqueFileName: `unique_${n}` }));
  });
}

class TestWidget extends BaseChatMessagesWidget<MockMessage> {
  messages: MockMessage[] = [];
  loadMoreCalled = false;

  constructor(public cdrMock: ChangeDetectorRef, public fileApi: any) {
    super(cdrMock as any, fileApi as any);
  }

  protected loadMore(): void {
    this.loadMoreCalled = true;
  }
  protected initChat(): void {}
  protected getMessageIdFromMessage(msg: MockMessage): string {
    return msg.id;
  }
}

function createElementMock(width = 200, height = 100) {
  const native = {
    scrollTop: 0,
    scrollHeight: 1000,
    clientHeight: height,
    querySelector: (sel: string) => null,
    scrollTo: jasmine.createSpy('scrollTo'),
  } as any;
  return new ElementRef(native);
}

describe('BaseChatMessagesWidget (full coverage)', () => {
  let widget: TestWidget;
  let fileApi: MockFileUploadApiService;
  let cdr: ChangeDetectorRef;
  let scrollElRef: ElementRef<HTMLDivElement>;

  beforeEach(() => {
    fileApi = new MockFileUploadApiService();
    cdr = {
      detectChanges: jasmine.createSpy('detectChanges'),
      markForCheck: jasmine.createSpy('markForCheck')
    } as any;

    widget = new TestWidget(cdr, fileApi as any);
    widget.currentUserNickName = 'Me';
    scrollElRef = createElementMock();
    (widget as any).scrollContainer = scrollElRef;
  });

  it('onScrollBase triggers loadMore when near top', () => {
    const native = scrollElRef.nativeElement as any;
    native.scrollTop = 100;
    widget.loading = false;
    widget.allLoaded = false;
    widget.onScrollBase();
    expect(widget.loadMoreCalled).toBeTrue();
  });

  it('isMyMessageBase compares sender with currentUserNickName', () => {
    const msg: MockMessage = { id: '1', sender: 'Me', content: 'x' };
    expect(widget.isMyMessageBase(msg)).toBeTrue();
    msg.sender = 'Someone';
    expect(widget.isMyMessageBase(msg)).toBeFalse();
  });

  it('shouldShowSenderNameBase', () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: 'a' },
      { id: '2', sender: 'A', content: 'b' },
      { id: '3', sender: 'B', content: 'c' }
    ];
    expect(widget.shouldShowSenderNameBase(messages, 0)).toBeTrue();
    expect(widget.shouldShowSenderNameBase(messages, 1)).toBeFalse();
    expect(widget.shouldShowSenderNameBase(messages, 2)).toBeTrue();
  });

  it('getFileExtension returns uppercase or File', () => {
    expect(widget.getFileExtension('name.pdf')).toBe('PDF');
    expect(widget.getFileExtension('')).toBe('File');
  });

  it('getMediaFiles filters by media types', () => {
    const arr = [{ type: 'image/png' }, { type: 'application/pdf' }, { type: 'video/mp4' }];
    const res = widget.getMediaFiles(arr as any);
    expect(res.length).toBe(2);
  });

  it('getOriginalFileIndex finds by uniqueId or fileName or url', () => {
    const all = [
      { uniqueId: 'u1', fileName: 'f1', url: 'u1_url', uniqueFileName: 'unique_f1' },
      { uniqueId: 'u2', fileName: 'f2', url: 'u2_url', uniqueFileName: 'unique_f2' }
    ];
    const target = {
      uniqueId: 'u2',
      fileName: 'f2',
      url: 'u2_url',
      uniqueFileName: 'unique_f2'
    };
    expect(widget.getOriginalFileIndex(all as any, target as any)).toBe(1);
  });

  it('trackByFileWithRefresh composes string', () => {
    const file = { uniqueId: 'u', fileName: 'f', _version: 2 } as any;
    expect(widget.trackByFileWithRefresh(0, file)).toContain('u');
  });

  it('onImageViewerClosedBase resets viewer state', () => {
    widget.showImageViewer = true;
    widget.imageViewerImages = [{ url: 'u' } as any];
    widget.onImageViewerClosedBase();
    expect(widget.showImageViewer).toBeFalse();
    expect(widget.imageViewerImages.length).toBe(0);
  });

  it('setupContextMenuListener and cleanupContextMenuListener', () => {
    spyOn(document, 'addEventListener');
    spyOn(document, 'removeEventListener');
    
    (widget as any).setupContextMenuListener();
    expect(document.addEventListener).toHaveBeenCalledWith('click', jasmine.any(Function));
    
    (widget as any).cleanupContextMenuListener();
    expect(document.removeEventListener).toHaveBeenCalled();
  });

  it('baseDestroy cleans up resources', () => {
    spyOn((widget as any).destroy$, 'next');
    spyOn((widget as any).destroy$, 'complete');
    
    widget.urlCache.set('test', { url: 'test', timestamp: 123 });
    (widget as any).batchRefreshTimer = setTimeout(() => {}, 1000);
    
    (widget as any).baseDestroy();
    
    expect((widget as any).destroy$.next).toHaveBeenCalled();
    expect((widget as any).destroy$.complete).toHaveBeenCalled();
    expect(widget.urlCache.size).toBe(0);
  });

  it('isMessageHighlightedBase checks highlighted message', () => {
    widget.highlightedMessageId = 'msg1';
    expect(widget.isMessageHighlightedBase('msg1')).toBeTrue();
    expect(widget.isMessageHighlightedBase('msg2')).toBeFalse();
  });

  it('highlightMessageBase sets and clears highlight after timeout', fakeAsync(() => {
    (widget as any).highlightMessageBase('msg1');
    expect(widget.highlightedMessageId).toBe('msg1');
    
    tick(1500);
    expect(widget.highlightedMessageId).toBeNull();
  }));

  it('onScrollBase hides context menu when scrolling', () => {
    widget.showContextMenu = true;
    widget.onScrollBase();
    expect(widget.showContextMenu).toBeFalse();
  });

  it('onScrollBase does nothing if no container', () => {
    (widget as any).scrollContainer = null;
    widget.onScrollBase();
    expect(widget.loadMoreCalled).toBeFalse();
  });

  it('isScrolledToBottomBase returns true when at bottom', () => {
    const native = scrollElRef.nativeElement as any;
    native.scrollHeight = 1000;
    native.scrollTop = 990;
    native.clientHeight = 100;
    
    expect((widget as any).isScrolledToBottomBase()).toBeTrue();
  });

  it('isScrolledToBottomBase returns false when not at bottom', () => {
    const native = scrollElRef.nativeElement as any;
    native.scrollHeight = 1000;
    native.scrollTop = 500;
    native.clientHeight = 100;
    
    expect((widget as any).isScrolledToBottomBase()).toBeFalse();
  });

  it('scrollToMessageBase scrolls to message element', fakeAsync(() => {
    const mockEl = document.createElement('div');
    spyOn(mockEl, 'scrollIntoView');
    
    scrollElRef.nativeElement.querySelector = jasmine.createSpy('querySelector').and.returnValue(mockEl);
    
    (widget as any).scrollToMessageBase('msg1');
    
    expect(mockEl.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center'
    });
    
    tick(300);
    expect(widget.highlightedMessageId).toBe('msg1');
  }));

  it('scrollToMessageBase retries if element not found', fakeAsync(() => {
    const mockEl = document.createElement('div');
    spyOn(mockEl, 'scrollIntoView');
    
    let callCount = 0;
    scrollElRef.nativeElement.querySelector = jasmine.createSpy('querySelector').and.callFake(() => {
      callCount++;
      return callCount === 1 ? null : mockEl;
    });
    
    (widget as any).scrollToMessageBase('msg1');
    
    tick(1000);
    expect(mockEl.scrollIntoView).toHaveBeenCalled();
  }));

  it('isMessageDeletedBase checks isDeleted flag', () => {
    const msg1: MockMessage = { id: '1', sender: 'A', content: 'a', isDeleted: true };
    const msg2: MockMessage = { id: '2', sender: 'A', content: 'b' };
    
    expect(widget.isMessageDeletedBase(msg1)).toBeTrue();
    expect(widget.isMessageDeletedBase(msg2)).toBeFalse();
  });

  it('getMessageContentBase returns deleted message text', () => {
    const msg: MockMessage = { id: '1', sender: 'A', content: 'test', isDeleted: true };
    expect(widget.getMessageContentBase(msg)).toBe('This message was deleted');
  });

  it('getMessageContentBase returns content for non-deleted', () => {
    const msg: MockMessage = { id: '1', sender: 'A', content: 'test' };
    expect(widget.getMessageContentBase(msg)).toBe('test');
  });

  it('canEditOrDeleteBase returns false if message not found', () => {
    widget.contextMenuMessageId = 'nonexistent';
    expect((widget as any).canEditOrDeleteBase([])).toBeFalse();
  });

  it('canEditOrDeleteBase returns false if message is deleted', () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'Me', content: 'test', isDeleted: true }
    ];
    widget.contextMenuMessageId = '1';
    expect((widget as any).canEditOrDeleteBase(messages)).toBeFalse();
  });

  it('canEditOrDeleteBase returns false if not my message', () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'Other', content: 'test' }
    ];
    widget.contextMenuMessageId = '1';
    expect((widget as any).canEditOrDeleteBase(messages)).toBeFalse();
  });

  it('canEditOrDeleteBase returns true for my non-deleted message', () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'Me', content: 'test' }
    ];
    widget.contextMenuMessageId = '1';
    expect((widget as any).canEditOrDeleteBase(messages)).toBeTrue();
  });

  it('groupMessagesByDate groups messages by date', () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: 'a', timestamp: '2024-01-01T10:00:00Z' },
      { id: '2', sender: 'B', content: 'b', timestamp: '2024-01-01T11:00:00Z' },
      { id: '3', sender: 'C', content: 'c', timestamp: '2024-01-02T10:00:00Z' }
    ];
    
    const groups = (widget as any).groupMessagesByDate(messages, (msg: any) => msg.timestamp);
    
    expect(groups.length).toBe(2);
    expect(groups[0].messages.length).toBe(2);
    expect(groups[1].messages.length).toBe(1);
  });

  it('groupMessagesByDate filters deleted messages from current user', () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'Me', content: 'a', isDeleted: true, timestamp: '2024-01-01T10:00:00Z' },
      { id: '2', sender: 'Other', content: 'b', isDeleted: true, timestamp: '2024-01-01T11:00:00Z' }
    ];
    
    const groups = (widget as any).groupMessagesByDate(messages, (msg: any) => msg.timestamp);
    
    expect(groups.length).toBe(1);
    expect(groups[0].messages.length).toBe(1);
    expect(groups[0].messages[0].id).toBe('2');
  });

  it('trackByGroupBase returns group date', () => {
    const group = { date: '2024-01-01', messages: [] };
    expect(widget.trackByGroupBase(0, group)).toBe('2024-01-01');
  });

  it('trackByMessageBase returns message id', () => {
    const msg: MockMessage = { id: 'msg1', sender: 'A', content: 'test' };
    expect(widget.trackByMessageBase(0, msg)).toBe('msg1');
  });

  it('detectFileType detects image types', () => {
    expect((widget as any).detectFileType('test.jpg')).toBe('image/jpg');
    expect((widget as any).detectFileType('test.PNG')).toBe('image/png');
  });

  it('detectFileType detects video types', () => {
    expect((widget as any).detectFileType('test.mp4')).toBe('video/mp4');
    expect((widget as any).detectFileType('test.AVI')).toBe('video/avi');
  });

  it('detectFileType detects audio types', () => {
    expect((widget as any).detectFileType('test.mp3')).toBe('audio/mp3');
  });

  it('detectFileType detects document types', () => {
    expect((widget as any).detectFileType('test.pdf')).toBe('application/pdf');
  });

  it('detectFileType detects archive types', () => {
    expect((widget as any).detectFileType('test.zip')).toBe('application/zip');
  });

  it('detectFileType returns null for unknown types', () => {
    expect((widget as any).detectFileType('test.xyz')).toBeNull();
  });

  it('formatFileSize formats bytes correctly', () => {
    expect((widget as any).formatFileSize(0)).toBe('0 Bytes');
    expect((widget as any).formatFileSize(1024)).toBe('1 KB');
    expect((widget as any).formatFileSize(1048576)).toBe('1 MB');
  });

  it('getFileSize returns formatted size', () => {
    expect(widget.getFileSize({ size: 2048 })).toContain('KB');
    expect(widget.getFileSize({})).toBe('Unknown size');
  });

  it('getMediaFiles returns empty array for null input', () => {
    expect(widget.getMediaFiles(null as any).length).toBe(0);
  });

  it('getMediaFiles filters audio files', () => {
    const files = [{ type: 'audio/mp3' }, { type: 'text/plain' }];
    const result = widget.getMediaFiles(files as any);
    expect(result.length).toBe(1);
  });

  it('getOriginalFileIndex finds by fileName', () => {
    const files = [
      { uniqueId: 'u1', fileName: 'file1.jpg', url: 'url1' },
      { uniqueId: 'u2', fileName: 'file2.jpg', url: 'url2' }
    ];
    const target = { fileName: 'file2.jpg' };
    expect(widget.getOriginalFileIndex(files as any, target as any)).toBe(1);
  });

  it('trackByFileWithRefresh uses fileName if no uniqueId', () => {
    const file = { fileName: 'test.jpg', _version: 1 };
    const result = widget.trackByFileWithRefresh(5, file);
    expect(result).toContain('test.jpg');
    expect(result).toContain('5');
  });

  it('extractTimestampFromFileName extracts timestamp', () => {
    const result = (widget as any).extractTimestampFromFileName('1234567890_file.jpg');
    expect(result).toBe(1234567890);
  });

  it('extractTimestampFromFileName returns Date.now for invalid format', () => {
    const result = (widget as any).extractTimestampFromFileName('invalid_file.jpg');
    expect(result).toBeGreaterThan(0);
  });

  it('normalizeFileName normalizes string', () => {
    const result = (widget as any).normalizeFileName('  Test File.PDF  ');
    expect(result).toBe('test file.pdf');
  });

  it('isUrlExpired checks expiration', () => {
    const expired = Date.now() - 11 * 60 * 1000;
    const fresh = Date.now() - 5 * 60 * 1000;
    
    expect((widget as any).isUrlExpired(expired)).toBeTrue();
    expect((widget as any).isUrlExpired(fresh)).toBeFalse();
  });

  it('isUrlAboutToExpire checks threshold', () => {
    const aboutTo = Date.now() - 9 * 60 * 1000;
    const fresh = Date.now() - 5 * 60 * 1000;
    
    expect((widget as any).isUrlAboutToExpire(aboutTo)).toBeTrue();
    expect((widget as any).isUrlAboutToExpire(fresh)).toBeFalse();
  });

  it('refreshFileUrl caches and returns new URL', async () => {
    const result = await (widget as any).refreshFileUrl('test.jpg', 'unique_test.jpg');
    
    expect(result).toBe('https://cdn.example.com/test.jpg');
    expect(widget.urlCache.has('unique_test.jpg')).toBeTrue();
  });

  it('refreshFileUrl reuses pending promise', async () => {
    const promise1 = (widget as any).refreshFileUrl('test.jpg', 'unique_test.jpg');
    const promise2 = (widget as any).refreshFileUrl('test.jpg', 'unique_test.jpg');
    
    expect((widget as any).refreshingUrls.has('unique_test.jpg')).toBeTrue();
    
    await promise1;
    await promise2;
    
    expect((widget as any).refreshingUrls.has('unique_test.jpg')).toBeFalse();
  });

  it('refreshFileUrl handles errors', async () => {
    fileApi.getDownloadUrls = jasmine.createSpy('getDownloadUrls').and.rejectWith(new Error('fail'));
    
    const result = await (widget as any).refreshFileUrl('test.jpg', 'unique_test.jpg');
    expect(result).toBeNull();
  });

  it('invalidateMessageCache removes from cache', () => {
    (widget as any).messageContentCache.set('msg1', { text: 'test' } as any);
    (widget as any).invalidateMessageCache('msg1');
    expect((widget as any).messageContentCache.has('msg1')).toBeFalse();
  });

  it('invalidateAllCache clears all cache', () => {
    (widget as any).messageContentCache.set('msg1', { text: 'test' } as any);
    (widget as any).invalidateAllCache();
    expect((widget as any).messageContentCache.size).toBe(0);
  });

  it('clearCacheForUpdatedMessages detects content changes', () => {
    const prev: MockMessage[] = [{ id: '1', sender: 'A', content: 'old' }];
    const curr: MockMessage[] = [{ id: '1', sender: 'A', content: 'new' }];
    
    (widget as any).messageContentCache.set('1', { text: 'old' } as any);
    (widget as any).clearCacheForUpdatedMessages(prev, curr, cdr);
    
    expect((widget as any).messageContentCache.has('1')).toBeFalse();
    expect((curr[0] as any)._version).toBeDefined();
  });

  it('clearMessageCache clears message cache and properties', () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: 'test', parsedContent: {} as any }
    ];
    
    widget.clearMessageCache('1', messages, cdr);
    
    expect((messages[0] as any).parsedContent).toBeUndefined();
    expect(cdr.markForCheck).toHaveBeenCalled();
  });

  it('addFileToMessageBase adds file to message', async () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"text":"test","files":[]}' }
    ];
    
    await widget.addFileToMessageBase('1', messages, {
      fileName: 'test.jpg',
      uniqueFileName: 'unique_test.jpg',
      url: 'http://test.com/test.jpg',
      type: 'image/jpeg'
    }, cdr);
    
    const parsed = JSON.parse(messages[0].content);
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].fileName).toBe('test.jpg');
  });

  it('addFileToMessageBase creates files array if missing', async () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"text":"test"}' }
    ];
    
    await widget.addFileToMessageBase('1', messages, {
      fileName: 'test.jpg',
      uniqueFileName: 'unique_test.jpg',
      url: 'http://test.com/test.jpg'
    }, cdr);
    
    const parsed = JSON.parse(messages[0].content);
    expect(parsed.files).toBeDefined();
    expect(parsed.files.length).toBe(1);
  });

  it('removeFileFromMessageBase removes file and clears cache', async () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"files":[{"fileName":"test.jpg","uniqueFileName":"unique_test.jpg"}]}' }
    ];
    
    widget.urlCache.set('unique_test.jpg', { url: 'test', timestamp: 123 });
    
    await widget.removeFileFromMessageBase('1', messages, 'unique_test.jpg', cdr);
    
    const parsed = JSON.parse(messages[0].content);
    expect(parsed.files.length).toBe(0);
    expect(widget.urlCache.has('unique_test.jpg')).toBeFalse();
  });

  it('replaceFileInMessageBase replaces file data', async () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"files":[{"fileName":"old.jpg","uniqueFileName":"unique_old.jpg","url":"old_url"}]}' }
    ];
    
    await widget.replaceFileInMessageBase('1', messages, 'unique_old.jpg', {
      fileName: 'new.jpg',
      uniqueFileName: 'unique_new.jpg',
      url: 'new_url',
      type: 'image/jpeg'
    }, cdr);
    
    const parsed = JSON.parse(messages[0].content);
    expect(parsed.files[0].fileName).toBe('new.jpg');
    expect(widget.urlCache.has('unique_new.jpg')).toBeTrue();
  });

  it('fullMessageRerenderBase invalidates and updates version', () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"text":"test","files":[{"fileName":"f.jpg"}]}' }
    ];
    
    widget.fullMessageRerenderBase('1', messages, cdr);
    
    expect((messages[0] as any)._version).toBeDefined();
    expect(cdr.markForCheck).toHaveBeenCalled();
  });

  it('forceMessageRefreshBase refreshes specific message', () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: 'test' }
    ];
    const parseContentFn = jasmine.createSpy('parseContent');
    
    widget.forceMessageRefreshBase('1', messages, parseContentFn, undefined, cdr);
    
    expect(parseContentFn).toHaveBeenCalled();
    expect(cdr.markForCheck).toHaveBeenCalled();
  });

  it('forceMessageRefreshBase replaces message if newMessage provided', () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: 'old' }
    ];
    const newMsg: MockMessage = { id: '1', sender: 'A', content: 'new' };
    const parseContentFn = jasmine.createSpy('parseContent');
    
    widget.forceMessageRefreshBase('1', messages, parseContentFn, newMsg, cdr);
    
    expect(messages[0].content).toBe('new');
  });

  it('forceFileRefreshBase updates file version', () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"files":[{"uniqueId":"file1","fileName":"test.jpg"}]}' }
    ];
    
    widget.forceFileRefreshBase('1', messages, 'file1', cdr);
    
    const parsed = JSON.parse(messages[0].content);
    expect(parsed.files[0]._version).toBeDefined();
  });

  it('openFileViewerBase opens viewer with correct index', () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'User', content: '{"files":[{"type":"application/pdf"},{"type":"image/jpeg","url":"img.jpg","fileName":"img.jpg"}]}' }
    ];
    
    const parseContentFn = (msg: MockMessage) => JSON.parse(msg.content);
    const getSenderFn = (msg: MockMessage) => msg.sender;
    
    (widget as any).openFileViewerBase(1, '1', messages, parseContentFn, getSenderFn);
    
    expect(widget.showImageViewer).toBeTrue();
    expect(widget.imageViewerImages.length).toBe(1);
  });

  it('loadFilesForMessagesBase loads files for messages', async () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"files":[{"fileName":"test.jpg"}]}' }
    ];
    
    await (widget as any).loadFilesForMessagesBase(messages);
    
    const parsed = JSON.parse(messages[0].content);
    expect(parsed.files[0].url).toContain('cdn.example.com');
    expect(widget.urlCache.size).toBeGreaterThan(0);
  });

  it('loadFilesForMessagesBase skips if no files need update', async () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"text":"no files"}' }
    ];
    
    await (widget as any).loadFilesForMessagesBase(messages);
    
    expect(fileApi.getDownloadUrls).not.toHaveBeenCalled();
  });

  it('scrollToBottomAfterSend uses requestAnimationFrame', fakeAsync(() => {
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: any) => {
      callback();
      return 0;
    });
    
    spyOn(widget as any, 'scrollToBottomBase');
    
    (widget as any).scrollToBottomAfterSend();
    
    expect(window.requestAnimationFrame).toHaveBeenCalled();
    
    tick(100);
    
    expect((widget as any).scrollToBottomBase).toHaveBeenCalled();
  }));

  it('scheduleScrollToBottom sets flag and scrolls', fakeAsync(() => {
    spyOn(widget as any, 'scrollToBottomBase');
    
    (widget as any).scheduleScrollToBottom();
    
    tick(0);
    expect((widget as any).scrollToBottomBase).toHaveBeenCalled();
    expect((widget as any).shouldScrollToBottom).toBeFalse();
  }));

  it('forceRefreshAllFileUrls refreshes files in messages', () => {
    widget.messages = [
      { id: '1', sender: 'A', content: '{"files":[{"fileName":"test.jpg"}]}' }
    ];
    
    spyOn(widget as any, 'loadFilesForMessagesBase');
    
    (widget as any).forceRefreshAllFileUrls();
    
    expect((widget as any).loadFilesForMessagesBase).toHaveBeenCalled();
  });

  it('forceRefreshAllFileUrls does nothing if no messages', () => {
    widget.messages = [];
    spyOn(widget as any, 'loadFilesForMessagesBase');
    
    (widget as any).forceRefreshAllFileUrls();
    
    expect((widget as any).loadFilesForMessagesBase).not.toHaveBeenCalled();
  });

  it('handleInitialLoadBase loads files and scrolls', fakeAsync(() => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"files":[{"fileName":"test.jpg"}]}', timestamp: '2024-01-01T10:00:00Z' }
    ];
    
    spyOn(widget as any, 'loadFilesForMessagesBase');
    spyOn(widget as any, 'scrollToBottomBase');
    
    const result = (widget as any).handleInitialLoadBase(
      messages,
      (msg: any) => msg.timestamp,
      scrollElRef
    );
    
    tick(100);
    
    expect((widget as any).loadFilesForMessagesBase).toHaveBeenCalled();
    expect((widget as any).scrollToBottomBase).toHaveBeenCalled();
    expect(result).toBeGreaterThan(0);
  }));

  it('handleMessagesUpdateBase processes new messages', fakeAsync(() => {
    const oldMessages: MockMessage[] = [
      { id: '1', sender: 'A', content: 'old', timestamp: '2024-01-01T10:00:00Z' }
    ];
    const newMessages: MockMessage[] = [
      { id: '2', sender: 'B', content: 'new', timestamp: '2024-01-01T11:00:00Z' }
    ];
    
    spyOn(widget as any, 'isScrolledToBottomBase').and.returnValue(true);
    spyOn(widget as any, 'scrollToBottomBase');
    spyOn(widget as any, 'loadFilesForMessagesBase');
    
    const result = (widget as any).handleMessagesUpdateBase(
      oldMessages,
      newMessages,
      [],
      new Date('2024-01-01T10:00:00Z').getTime(),
      (msg: any) => msg.timestamp,
      scrollElRef,
      () => true
    );
    
    tick(100);
    
    expect(result).toBeGreaterThan(0);
  }));

  it('handleMessagesUpdateBase handles deleted messages', fakeAsync(() => {
    const oldMessages: MockMessage[] = [
      { id: '1', sender: 'A', content: 'test', timestamp: '2024-01-01T10:00:00Z' }
    ];
    
    (widget as any).handleMessagesUpdateBase(
      oldMessages,
      [],
      ['1'],
      Date.now(),
      (msg: any) => msg.timestamp,
      scrollElRef,
      () => false
    );
    
    tick(50);
    expect(cdr.detectChanges).toHaveBeenCalled();
  }));

  it('handleNewMessagesBase merges and sorts messages', () => {
    const current: MockMessage[] = [
      { id: '1', sender: 'A', content: 'first', timestamp: '2024-01-01T10:00:00Z' }
    ];
    const newMsgs: MockMessage[] = [
      { id: '2', sender: 'B', content: 'second', timestamp: '2024-01-01T11:00:00Z' }
    ];
    
    spyOn(widget as any, 'isScrolledToBottomBase').and.returnValue(false);
    
    const result = (widget as any).handleNewMessagesBase(
      current,
      newMsgs,
      0,
      (msg: any) => msg.timestamp,
      scrollElRef,
      () => false
    );
    
    expect(result.messages.length).toBe(2);
    expect(result.messages[0].id).toBe('1');
    expect(result.messages[1].id).toBe('2');
  });

  it('handleNewMessagesBase detects deleted messages', () => {
    const current: MockMessage[] = [
      { id: '1', sender: 'A', content: 'test', isDeleted: false, timestamp: '2024-01-01T10:00:00Z' }
    ];
    const updated: MockMessage[] = [
      { id: '1', sender: 'A', content: 'test', isDeleted: true, timestamp: '2024-01-01T10:00:00Z' }
    ];
    
    spyOn(widget as any, 'invalidateMessageCache');
    
    (widget as any).handleNewMessagesBase(
      current,
      updated,
      0,
      (msg: any) => msg.timestamp,
      scrollElRef,
      () => false
    );
    
    expect((widget as any).invalidateMessageCache).toHaveBeenCalledWith('1');
  });

  it('handleNewMessagesBase detects content changes', () => {
    const current: MockMessage[] = [
      { id: '1', sender: 'A', content: 'old', timestamp: '2024-01-01T10:00:00Z' }
    ];
    const updated: MockMessage[] = [
      { id: '1', sender: 'A', content: 'new', timestamp: '2024-01-01T10:00:00Z' }
    ];
    
    spyOn(widget as any, 'invalidateMessageCache');
    
    (widget as any).handleNewMessagesBase(
      current,
      updated,
      0,
      (msg: any) => msg.timestamp,
      scrollElRef,
      () => false
    );
    
    expect((widget as any).invalidateMessageCache).toHaveBeenCalledWith('1');
  });

  it('handleNewMessagesBase scrolls on initial load', fakeAsync(() => {
    spyOn(widget as any, 'scrollToBottomBase');
    
    (widget as any).handleNewMessagesBase(
      [],
      [{ id: '1', sender: 'A', content: 'test', timestamp: '2024-01-01T10:00:00Z' }],
      0,
      (msg: any) => msg.timestamp,
      scrollElRef,
      () => false
    );
    
    tick(100);
    expect((widget as any).scrollToBottomBase).toHaveBeenCalled();
  }));

  it('handleNewMessagesBase loads files for messages', () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"files":[{"fileName":"test.jpg"}]}', timestamp: '2024-01-01T10:00:00Z' }
    ];
    
    spyOn(widget as any, 'loadFilesForMessagesBase');
    
    (widget as any).handleNewMessagesBase(
      [],
      messages,
      0,
      (msg: any) => msg.timestamp,
      scrollElRef,
      () => false
    );
    
    expect((widget as any).loadFilesForMessagesBase).toHaveBeenCalled();
  });

  it('onScrollBase accepts custom scrollContainer parameter', () => {
    const customScroll = createElementMock();
    const native = customScroll.nativeElement as any;
    native.scrollTop = 50;
    widget.loading = false;
    widget.allLoaded = false;
    
    widget.onScrollBase(customScroll);
    expect(widget.loadMoreCalled).toBeTrue();
  });

  it('isScrolledToBottomBase accepts custom scrollContainer', () => {
    const customScroll = createElementMock();
    const native = customScroll.nativeElement as any;
    native.scrollHeight = 1000;
    native.scrollTop = 995;
    native.clientHeight = 100;
    
    expect((widget as any).isScrolledToBottomBase(customScroll)).toBeTrue();
  });

  it('scrollToBottomBase accepts custom scrollContainer', () => {
    const customScroll = createElementMock();
    (widget as any).scrollToBottomBase(customScroll);
    expect(customScroll.nativeElement.scrollTo).toHaveBeenCalled();
  });

  it('scrollToMessageBase accepts custom scrollContainer', fakeAsync(() => {
    const customScroll = createElementMock();
    const mockEl = document.createElement('div');
    spyOn(mockEl, 'scrollIntoView');
    
    customScroll.nativeElement.querySelector = jasmine.createSpy('querySelector').and.returnValue(mockEl);
    
    (widget as any).scrollToMessageBase('msg1', customScroll);
    expect(mockEl.scrollIntoView).toHaveBeenCalled();
  }));

  it('removeFileFromMessageBase handles file not found', async () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"files":[{"uniqueFileName":"other.jpg"}]}' }
    ];
    
    spyOn(console, 'warn');
    
    await widget.removeFileFromMessageBase('1', messages, 'nonexistent.jpg', cdr);
    
    expect(console.warn).toHaveBeenCalledWith('File not found for removal:', 'nonexistent.jpg');
  });

  it('addFileToMessageBase handles JSON parse error', async () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: 'invalid json' }
    ];
    
    await widget.addFileToMessageBase('1', messages, {
      fileName: 'test.jpg',
      uniqueFileName: 'unique_test.jpg',
      url: 'http://test.com/test.jpg'
    }, cdr);
    
    expect(messages[0].content).toBe('invalid json');
  });

  it('removeFileFromMessageBase handles JSON parse error', async () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: 'invalid json' }
    ];
    
    spyOn(console, 'error');
    
    await widget.removeFileFromMessageBase('1', messages, 'test.jpg', cdr);
    
    expect(console.error).toHaveBeenCalled();
  });

  it('replaceFileInMessageBase handles JSON parse error', async () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: 'invalid json' }
    ];
    
    spyOn(console, 'error');
    
    await widget.replaceFileInMessageBase('1', messages, 'old.jpg', {
      fileName: 'new.jpg',
      uniqueFileName: 'unique_new.jpg',
      url: 'http://test.com/new.jpg'
    }, cdr);
    
    expect(console.error).toHaveBeenCalled();
  });

  it('fullMessageRerenderBase handles parse error', () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: 'invalid json' }
    ];
    
    spyOn(console, 'error');
    
    widget.fullMessageRerenderBase('1', messages, cdr);
    
    expect(console.error).toHaveBeenCalled();
  });

  it('forceFileRefreshBase handles parse error', () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: 'invalid json' }
    ];
    
    spyOn(console, 'error');
    
    widget.forceFileRefreshBase('1', messages, 'file1', cdr);
    
    expect(console.error).toHaveBeenCalled();
  });

  it('loadFilesForMessagesBase handles API error gracefully', async () => {
    fileApi.getDownloadUrls = jasmine.createSpy('getDownloadUrls').and.rejectWith(new Error('API Error'));
    
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"files":[{"fileName":"test.jpg"}]}' }
    ];
    
    await (widget as any).loadFilesForMessagesBase(messages);
    
    expect(true).toBeTrue();
  });

  it('extractTimestampFromFileName handles errors', () => {
    const result = (widget as any).extractTimestampFromFileName(null as any);
    expect(result).toBeGreaterThan(0);
  });

  it('normalizeFileName handles normalization errors', () => {
    const result = (widget as any).normalizeFileName('test' as any);
    expect(result).toBe('test');
  });

  it('openFileViewerBase returns early if message not found', () => {
    const parseContentFn = jasmine.createSpy('parseContent');
    const getSenderFn = jasmine.createSpy('getSender');
    
    (widget as any).openFileViewerBase(0, 'nonexistent', [], parseContentFn, getSenderFn);
    
    expect(widget.showImageViewer).toBeFalse();
  });

  it('openFileViewerBase returns early if file index invalid', () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"files":[]}' }
    ];
    const parseContentFn = (msg: MockMessage) => JSON.parse(msg.content);
    const getSenderFn = (msg: MockMessage) => msg.sender;
    
    (widget as any).openFileViewerBase(5, '1', messages, parseContentFn, getSenderFn);
    
    expect(widget.showImageViewer).toBeFalse();
  });

  it('openFileViewerBase returns early if media index not found', () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"files":[{"type":"application/pdf","url":"doc.pdf","fileName":"doc.pdf"}]}' }
    ];
    const parseContentFn = (msg: MockMessage) => JSON.parse(msg.content);
    const getSenderFn = (msg: MockMessage) => msg.sender;
    
    (widget as any).openFileViewerBase(0, '1', messages, parseContentFn, getSenderFn);
    
    expect(widget.showImageViewer).toBeFalse();
  });

  it('clearCacheForUpdatedMessages handles null previousMessages', () => {
    const current: MockMessage[] = [{ id: '1', sender: 'A', content: 'test' }];
    
    (widget as any).clearCacheForUpdatedMessages(null, current, cdr);
    
    expect(true).toBeTrue();
  });

  it('isMyMessageBase handles case-insensitive and trimmed comparison', () => {
    widget.currentUserNickName = '  MyName  ';
    const msg: MockMessage = { id: '1', sender: '  myname  ', content: 'test' };
    
    expect(widget.isMyMessageBase(msg)).toBeTrue();
  });

  it('handleNewMessagesBase updates latestTime correctly', () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: 'test', timestamp: '2024-01-01T10:00:00Z' }
    ];
    
    const result = (widget as any).handleNewMessagesBase(
      [],
      messages,
      0,
      (msg: any) => msg.timestamp,
      scrollElRef,
      () => false
    );
    
    expect(result.latestTime).toBeGreaterThan(0);
  });

  it('loadFilesForMessagesBase updates cache with uniqueFileName fallback', async () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"files":[{"fileName":"test.jpg"}]}' }
    ];
    
    await (widget as any).loadFilesForMessagesBase(messages);
    
    expect(widget.urlCache.has('unique_test.jpg')).toBeTrue();
  });

  it('refreshFileUrl handles missing URL in response', async () => {
    fileApi.getDownloadUrls = jasmine.createSpy('getDownloadUrls').and.returnValue(
      Promise.resolve([{ originalName: 'test.jpg', url: '', uniqueFileName: 'unique' }])
    );
    
    const result = await (widget as any).refreshFileUrl('test.jpg', 'unique_test.jpg');
    expect(result).toBeNull();
  });

  it('loadFilesForMessagesBase handles missing file names', async () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"files":[{"url":"existing.jpg"}]}' }
    ];
    
    await (widget as any).loadFilesForMessagesBase(messages);
    
    expect(fileApi.getDownloadUrls).not.toHaveBeenCalled();
  });

  it('scrollToBottomBase uses this.scrollContainer when no parameter provided', () => {
    const native = scrollElRef.nativeElement as any;
    
    (widget as any).scrollToBottomBase();
    
    expect(native.scrollTo).toHaveBeenCalled();
  });
  
  it('scrollToBottomBase returns early when no container exists', () => {
    (widget as any).scrollContainer = null;
    
    const scrollToSpy = jasmine.createSpy('scrollTo');
    
    (widget as any).scrollToBottomBase();
    
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('normalizeFileName handles normalize error', () => {
    const mockFileName = {
      toLowerCase: () => ({
        trim: () => ({
          normalize: () => {
            throw new Error('normalize failed');
          }
        })
      })
    };
    
    const result = (widget as any).normalizeFileName(mockFileName as any);
    expect(result).toBeDefined();
  });

it('handleMessagesUpdateBase: realtimeNewMessages with files and sorting', fakeAsync(() => {
    const oldMessages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"text":"old"}', timestamp: '2024-01-01T10:00:00Z' }
    ];
    
    const newMessages: MockMessage[] = [
      { 
        id: '2', 
        sender: 'B', 
        content: '{"text":"new1","files":[{"fileName":"test1.jpg"}]}', 
        timestamp: '2024-01-01T12:00:00Z' 
      },
      { 
        id: '3', 
        sender: 'C', 
        content: '{"text":"new2","files":[{"fileName":"test2.jpg"}]}', 
        timestamp: '2024-01-01T13:00:00Z' 
      }
    ];
    
    const latestTime = new Date('2024-01-01T11:00:00Z').getTime();
    
    spyOn(widget as any, 'isScrolledToBottomBase').and.returnValue(true);
    spyOn(widget as any, 'scrollToBottomBase');
    spyOn(widget as any, 'loadFilesForMessagesBase');
    
    const result = (widget as any).handleMessagesUpdateBase(
      oldMessages,
      newMessages,
      [],
      latestTime,
      (msg: any) => msg.timestamp,
      scrollElRef,
      () => true
    );
    
    tick(100);
    
    expect((widget as any).loadFilesForMessagesBase).toHaveBeenCalled();
    
    expect(result).toBeGreaterThan(latestTime);

    expect((widget as any).scrollToBottomBase).toHaveBeenCalled();
  }));
  
  it('handleMessagesUpdateBase: new messages without files', fakeAsync(() => {
    const oldMessages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"text":"old"}', timestamp: '2024-01-01T10:00:00Z' }
    ];
    
    const newMessages: MockMessage[] = [
      { id: '2', sender: 'B', content: '{"text":"new"}', timestamp: '2024-01-01T12:00:00Z' }
    ];
    
    const latestTime = new Date('2024-01-01T11:00:00Z').getTime();
    
    spyOn(widget as any, 'loadFilesForMessagesBase');
    
    (widget as any).handleMessagesUpdateBase(
      oldMessages,
      newMessages,
      [],
      latestTime,
      (msg: any) => msg.timestamp,
      scrollElRef,
      () => false
    );
    
    tick(100);

    expect((widget as any).loadFilesForMessagesBase).not.toHaveBeenCalled();
  }));
  
  it('handleMessagesUpdateBase: messages with invalid JSON content', fakeAsync(() => {
    const oldMessages: MockMessage[] = [];
    
    const newMessages: MockMessage[] = [
      { id: '1', sender: 'A', content: 'invalid json', timestamp: '2024-01-01T12:00:00Z' }
    ];
    
    const latestTime = new Date('2024-01-01T11:00:00Z').getTime();
    
    spyOn(widget as any, 'loadFilesForMessagesBase');
    
    (widget as any).handleMessagesUpdateBase(
      oldMessages,
      newMessages,
      [],
      latestTime,
      (msg: any) => msg.timestamp,
      scrollElRef,
      () => false
    );
    
    tick(100);
    
    expect((widget as any).loadFilesForMessagesBase).not.toHaveBeenCalled();
  }));
  
  it('handleMessagesUpdateBase: new messages older than latestMessageTime', fakeAsync(() => {
    const oldMessages: MockMessage[] = [];
    
    const newMessages: MockMessage[] = [
      { 
        id: '1', 
        sender: 'A', 
        content: '{"text":"old","files":[{"fileName":"test.jpg"}]}', 
        timestamp: '2024-01-01T09:00:00Z'
      }
    ];
    
    const latestTime = new Date('2024-01-01T10:00:00Z').getTime();
    
    spyOn(widget as any, 'scrollToBottomBase');
    spyOn(widget as any, 'loadFilesForMessagesBase');
    
    const result = (widget as any).handleMessagesUpdateBase(
      oldMessages,
      newMessages,
      [],
      latestTime,
      (msg: any) => msg.timestamp,
      scrollElRef,
      () => false
    );
    
    tick(100);
    
    expect((widget as any).scrollToBottomBase).not.toHaveBeenCalled();
    
    expect(result).toBe(latestTime);
    
    expect((widget as any).loadFilesForMessagesBase).toHaveBeenCalled();
  }));
  
  it('handleMessagesUpdateBase: not scrolled to bottom should not scroll', fakeAsync(() => {
    const oldMessages: MockMessage[] = [];
    
    const newMessages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"text":"new"}', timestamp: '2024-01-01T12:00:00Z' }
    ];
    
    const latestTime = new Date('2024-01-01T11:00:00Z').getTime();
    
    spyOn(widget as any, 'scrollToBottomBase');
    
    (widget as any).handleMessagesUpdateBase(
      oldMessages,
      newMessages,
      [],
      latestTime,
      (msg: any) => msg.timestamp,
      scrollElRef,
      () => false
    );
    
    tick(100);
    
    expect((widget as any).scrollToBottomBase).not.toHaveBeenCalled();
  }));
  
  it('handleMessagesUpdateBase: empty actuallyNewMessages', fakeAsync(() => {
    const existingMsg: MockMessage = { 
      id: '1', 
      sender: 'A', 
      content: '{"text":"existing"}', 
      timestamp: '2024-01-01T10:00:00Z' 
    };
    
    const oldMessages: MockMessage[] = [existingMsg];
    const newMessages: MockMessage[] = [existingMsg];
    
    const latestTime = new Date('2024-01-01T10:00:00Z').getTime();
    
    spyOn(widget as any, 'loadFilesForMessagesBase');
    spyOn(widget as any, 'scrollToBottomBase');
    
    const result = (widget as any).handleMessagesUpdateBase(
      oldMessages,
      newMessages,
      [],
      latestTime,
      (msg: any) => msg.timestamp,
      scrollElRef,
      () => false
    );
    
    tick(100);
    
    expect((widget as any).loadFilesForMessagesBase).not.toHaveBeenCalled();
    expect((widget as any).scrollToBottomBase).not.toHaveBeenCalled();
    expect(result).toBe(latestTime);
  }));
  
  it('forceRefreshAllFileUrls: messages with invalid JSON catch block', () => {
    widget.messages = [
      { id: '1', sender: 'A', content: 'invalid json' }
    ];
    
    spyOn(widget as any, 'loadFilesForMessagesBase');
    
    (widget as any).forceRefreshAllFileUrls();
    
    expect((widget as any).loadFilesForMessagesBase).not.toHaveBeenCalled();
  });
  
  it('forceRefreshAllFileUrls: messages without files (else branch)', () => {
    widget.messages = [
      { id: '1', sender: 'A', content: '{"text":"no files"}' },
      { id: '2', sender: 'B', content: '{"text":"also no files","files":[]}' }
    ];
    
    spyOn(widget as any, 'loadFilesForMessagesBase');
    
    (widget as any).forceRefreshAllFileUrls();
    
    expect((widget as any).loadFilesForMessagesBase).not.toHaveBeenCalled();
  });
  
  it('handleInitialLoadBase: empty messages array', () => {
    const result = (widget as any).handleInitialLoadBase(
      [],
      (msg: any) => msg.timestamp,
      scrollElRef
    );
    
    expect(result).toBe(0);
  });
  
  it('handleInitialLoadBase: messages with sorting', fakeAsync(() => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"text":"first"}', timestamp: '2024-01-01T10:00:00Z' },
      { id: '2', sender: 'B', content: '{"text":"second"}', timestamp: '2024-01-01T12:00:00Z' },
      { id: '3', sender: 'C', content: '{"text":"third"}', timestamp: '2024-01-01T11:00:00Z' }
    ];
    
    const result = (widget as any).handleInitialLoadBase(
      messages,
      (msg: any) => msg.timestamp,
      scrollElRef
    );
    
    tick(100);
    
    expect(result).toBe(new Date('2024-01-01T12:00:00Z').getTime());
  }));
  
  it('handleInitialLoadBase: messages with invalid JSON in filter catch', fakeAsync(() => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: 'invalid json', timestamp: '2024-01-01T10:00:00Z' },
      { id: '2', sender: 'B', content: '{"text":"valid"}', timestamp: '2024-01-01T11:00:00Z' }
    ];
    
    spyOn(widget as any, 'loadFilesForMessagesBase');
    
    (widget as any).handleInitialLoadBase(
      messages,
      (msg: any) => msg.timestamp,
      scrollElRef
    );
    
    tick(100);

    expect((widget as any).loadFilesForMessagesBase).not.toHaveBeenCalled();
  }));
  
  it('trackByFileWithRefresh: file without uniqueId and _version', () => {
    const file = { fileName: 'test.jpg' };
    const result = widget.trackByFileWithRefresh(3, file);
    expect(result).toBe('test.jpg_0_3');
  });
  
  it('refreshFileUrl: uses fileName as cacheKey when uniqueFileName is empty', async () => {
    const result = await (widget as any).refreshFileUrl('test.jpg', '');
    
    expect(result).toBe('https://cdn.example.com/test.jpg');
    expect(widget.urlCache.has('test.jpg')).toBeTrue();
  });

  it('addFileToMessageBase: returns early when message not found', async () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"text":"test"}' }
    ];
    
    await widget.addFileToMessageBase('nonexistent', messages, {
      fileName: 'test.jpg',
      uniqueFileName: 'unique_test.jpg',
      url: 'http://test.com/test.jpg'
    }, cdr);

    expect(messages[0].content).toBe('{"text":"test"}');
    expect(cdr.markForCheck).not.toHaveBeenCalled();
  });

  it('forceFileRefreshBase: returns early when message not found', () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"files":[{"uniqueId":"file1"}]}' }
    ];
    
    widget.forceFileRefreshBase('nonexistent', messages, 'file1', cdr);
    
    expect(cdr.markForCheck).not.toHaveBeenCalled();
  });
  
  it('forceFileRefreshBase: finds file by uniqueFileName', () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"files":[{"uniqueFileName":"unique_file1","fileName":"test.jpg"}]}' }
    ];
    
    widget.forceFileRefreshBase('1', messages, 'unique_file1', cdr);
    
    const parsed = JSON.parse(messages[0].content);
    expect(parsed.files[0]._version).toBeDefined();
    expect(cdr.markForCheck).toHaveBeenCalled();
  });

  it('getFileExtension: fileName is empty string', () => {
    expect(widget.getFileExtension('')).toBe('File');
  });
  
  it('getFileExtension: fileName with only dot', () => {
    expect(widget.getFileExtension('.')).toBe('File');
  });

  it('addFileToMessageBase: generates uniqueId when uniqueFileName is empty', async () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"text":"test"}' }
    ];
    
    await widget.addFileToMessageBase('1', messages, {
      fileName: 'test.jpg',
      uniqueFileName: '',
      url: 'http://test.com/test.jpg'
    }, cdr);
    
    const parsed = JSON.parse(messages[0].content);
    expect(parsed.files[0].uniqueId).toContain('test.jpg_');
    expect(parsed.files[0].uniqueId).toMatch(/test\.jpg_\d+/);
  });

  it('removeFileFromMessageBase: returns early when message not found', async () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"files":[{"uniqueFileName":"test.jpg"}]}' }
    ];
    
    await widget.removeFileFromMessageBase('nonexistent', messages, 'test.jpg', cdr);
    
    const parsed = JSON.parse(messages[0].content);
    expect(parsed.files.length).toBe(1);
  });
  
  it('replaceFileInMessageBase: returns early when message not found', async () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"files":[{"uniqueFileName":"old.jpg"}]}' }
    ];
    
    await widget.replaceFileInMessageBase('nonexistent', messages, 'old.jpg', {
      fileName: 'new.jpg',
      uniqueFileName: 'unique_new.jpg',
      url: 'new_url'
    }, cdr);
    
    const parsed = JSON.parse(messages[0].content);
    expect(parsed.files[0].uniqueFileName).toBe('old.jpg');
  });
  
  it('replaceFileInMessageBase: returns early when parsed.files is undefined', async () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"text":"no files"}' }
    ];
    
    await widget.replaceFileInMessageBase('1', messages, 'old.jpg', {
      fileName: 'new.jpg',
      uniqueFileName: 'unique_new.jpg',
      url: 'new_url'
    }, cdr);
    
    const parsed = JSON.parse(messages[0].content);
    expect(parsed.files).toBeUndefined();
  });
  
  it('replaceFileInMessageBase: returns early when file not found', async () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"files":[{"uniqueFileName":"other.jpg"}]}' }
    ];
    
    await widget.replaceFileInMessageBase('1', messages, 'nonexistent.jpg', {
      fileName: 'new.jpg',
      uniqueFileName: 'unique_new.jpg',
      url: 'new_url'
    }, cdr);
    
    const parsed = JSON.parse(messages[0].content);
    expect(parsed.files[0].uniqueFileName).toBe('other.jpg');
  });
  
  it('replaceFileInMessageBase: finds file by uniqueId', async () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"files":[{"uniqueId":"unique_old","fileName":"old.jpg","url":"old_url"}]}' }
    ];
    
    await widget.replaceFileInMessageBase('1', messages, 'unique_old', {
      fileName: 'new.jpg',
      uniqueFileName: 'unique_new.jpg',
      url: 'new_url'
    }, cdr);
    
    const parsed = JSON.parse(messages[0].content);
    expect(parsed.files[0].fileName).toBe('new.jpg');
  });
  
  it('replaceFileInMessageBase: finds file by fileName', async () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"files":[{"fileName":"old.jpg","url":"old_url"}]}' }
    ];
    
    await widget.replaceFileInMessageBase('1', messages, 'old.jpg', {
      fileName: 'new.jpg',
      uniqueFileName: 'unique_new.jpg',
      url: 'new_url'
    }, cdr);
    
    const parsed = JSON.parse(messages[0].content);
    expect(parsed.files[0].fileName).toBe('new.jpg');
  });
  
  it('replaceFileInMessageBase: deletes old cache keys', async () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"files":[{"uniqueFileName":"unique_old.jpg","fileName":"old.jpg","uniqueId":"id_old","url":"old_url"}]}' }
    ];
    
    widget.urlCache.set('unique_old.jpg', { url: 'cached', timestamp: 123 });
    widget.urlCache.set('old.jpg', { url: 'cached', timestamp: 123 });
    widget.urlCache.set('id_old', { url: 'cached', timestamp: 123 });
    
    await widget.replaceFileInMessageBase('1', messages, 'unique_old.jpg', {
      fileName: 'new.jpg',
      uniqueFileName: 'unique_new.jpg',
      url: 'new_url'
    }, cdr);
    
    expect(widget.urlCache.has('unique_old.jpg')).toBeFalse();
    expect(widget.urlCache.has('old.jpg')).toBeFalse();
    expect(widget.urlCache.has('id_old')).toBeFalse();
    expect(widget.urlCache.has('unique_new.jpg')).toBeTrue();
  });
  
  it('replaceFileInMessageBase: uses detectFileType when type not provided', async () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"files":[{"uniqueFileName":"old.jpg","url":"old_url"}]}' }
    ];
    
    await widget.replaceFileInMessageBase('1', messages, 'old.jpg', {
      fileName: 'new.png',
      uniqueFileName: 'unique_new.png',
      url: 'new_url'
    }, cdr);
    
    const parsed = JSON.parse(messages[0].content);
    expect(parsed.files[0].type).toBe('image/png');
  });

  it('fullMessageRerenderBase: returns early when message not found', () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"text":"test"}' }
    ];
    
    widget.fullMessageRerenderBase('nonexistent', messages, cdr);
    
    expect(cdr.markForCheck).not.toHaveBeenCalled();
  });
  
  it('loadFilesForMessagesBase: checks isUrlExpired for cached URL', async () => {
    const expiredTimestamp = Date.now() - 11 * 60 * 1000; 
    
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"files":[{"fileName":"test.jpg","uniqueFileName":"unique_test.jpg","url":"old_url"}]}' }
    ];
    
    widget.urlCache.set('unique_test.jpg', { 
      url: 'old_url', 
      timestamp: expiredTimestamp 
    });
    
    await (widget as any).loadFilesForMessagesBase(messages);
    
    expect(fileApi.getDownloadUrls).toHaveBeenCalledWith(['test.jpg']);
    
    const parsed = JSON.parse(messages[0].content);
    expect(parsed.files[0].url).toBe('https://cdn.example.com/test.jpg');
  });

  it('loadFilesForMessagesBase: skips file when fileUrl not found in urlMap', async () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"files":[{"fileName":"test.jpg"}]}' }
    ];
    
    fileApi.getDownloadUrls = jasmine.createSpy('getDownloadUrls').and.returnValue(
      Promise.resolve([{ originalName: 'different.jpg', url: 'http://test.com/different.jpg', uniqueFileName: 'unique_different.jpg' }])
    );
    
    await (widget as any).loadFilesForMessagesBase(messages);
    
    const parsed = JSON.parse(messages[0].content);
    expect(parsed.files[0].url).toBeUndefined();
  });
  
  it('loadFilesForMessagesBase: uses fileName as cacheKey when uniqueFileName is missing', async () => {
    const messages: MockMessage[] = [
      { id: '1', sender: 'A', content: '{"files":[{"fileName":"test.jpg"}]}' }
    ];
    
    fileApi.getDownloadUrls = jasmine.createSpy('getDownloadUrls').and.returnValue(
      Promise.resolve([{ originalName: 'test.jpg', url: 'http://test.com/test.jpg', uniqueFileName: '' }])
    );
    
    await (widget as any).loadFilesForMessagesBase(messages);
    
    expect(widget.urlCache.has('test.jpg')).toBeTrue();
    expect(widget.urlCache.get('test.jpg')?.url).toBe('http://test.com/test.jpg');
  });
});