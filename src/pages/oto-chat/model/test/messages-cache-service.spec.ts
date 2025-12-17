import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MessageCacheService } from '../messages-cache-service.js';
import { OtoMessage } from '../../../../entities/oto-message';
import { ChangeDetectorRef } from '@angular/core';

describe('MessageCacheService', () => {
  let service: MessageCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessageCacheService);

    service.clearAllCaches();
  });

  it('should set and get cached message', () => {
    service.setCachedMessage('1', 'hello', []);
    const cached = service.getCachedMessage('1');

    expect(cached!.text).toBe('hello');
    expect(cached!.files).toEqual([]);
  });

  it('should invalidate message', () => {
    service.setCachedMessage('1', 'test', []);
    service.invalidateMessage('1');

    expect(service.getCachedMessage('1')).toBeUndefined();
  });

  it('should clear message cache', () => {
    service.setCachedMessage('1', 'a', []);
    service.setCachedMessage('2', 'b', []);

    service.clearMessageCache();

    expect(service.messageContentCache.size).toBe(0);
  });

  it('should detect if URL expired', () => {
    const ts = Date.now() - 60 * 60 * 1000;
    expect(service.isUrlExpired(ts)).toBeTrue();
  });

  it('should detect URL about to expire', () => {
    const ts = Date.now() - 49 * 60 * 1000;
    expect(service.isUrlAboutToExpire(ts)).toBeTrue();
  });

  it('should set and get cached URL', () => {
    service.setCachedUrl('key', 'http://test.com');

    const cached = service.getCachedUrl('key');
    expect(cached!.url).toBe('http://test.com');
  });

  it('should invalidate URL', () => {
    service.setCachedUrl('key', 'x');
    service.invalidateUrl('key');

    expect(service.getCachedUrl('key')).toBeUndefined();
  });

  it('should invalidate URLs by keys', () => {
    service.setCachedUrl('a', '1');
    service.setCachedUrl('b', '2');

    service.invalidateUrlsByKeys(['a', 'b']);

    expect(service.urlCache.size).toBe(0);
  });

  it('should clear all caches', () => {
    service.setCachedMessage('1', 't', []);
    service.setCachedUrl('a', 'url');

    service.clearAllCaches();

    expect(service.urlCache.size).toBe(0);
    expect(service.messageContentCache.size).toBe(0);
  });

  it('should generate file version', () => {
    const v = service.generateFileVersion({ fileName: 'x.png' });

    expect(v.uniqueId).toContain('FILE_');
    expect(v.typeKey).toContain('unknown');
  });

  it('should enhance file with version', () => {
    const f = service.enhanceFileWithVersion({
      fileName: 'img.png',
      type: 'image/png'
    });

    expect(f.uniqueId).toContain('FILE_');
    expect(f._version).toBeDefined();
  });

  it('should generate unique file id', () => {
    const id = service.generateUniqueFileId('file.jpg');
    expect(id).toContain('FILE_');
  });

  it('should generate refresh key', () => {
    const key = service.generateRefreshKey();
    expect(typeof key).toBe('string');
  });

  it('should store and retrieve messagesWidget', () => {
    const widget = { x: 1 };
    service.setMessagesWidget(widget);
    expect(service.getMessagesWidget()).toBe(widget);
  });

  it('should trigger force reload events', (done) => {
    const states: boolean[] = [];
    const sub = service.forceReload$.subscribe(v => states.push(v));

    service.triggerForceReload();

    setTimeout(() => {
      expect(states).toContain(true);
      expect(states).toContain(false);
      sub.unsubscribe();
      done();
    }, 150);
  });

  it('should warn if forceCompleteMessageUpdate is called without widget', () => {
    const spy = spyOn(console, 'warn');
    service.forceCompleteMessageUpdate('1');
    expect(spy).toHaveBeenCalled();
  });

  it('should warn if message not found', () => {
    service.setMessagesWidget({ messages: [] });
    const spy = spyOn(console, 'warn');

    service.forceCompleteMessageUpdate('404');

    expect(spy).toHaveBeenCalled();
  });

  it('should update videos refresh key inside forceCompleteMessageUpdate', () => {
    const widget = {
      messages: [
        {
          messageId: '1',
          content: JSON.stringify({
            text: '',
            files: [{ type: 'video/mp4', x: 1 }]
          })
        } as any
      ],
      fullMessageRerender: jasmine.createSpy('fullMessageRerender')
    };

    service.setMessagesWidget(widget);
    service.forceCompleteMessageUpdate('1');

    const updated = JSON.parse(widget.messages[0].content);
    expect(updated.files[0]._videoRefreshKey).toBeDefined();
  });

  it('should catch JSON error in forceCompleteMessageUpdate', () => {
    const spy = spyOn(console, 'error');
    const widget = {
      messages: [{ messageId: '1', content: 'INVALID JSON' }] as any[],
      fullMessageRerender: () => {}
    };

    service.setMessagesWidget(widget);
    service.forceCompleteMessageUpdate('1');

    expect(spy).toHaveBeenCalled();
  });

  it('invalidateAndUpdate should update version', () => {
    const widget = {
      messages: [{ messageId: '1', content: 'x' } as any]
    };

    service.setMessagesWidget(widget);

    service.invalidateAndUpdate('1');

    expect(widget.messages[0]._version).toBeDefined();
  });

  it('should updateEditingMessageFile', () => {
    const msg: OtoMessage = {
      messageId: '1',
      content: JSON.stringify({ files: [] })
    } as any;

    const updated = service.updateEditingMessageFile(
      msg,
      { uniqueFileName: 'old.jpg' },
      { fileName: 'new.png', type: 'image/png' }
    );

    const parsed = JSON.parse(updated.content);
    expect(parsed.files.length).toBe(1);
  });

  it('should updateMessagesArrayWithFile', () => {
    const messages: any[] = [
      { messageId: '1', content: JSON.stringify({ files: [] }) }
    ];

    const updated = service.updateMessagesArrayWithFile(
      messages as any,
      '1',
      { fileName: 'old.jpg' },
      { fileName: 'new.png', type: 'image/png', url: 'u' }
    );

    const parsed = JSON.parse(updated[0].content);
    expect(parsed.files.length).toBe(1);
  });

  it('should generate timestamp', () => {
    expect(typeof service.getTimestamp()).toBe('number');
  });

  it('should generate random key', () => {
    expect(service.generateRandomKey().length).toBeGreaterThan(0);
  });

  it('should destroy service', () => {
    service.setCachedMessage('1', 't', []);
    service.setCachedUrl('x', 'url');

    service.destroy();

    expect(service.messageContentCache.size).toBe(0);
    expect(service.urlCache.size).toBe(0);
  });

  it('should require reparse when no cached data exists', () => {
    const msg = { messageId: '1', _version: 1 } as any;

    const result = service.needsReparse(msg, '1');

    expect(result).toBeTrue();
  });

  it('should require reparse when message version is newer', () => {
    service.messageContentCache.set('1', { text: '', files: [], timestamp: 1 });
    const msg = { messageId: '1', _version: 5 } as any;

    const result = service.needsReparse(msg, '1');

    expect(result).toBeTrue();
  });

  it('should require reparse when force flags exist', () => {
    service.messageContentCache.set('1', { text: '', files: [], timestamp: Date.now() });

    const msg = {
      messageId: '1',
      _version: 1,
      _forceRefresh: true,
      _forceRerender: true,
      _hasTemporaryChanges: true
    } as any;

    const result = service.needsReparse(msg, '1');

    expect(result).toBeTrue();
  });

  it('should clear refresh flags', () => {
    const msg: any = {
      forceRefresh: true,
      _forceRefresh: true,
      _forceRerender: true,
      _hasTemporaryChanges: true
    };

    service.clearRefreshFlags(msg);

    expect(msg.forceRefresh).toBeUndefined();
    expect(msg._forceRefresh).toBeUndefined();
    expect(msg._forceRerender).toBeUndefined();
    expect(msg._hasTemporaryChanges).toBeUndefined();
  });

  it('should clear message with metadata', () => {
    const msg: any = {
      parsedContent: { a: 1 },
      _cachedVersion: 123
    };

    service.messageContentCache.set('1', { text: 'x', files: [], timestamp: Date.now() });

    service.clearMessageWithMetadata('1', msg);

    expect(service.getCachedMessage('1')).toBeUndefined();
    expect(msg.parsedContent).toBeUndefined();
    expect(msg._cachedVersion).toBeUndefined();
  });

  it('should clear URL cache', () => {
    service.setCachedUrl('k1', 'http://x');
    service.setCachedUrl('k2', 'http://y');

    expect(service.urlCache.size).toBe(2);

    service.clearUrlCache();

    expect(service.urlCache.size).toBe(0);
  });

  it('should force reload images with multiple delayed calls', fakeAsync(() => {
    const spy = spyOn<any>(service, 'forceImageReloadInternal');
  
    service.forceReloadImages('MSG1');
    tick(0);
    expect(spy).toHaveBeenCalledTimes(1);

    tick(50);
    expect(spy).toHaveBeenCalledTimes(2);
  
    tick(50); 
    expect(spy).toHaveBeenCalledTimes(3);
  
    tick(100); 
    expect(spy).toHaveBeenCalledTimes(4);
  
    tick(200);
    expect(spy).toHaveBeenCalledTimes(5);
  }));
  
  it('should schedule multiple forceImageReloadInternal calls in forceReloadImages', fakeAsync(() => {
    const service = TestBed.inject(MessageCacheService);
  
    const spy = spyOn<any>(service, 'forceImageReloadInternal');
  
    service.forceReloadImages('123');
    tick(0);
    tick(50);
    tick(100);
    tick(200);
    tick(400);
  
    expect(spy.calls.count()).toBe(5);
  }));  

  it('should clear refresh flags', () => {
    const msg: any = {
      forceRefresh: true,
      _forceRefresh: true,
      _forceRerender: true,
      _hasTemporaryChanges: true
    };
  
    service.clearRefreshFlags(msg);
  
    expect(msg.forceRefresh).toBeUndefined();
    expect(msg._forceRefresh).toBeUndefined();
    expect(msg._forceRerender).toBeUndefined();
    expect(msg._hasTemporaryChanges).toBeUndefined();
  });
  
  it('should return original array when messageId not found', () => {
    const messages: any[] = [
      { messageId: '1', content: '{}' }
    ];
  
    const result = service.updateMessagesArrayWithFile(
      messages as any,
      '404',
      {},
      { fileName: 'x.png' }
    );
  
    expect(result).toBe(messages);
  });

  it('should fallback to parsedMessage with text and empty files when JSON is invalid', () => {
    const service = TestBed.inject(MessageCacheService);
  
    const msg = {
      messageId: '1',
      content: 'INVALID JSON'
    } as any;
  
    const oldFile = { fileName: 'x.png' };
    const newFile = { fileName: 'x.png', type: 'image/png' };
  
    const result = service.updateMessagesArrayWithFile(
      [msg],
      '1',
      oldFile,
      newFile
    );
  
    const parsed = JSON.parse(result[0].content);
  
    expect(parsed.text).toBe('INVALID JSON'); 
    expect(parsed.files.length).toBe(1);      
    expect(parsed.files[0].fileName).toBe('x.png');
    expect(parsed.files[0]._isNew).toBeTrue();
  });  

  it('should replace existing file when match found', () => {
    const messages: any[] = [
      {
        messageId: '1',
        content: JSON.stringify({
          text: '',
          files: [{ fileName: 'old.png' }]
        })
      }
    ];
  
    const result = service.updateMessagesArrayWithFile(
      messages as any,
      '1',
      { fileName: 'old.png' },
      { fileName: 'new.png', type: 'image/png' }
    );
  
    const parsed = JSON.parse(result[0].content);
  
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].fileName).toBe('new.png');
  });

  it('should create files array when missing', () => {
    const messages: any[] = [
      { messageId: '1', content: JSON.stringify({ text: 'aaa' }) }
    ];
  
    const result = service.updateMessagesArrayWithFile(
      messages as any,
      '1',
      { fileName: 'old.jpg' },
      { fileName: 'new.jpg' }
    );
  
    const parsed = JSON.parse(result[0].content);
  
    expect(parsed.files.length).toBe(1);
  });

  it('should add new file when old file not found', () => {
    const messages: any[] = [
      {
        messageId: '1',
        content: JSON.stringify({
          text: '',
          files: [{ fileName: 'something.png' }]
        })
      }
    ];
  
    const result = service.updateMessagesArrayWithFile(
      messages as any,
      '1',
      { fileName: 'not-exist.png' },
      { fileName: 'added.png' }
    );
  
    const parsed = JSON.parse(result[0].content);
  
    expect(parsed.files.some((f: { fileName: string }) => f.fileName === 'added.png')).toBeTrue();
  });
  
  function makeNodeList<T extends Element>(items: T[]): NodeListOf<T> {
    return {
      length: items.length,
      item: (i: number) => items[i] || null,
      forEach: (cb: (value: T, key: number, parent: any) => void) =>
        items.forEach((el, i) => cb(el, i, items))
    } as any as NodeListOf<T>;
  }
  
  it('should reload images and videos in forceImageReloadInternal', () => {
    const service = TestBed.inject(MessageCacheService);
  
    const img1 = document.createElement('img');
    img1.src = 'http://test/img1.png';
    spyOn(img1, 'removeAttribute').and.callThrough();
    spyOn(img1, 'setAttribute').and.callThrough();
  
    const img2 = document.createElement('img');
    img2.src = '';
    spyOn(img2, 'removeAttribute').and.callThrough();
    spyOn(img2, 'setAttribute').and.callThrough();
  
    const video = document.createElement('video');
    spyOn(video, 'load').and.callFake(() => {});
  
    const wrapper = document.createElement('div');
    spyOn(wrapper, 'querySelectorAll').and.callFake((sel: string) => {
      if (sel === 'img[src]') return makeNodeList([img1]);
      if (sel === 'video') return makeNodeList([video]);
      return makeNodeList([]);
    });

    const originalQuerySelectorAll = document.querySelectorAll.bind(document);
    const docSpy = spyOn(document, 'querySelectorAll').and.callFake((selector: string) => {
      if (selector === '[data-message-id="123"]') {
        return makeNodeList([wrapper]);
      }
      return originalQuerySelectorAll(selector);
    });
  
    try {
      (service as any).forceImageReloadInternal('123');
      expect(docSpy).toHaveBeenCalledWith('[data-message-id="123"]');
      expect(img1.removeAttribute).toHaveBeenCalledWith('src');
      expect(img1.setAttribute).toHaveBeenCalledWith('src', 'http://test/img1.png');
      expect(img2.removeAttribute).not.toHaveBeenCalled();
      expect(img2.setAttribute).not.toHaveBeenCalled();
      expect(video.load).toHaveBeenCalled();
    } finally {
      docSpy.and.callThrough();
    }
  });

  it('should require reparse when _forceRerender flag exists', () => {
    service.messageContentCache.set('1', { text: '', files: [], timestamp: Date.now() });
  
    const msg = {
      messageId: '1',
      _version: 1,
      _forceRerender: true
    } as any;
  
    const result = service.needsReparse(msg, '1');
  
    expect(result).toBeTrue();
  });
  
  it('should require reparse when _hasTemporaryChanges flag exists', () => {
    service.messageContentCache.set('1', { text: '', files: [], timestamp: Date.now() });
  
    const msg = {
      messageId: '1',
      _version: 1,
      _hasTemporaryChanges: true
    } as any;
  
    const result = service.needsReparse(msg, '1');
  
    expect(result).toBeTrue();
  });

  it('should call fullMessageRerender in setTimeout', fakeAsync(() => {
    const widget = {
      messages: [
        {
          messageId: '1',
          content: JSON.stringify({ text: '', files: [] })
        } as any
      ],
      fullMessageRerender: jasmine.createSpy('fullMessageRerender')
    };
  
    service.setMessagesWidget(widget);
    service.forceCompleteMessageUpdate('1');
  
    tick(100);
  
    expect(widget.fullMessageRerender).toHaveBeenCalledTimes(2);
  }));
  
  it('should call cdr methods when cdr provided', () => {
    const widget = {
      messages: [
        {
          messageId: '1',
          content: JSON.stringify({ text: '', files: [] })
        } as any
      ],
      fullMessageRerender: jasmine.createSpy('fullMessageRerender')
    };
  
    const cdr = {
      markForCheck: jasmine.createSpy('markForCheck'),
      detectChanges: jasmine.createSpy('detectChanges')
    } as any;
  
    service.setMessagesWidget(widget);
    service.forceCompleteMessageUpdate('1', cdr);
  
    expect(cdr.markForCheck).toHaveBeenCalled();
    expect(cdr.detectChanges).toHaveBeenCalled();
  });

  it('should skip images with empty src in forceImageReloadInternal', () => {
    const service = TestBed.inject(MessageCacheService);
    const imgEmpty = document.createElement('img');
    imgEmpty.setAttribute('src', '');

    Object.defineProperty(imgEmpty, 'src', {
      get: () => '',
      configurable: true
    });
    
    spyOn(imgEmpty, 'removeAttribute').and.callThrough();
    spyOn(imgEmpty, 'setAttribute').and.callThrough();
  
    const imgValid = document.createElement('img');
    imgValid.src = 'http://test/valid.png';
    spyOn(imgValid, 'removeAttribute').and.callThrough();
    spyOn(imgValid, 'setAttribute').and.callThrough();
  
    const wrapper = document.createElement('div');
    spyOn(wrapper, 'querySelectorAll').and.callFake((sel: string) => {
      if (sel === 'img[src]') {
        return makeNodeList([imgEmpty, imgValid]);
      }
      if (sel === 'video') return makeNodeList([]);
      return makeNodeList([]);
    });
  
    const originalQuerySelectorAll = document.querySelectorAll.bind(document);
    const docSpy = spyOn(document, 'querySelectorAll').and.callFake((selector: string) => {
      if (selector === '[data-message-id="123"]') {
        return makeNodeList([wrapper]);
      }
      return originalQuerySelectorAll(selector);
    });
  
    try {
      (service as any).forceImageReloadInternal('123');
  
      expect(imgEmpty.removeAttribute).not.toHaveBeenCalled();
      expect(imgEmpty.setAttribute).not.toHaveBeenCalled();
  
      expect(imgValid.removeAttribute).toHaveBeenCalledWith('src');
      expect(imgValid.setAttribute).toHaveBeenCalledWith('src', 'http://test/valid.png');
    } finally {
      docSpy.and.callThrough();
    }
  });

  it('should call cdr.markForCheck in invalidateAndUpdate when cdr provided', () => {
    const widget = {
      messages: [{ messageId: '1', content: 'x' } as any]
    };
  
    const cdr = {
      markForCheck: jasmine.createSpy('markForCheck')
    } as any;
  
    service.setMessagesWidget(widget);
    service.invalidateAndUpdate('1', cdr);
  
    expect(cdr.markForCheck).toHaveBeenCalled();
  });

  it('should use oldFile.fileName when uniqueFileName is not available', () => {
    const msg: OtoMessage = {
      messageId: '1',
      content: JSON.stringify({ files: [{ fileName: 'old.jpg' }] })
    } as any;
  
    const oldFile = { fileName: 'old.jpg' };
    const newFile = { fileName: 'new.png', type: 'image/png' };
  
    const updated = service.updateEditingMessageFile(msg, oldFile, newFile);
    const parsed = JSON.parse(updated.content);
  
    expect(parsed.files[0]._replacesFile).toBe('old.jpg');
  });
  
  it('should parse empty string as empty object', () => {
    const msg: OtoMessage = {
      messageId: '1',
      content: '' 
    } as any;
  
    const oldFile = { fileName: 'x.jpg' };
    const newFile = { fileName: 'y.png', type: 'image/png' };
  
    const updated = service.updateEditingMessageFile(msg, oldFile, newFile);
    const parsed = JSON.parse(updated.content);
  
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].fileName).toBe('y.png');
  });
  
  it('should use fallback when content is invalid JSON', () => {
    const msg: OtoMessage = {
      messageId: '1',
      content: 'INVALID JSON'
    } as any;
  
    const oldFile = { fileName: 'x.jpg' };
    const newFile = { fileName: 'y.png', type: 'image/png' };
  
    const updated = service.updateEditingMessageFile(msg, oldFile, newFile);
    const parsed = JSON.parse(updated.content);
  
    expect(parsed.text).toBe('INVALID JSON');
    expect(parsed.files.length).toBe(1);
  });
  
  it('should match file by uniqueFileName', () => {
    const msg: OtoMessage = {
      messageId: '1',
      content: JSON.stringify({
        files: [
          { uniqueFileName: 'unique_old.jpg', fileName: 'old.jpg' }
        ]
      })
    } as any;
  
    const oldFile = { uniqueFileName: 'unique_old.jpg' };
    const newFile = { fileName: 'new.png', type: 'image/png' };
  
    const updated = service.updateEditingMessageFile(msg, oldFile, newFile);
    const parsed = JSON.parse(updated.content);
  
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].fileName).toBe('new.png');
  });
  
  it('should match file by uniqueId', () => {
    const msg: OtoMessage = {
      messageId: '1',
      content: JSON.stringify({
        files: [
          { uniqueId: 'ID_123', fileName: 'old.jpg' }
        ]
      })
    } as any;
  
    const oldFile = { uniqueId: 'ID_123' };
    const newFile = { fileName: 'new.png', type: 'image/png' };
  
    const updated = service.updateEditingMessageFile(msg, oldFile, newFile);
    const parsed = JSON.parse(updated.content);
  
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].fileName).toBe('new.png');
  });
  
  it('should replace existing file when match found', () => {
    const msg: OtoMessage = {
      messageId: '1',
      content: JSON.stringify({
        files: [
          { fileName: 'existing.jpg', type: 'image/jpeg' }
        ]
      })
    } as any;
  
    const oldFile = { fileName: 'existing.jpg' };
    const newFile = { fileName: 'replaced.png', type: 'image/png' };
  
    const updated = service.updateEditingMessageFile(msg, oldFile, newFile);
    const parsed = JSON.parse(updated.content);
  
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].fileName).toBe('replaced.png');
    expect(parsed.files[0].type).toBe('image/png');
  });

  it('should use oldFile.fileName when uniqueFileName is not available', () => {
    const msg: OtoMessage = {
      messageId: '1',
      content: JSON.stringify({ files: [{ fileName: 'old.jpg' }] })
    } as any;
  
    const oldFile = { fileName: 'old.jpg' }; 
    const newFile = { fileName: 'new.png', type: 'image/png' };
  
    const updated = service.updateEditingMessageFile(msg, oldFile, newFile);
    const parsed = JSON.parse(updated.content);
  
    expect(parsed.files[0]._replacesFile).toBe('old.jpg');
  });
  
  it('should parse empty string as empty object', () => {
    const msg: OtoMessage = {
      messageId: '1',
      content: '' 
    } as any;
  
    const oldFile = { fileName: 'x.jpg' };
    const newFile = { fileName: 'y.png', type: 'image/png' };
  
    const updated = service.updateEditingMessageFile(msg, oldFile, newFile);
    const parsed = JSON.parse(updated.content);
  
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].fileName).toBe('y.png');
  });
  
  it('should use fallback when content is invalid JSON', () => {
    const msg: OtoMessage = {
      messageId: '1',
      content: 'INVALID JSON'
    } as any;
  
    const oldFile = { fileName: 'x.jpg' };
    const newFile = { fileName: 'y.png', type: 'image/png' };
  
    const updated = service.updateEditingMessageFile(msg, oldFile, newFile);
    const parsed = JSON.parse(updated.content);
  
    expect(parsed.text).toBe('INVALID JSON');
    expect(parsed.files.length).toBe(1);
  });
  
  it('should use empty string when content is null or undefined', () => {
    const msg: OtoMessage = {
      messageId: '1',
      content: null as any
    } as any;
  
    const oldFile = { fileName: 'x.jpg' };
    const newFile = { fileName: 'y.png', type: 'image/png' };
  
    const updated = service.updateEditingMessageFile(msg, oldFile, newFile);
    const parsed = JSON.parse(updated.content);

    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].fileName).toBe('y.png');
  });
  
  it('should match file by uniqueFileName', () => {
    const msg: OtoMessage = {
      messageId: '1',
      content: JSON.stringify({
        files: [
          { uniqueFileName: 'unique_old.jpg', fileName: 'old.jpg' }
        ]
      })
    } as any;
  
    const oldFile = { uniqueFileName: 'unique_old.jpg' };
    const newFile = { fileName: 'new.png', type: 'image/png' };
  
    const updated = service.updateEditingMessageFile(msg, oldFile, newFile);
    const parsed = JSON.parse(updated.content);
  
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].fileName).toBe('new.png');
  });
  
  it('should match file by uniqueId when uniqueFileName is missing', () => {
    const msg: OtoMessage = {
      messageId: '1',
      content: JSON.stringify({
        files: [
          { uniqueId: 'ID_123', fileName: 'old.jpg' }
        ]
      })
    } as any;
  
    const oldFile = { uniqueId: 'ID_123', fileName: 'something.jpg' }; 
    const newFile = { fileName: 'new.png', type: 'image/png' };
  
    const updated = service.updateEditingMessageFile(msg, oldFile, newFile);
    const parsed = JSON.parse(updated.content);
  
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].fileName).toBe('new.png');
  });
  
  it('should match file by fileName when uniqueFileName and uniqueId are missing', () => {
    const msg: OtoMessage = {
      messageId: '1',
      content: JSON.stringify({
        files: [
          { fileName: 'target.jpg' }
        ]
      })
    } as any;
  
    const oldFile = { fileName: 'target.jpg' };
    const newFile = { fileName: 'new.png', type: 'image/png' };
  
    const updated = service.updateEditingMessageFile(msg, oldFile, newFile);
    const parsed = JSON.parse(updated.content);
  
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].fileName).toBe('new.png');
  });
  
  it('should replace existing file when match found', () => {
    const msg: OtoMessage = {
      messageId: '1',
      content: JSON.stringify({
        files: [
          { fileName: 'existing.jpg', type: 'image/jpeg' }
        ]
      })
    } as any;
  
    const oldFile = { fileName: 'existing.jpg' };
    const newFile = { fileName: 'replaced.png', type: 'image/png' };
  
    const updated = service.updateEditingMessageFile(msg, oldFile, newFile);
    const parsed = JSON.parse(updated.content);
  
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].fileName).toBe('replaced.png');
    expect(parsed.files[0].type).toBe('image/png');
  });

  it('should handle empty string in enhancedNewFileData._replacesFile when oldFile has no uniqueFileName and fileName', () => {
    const msg: OtoMessage = {
      messageId: '1',
      content: JSON.stringify({ files: [] })
    } as any;
  
    const oldFile = {}; 
    const newFile = { fileName: 'new.png', type: 'image/png' };
  
    const updated = service.updateEditingMessageFile(msg, oldFile, newFile);
    const parsed = JSON.parse(updated.content);
  
    expect(parsed.files[0]._replacesFile).toBeUndefined();
  });
  
  it('should match file by uniqueId when uniqueFileName does not match', () => {
    const msg: OtoMessage = {
      messageId: '1',
      content: JSON.stringify({
        files: [
          { uniqueId: 'ID_XYZ', fileName: 'old.jpg' }
        ]
      })
    } as any;
  
    const oldFile = { uniqueId: 'ID_XYZ', uniqueFileName: 'wrong_name' };
    const newFile = { fileName: 'new.png', type: 'image/png' };
  
    const updated = service.updateEditingMessageFile(msg, oldFile, newFile);
    const parsed = JSON.parse(updated.content);
  
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].fileName).toBe('new.png');
  });
  
  it('should match file by fileName when uniqueFileName and uniqueId do not match', () => {
    const msg: OtoMessage = {
      messageId: '1',
      content: JSON.stringify({
        files: [
          { fileName: 'match.jpg' }
        ]
      })
    } as any;
  
    const oldFile = { 
      uniqueFileName: 'wrong_unique', 
      uniqueId: 'wrong_id', 
      fileName: 'match.jpg' 
    };
    const newFile = { fileName: 'new.png', type: 'image/png' };
  
    const updated = service.updateEditingMessageFile(msg, oldFile, newFile);
    const parsed = JSON.parse(updated.content);
  
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].fileName).toBe('new.png');
  });
  
  it('should handle parsed.text fallback to empty string when editingMessage.content is empty in catch block', () => {
    const msg: OtoMessage = {
      messageId: '1',
      content: ''
    } as any;
    
    const originalParse = JSON.parse;
    spyOn(JSON, 'parse').and.callFake((str: string) => {
      if (str === '' || str === '{}') {
        throw new Error('Mock parse error');
      }
      return originalParse(str);
    });
  
    const oldFile = { fileName: 'x.jpg' };
    const newFile = { fileName: 'y.png', type: 'image/png' };
  
    const updated = service.updateEditingMessageFile(msg, oldFile, newFile);

    (JSON.parse as jasmine.Spy).and.callThrough();
    const parsed = JSON.parse(updated.content);
  
    expect(parsed.text).toBe('');
    expect(parsed.files.length).toBe(1);
  });

  it('should parse empty content as empty object in updateMessagesArrayWithFile', () => {
    const messages: any[] = [
      { messageId: '1', content: '' } 
    ];
  
    const result = service.updateMessagesArrayWithFile(
      messages as any,
      '1',
      { fileName: 'old.jpg' },
      { fileName: 'new.png', type: 'image/png' }
    );
  
    const parsed = JSON.parse(result[0].content);
  
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].fileName).toBe('new.png');
  });
  
  it('should use content as text when parse fails in updateMessagesArrayWithFile', () => {
    const messages: any[] = [
      { messageId: '1', content: 'Plain text content' }
    ];
  
    const result = service.updateMessagesArrayWithFile(
      messages as any,
      '1',
      { fileName: 'old.jpg' },
      { fileName: 'new.png', type: 'image/png' }
    );
  
    const parsed = JSON.parse(result[0].content);
  
    expect(parsed.text).toBe('Plain text content');
    expect(parsed.files.length).toBe(1);
  });
  
  it('should match file by uniqueId in updateMessagesArrayWithFile', () => {
    const messages: any[] = [
      {
        messageId: '1',
        content: JSON.stringify({
          files: [
            { uniqueId: 'ID_ABC', fileName: 'file.jpg' }
          ]
        })
      }
    ];
  
    const result = service.updateMessagesArrayWithFile(
      messages as any,
      '1',
      { uniqueId: 'ID_ABC', uniqueFileName: 'wrong_name' },
      { fileName: 'new.png', type: 'image/png' }
    );
  
    const parsed = JSON.parse(result[0].content);
  
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].fileName).toBe('new.png');
  });
  
  it('should match file by fileName when uniqueFileName and uniqueId do not match', () => {
    const messages: any[] = [
      {
        messageId: '1',
        content: JSON.stringify({
          files: [
            { fileName: 'target.jpg' }
          ]
        })
      }
    ];
  
    const result = service.updateMessagesArrayWithFile(
      messages as any,
      '1',
      { uniqueFileName: 'wrong', uniqueId: 'wrong_id', fileName: 'target.jpg' },
      { fileName: 'replaced.png', type: 'image/png' }
    );
  
    const parsed = JSON.parse(result[0].content);
  
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].fileName).toBe('replaced.png');
  });

  it('should handle empty message.content in catch block of updateMessagesArrayWithFile', () => {
    const messages: any[] = [
      { messageId: '1', content: '' }
    ];
  
    const originalParse = JSON.parse;
    spyOn(JSON, 'parse').and.callFake((str: string) => {
      if (str === '' || str === '{}') {
        throw new Error('Mock parse error');
      }
      return originalParse(str);
    });
  
    const result = service.updateMessagesArrayWithFile(
      messages as any,
      '1',
      { fileName: 'old.jpg' },
      { fileName: 'new.png', type: 'image/png' }
    );
  
    (JSON.parse as jasmine.Spy).and.callThrough();
    const parsed = JSON.parse(result[0].content);
  
    expect(parsed.text).toBe('');
    expect(parsed.files.length).toBe(1);
  });
});
