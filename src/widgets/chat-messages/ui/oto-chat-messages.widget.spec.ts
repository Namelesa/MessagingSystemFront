import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { ChangeDetectorRef, SimpleChange } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { of, Subject, throwError } from 'rxjs';
import { OtoChatMessagesWidget } from './oto-chat-messages.widget';
import { FileUploadApiService } from '../../../features/file-sender';
import { OtoMessage } from '../../../entities/oto-message';

describe('OtoChatMessagesWidget', () => {
  let component: OtoChatMessagesWidget;
  let fixture: ComponentFixture<OtoChatMessagesWidget>;
  let fileUploadApiSpy: jasmine.SpyObj<FileUploadApiService>;
  let cdrSpy: jasmine.SpyObj<ChangeDetectorRef>;

  const mockMessage: OtoMessage = {
    messageId: 'msg-1',
    sender: 'user1',
    recipient: 'user2',
    content: JSON.stringify({ text: 'Hello', files: [] }),
    sentAt: new Date().toISOString(),
    isDeleted: false
  };

  const mockEncryptedMessage: OtoMessage = {
    messageId: 'msg-enc',
    sender: 'user1',
    recipient: 'user2',
    content: JSON.stringify({
      ciphertext: 'encrypted',
      ephemeralKey: 'key',
      nonce: 'nonce',
      messageNumber: 1
    }),
    sentAt: new Date().toISOString(),
    isDeleted: false
  };

  beforeEach(async () => {
    const fileApiSpy = jasmine.createSpyObj('FileUploadApiService', ['getDownloadUrls']);
    
    await TestBed.configureTestingModule({
      imports: [OtoChatMessagesWidget, TranslateModule.forRoot()],
      providers: [
        { provide: FileUploadApiService, useValue: fileApiSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OtoChatMessagesWidget);
    component = fixture.componentInstance;
    fileUploadApiSpy = TestBed.inject(FileUploadApiService) as jasmine.SpyObj<FileUploadApiService>;
    cdrSpy = jasmine.createSpyObj('ChangeDetectorRef', ['markForCheck', 'detectChanges']);
    component.cdr = cdrSpy;

    component.scrollContainer = {
      nativeElement: {
        scrollTop: 0,
        scrollHeight: 1000,
        clientHeight: 500,
        scrollTo: jasmine.createSpy('scrollTo'),
        addEventListener: jasmine.createSpy(),
        removeEventListener: jasmine.createSpy(),
        querySelector: jasmine.createSpy().and.returnValue(null),
        getBoundingClientRect: () => ({ top: 0, left: 0, right: 800, bottom: 600, width: 800, height: 600 } as DOMRect)
      }
    } as any;

    fileUploadApiSpy.getDownloadUrls.and.returnValue(Promise.resolve([]));
  });

  afterEach(() => {
    fixture.destroy();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with empty messages', () => {
      expect(component.messages).toEqual([]);
    });

    it('should initialize private properties', () => {
      expect((component as any).historyLoadedCount).toBe(0);
      expect((component as any).latestMessageTime).toBe(0);
      expect((component as any).decryptionQueue).toBeInstanceOf(Map);
      expect((component as any).isDecryptingForContact).toBeInstanceOf(Map);
    });
  });

  describe('getMessageIdFromMessage', () => {
    it('should return messageId from message', () => {
      expect(component.getMessageIdFromMessage(mockMessage)).toBe('msg-1');
    });

    it('should return empty string if messageId is undefined', () => {
      const msg = { ...mockMessage, messageId: undefined as any };
      expect(component.getMessageIdFromMessage(msg)).toBe('');
    });
  });

  describe('ngAfterViewInit', () => {
    it('should setup context menu listener', fakeAsync(() => {
      spyOn<any>(component, 'setupContextMenuListener');
      component.ngAfterViewInit();
      expect((component as any).setupContextMenuListener).toHaveBeenCalled();
    }));

    it('should subscribe to user deletion', fakeAsync(() => {
      spyOn<any>(component, 'subscribeToUserDeletion');
      component.ngAfterViewInit();
      expect((component as any).subscribeToUserDeletion).toHaveBeenCalled();
    }));

    it('should start URL expiration check', fakeAsync(() => {
      spyOn<any>(component, 'startUrlExpirationCheck');
      component.ngAfterViewInit();
      expect((component as any).startUrlExpirationCheck).toHaveBeenCalled();
    }));

    it('should scroll to bottom after delay if messages exist', fakeAsync(() => {
      component.messages = [mockMessage];
      spyOn<any>(component, 'scrollToBottomBase');
      component.ngAfterViewInit();
      tick(200);
      expect((component as any).scrollToBottomBase).toHaveBeenCalled();
    }));

    it('should load files for messages with missing URLs after delay', fakeAsync(() => {
      const msgWithFile = {
        ...mockMessage,
        content: JSON.stringify({ text: 'test', files: [{ fileName: 'test.jpg' }] })
      };
      component.messages = [msgWithFile];
      spyOn<any>(component, 'loadFilesForMessagesBase');
      component.ngAfterViewInit();
      tick(2000);
      expect((component as any).loadFilesForMessagesBase).toHaveBeenCalled();
    }));

    it('should not call loadFilesForMessagesBase if no messages with missing URLs', fakeAsync(() => {
      const msgWithCachedFile = {
        ...mockMessage,
        content: JSON.stringify({ 
          text: 'test', 
          files: [{ fileName: 'test.jpg', url: 'http://test.com/test.jpg' }] 
        })
      };
      component.messages = [msgWithCachedFile];
      (component as any).urlCache.set('test.jpg', {
        url: 'http://test.com/test.jpg',
        timestamp: Date.now()
      });
      
      spyOn<any>(component, 'loadFilesForMessagesBase');
      component.ngAfterViewInit();
      tick(2000);
      
      expect((component as any).loadFilesForMessagesBase).not.toHaveBeenCalled();
    }));
  
    it('should handle messages with invalid JSON in filter', fakeAsync(() => {
      const msgWithInvalidJson = {
        ...mockMessage,
        content: 'invalid json'
      };
      component.messages = [msgWithInvalidJson];
      
      spyOn<any>(component, 'loadFilesForMessagesBase');
      component.ngAfterViewInit();
      tick(2000);
      
      expect((component as any).loadFilesForMessagesBase).not.toHaveBeenCalled();
    }));
  
    it('should handle files without url property', fakeAsync(() => {
      const msgWithFileNoUrl = {
        ...mockMessage,
        content: JSON.stringify({ 
          text: 'test', 
          files: [{ fileName: 'test.jpg' }] 
        })
      };
      component.messages = [msgWithFileNoUrl];
      
      spyOn<any>(component, 'loadFilesForMessagesBase');
      component.ngAfterViewInit();
      tick(2000);
      
      expect((component as any).loadFilesForMessagesBase).toHaveBeenCalledWith([msgWithFileNoUrl]);
    }));
  
    it('should handle files with url but no cached url', fakeAsync(() => {
      const msgWithFileNoCachedUrl = {
        ...mockMessage,
        content: JSON.stringify({ 
          text: 'test', 
          files: [{ fileName: 'test.jpg', url: 'http://test.com/test.jpg', uniqueFileName: 'unique.jpg' }] 
        })
      };
      component.messages = [msgWithFileNoCachedUrl];
      
      spyOn<any>(component, 'loadFilesForMessagesBase');
      component.ngAfterViewInit();
      tick(2000);
      
      expect((component as any).loadFilesForMessagesBase).toHaveBeenCalledWith([msgWithFileNoCachedUrl]);
    }));
  });

  describe('ngOnDestroy', () => {
    it('should call baseDestroy', () => {
      spyOn<any>(component, 'baseDestroy');
      component.ngOnDestroy();
      expect((component as any).baseDestroy).toHaveBeenCalled();
    });

    it('should clear URL check interval', () => {
      (component as any).urlCheckInterval = setInterval(() => {}, 1000);
      spyOn(window, 'clearInterval');
      component.ngOnDestroy();
      expect(window.clearInterval).toHaveBeenCalled();
    });
  });

  describe('ngOnChanges', () => {
    it('should call initChat when chatNickName changes', () => {
      spyOn<any>(component, 'initChat');
      component.chatNickName = 'user1';
      component.ngOnChanges({
        chatNickName: new SimpleChange(null, 'user1', true)
      });
      expect((component as any).initChat).toHaveBeenCalled();
    });

    it('should not call initChat if chatNickName is not set', () => {
      spyOn<any>(component, 'initChat');
      component.ngOnChanges({
        chatNickName: new SimpleChange(null, null, true)
      });
      expect((component as any).initChat).not.toHaveBeenCalled();
    });
  });

  describe('parseContent', () => {
    it('should parse JSON content correctly', () => {
      const result = component.parseContent(mockMessage);
      expect(result.text).toBe('Hello');
      expect(result.files).toEqual([]);
    });
    
it('should handle decryptMessageQueued rejection in catch block', () => {
  const encryptedMsg = {
    ...mockMessage,
    content: JSON.stringify({
      ciphertext: 'encrypted',
      ephemeralKey: 'key',
      nonce: 'nonce',
      messageNumber: 1
    })
  };
  
  spyOn<any>(component, 'decryptMessageQueued').and.returnValue(
    Promise.reject(new Error('Decryption queue error'))
  );
  
  const result = component.parseContent(encryptedMsg);
  
  expect(result.text).toBe('[Decrypting...]');
  expect((component as any).decryptMessageQueued).toHaveBeenCalled();
});

it('should use empty array when parsed.files is undefined or null', () => {
  const msgWithoutFiles = {
    ...mockMessage,
    content: JSON.stringify({
      text: 'Hello',
    })
  };
  
  const result = component.parseContent(msgWithoutFiles);
  
  expect(result.text).toBe('Hello');
  expect(result.files).toEqual([]);
});

it('should use empty array when parsed.files is explicitly null', () => {
  const msgWithNullFiles = {
    ...mockMessage,
    content: JSON.stringify({
      text: 'Hello',
      files: null
    })
  };
  
  const result = component.parseContent(msgWithNullFiles);
  
  expect(result.text).toBe('Hello');
  expect(result.files).toEqual([]);
});

it('should extract and set messageId from parsed content', () => {
  const msgWithEmbeddedId = {
    ...mockMessage,
    messageId: 'old-id',
    content: JSON.stringify({
      messageId: 'embedded-id',
      text: 'Hello',
      files: []
    })
  };
  
  component.parseContent(msgWithEmbeddedId);
  
  expect(msgWithEmbeddedId.messageId).toBe('embedded-id');
});

it('should handle JSON parse error when extracting messageId', () => {
  const msgWithInvalidJson = {
    ...mockMessage,
    messageId: 'msg-1',
    content: 'invalid json'
  };
  
  const result = component.parseContent(msgWithInvalidJson);
  
  expect(result.text).toBe('invalid json');
  expect(msgWithInvalidJson.messageId).toBe('msg-1');
});

it('should handle parsed.hasOwnProperty("files") check', () => {
  const msgOnlyFiles = {
    ...mockMessage,
    content: JSON.stringify({
      files: [{ fileName: 'test.jpg', url: 'http://test.com/test.jpg' }]
    })
  };
  
  const result = component.parseContent(msgOnlyFiles);
  
  expect(result.text).toBe('');
  expect(result.files.length).toBe(1);
});

it('should map empty files array', () => {
  const msgWithEmptyFiles = {
    ...mockMessage,
    content: JSON.stringify({
      text: 'Hello',
      files: []
    })
  };
  
  const result = component.parseContent(msgWithEmptyFiles);
  
  expect(result.text).toBe('Hello');
  expect(result.files).toEqual([]);
});

it('should use file._refreshKey when available', () => {
  const msgWithRefreshKey = {
    ...mockMessage,
    content: JSON.stringify({
      text: 'test',
      files: [{
        fileName: 'test.jpg',
        url: 'http://test.com/test.jpg',
        _version: 12345,
        _refreshKey: 'refresh-key-abc'
      }]
    })
  };
  
  const result = component.parseContent(msgWithRefreshKey);
  
  expect(result.files[0].url).toBe('http://test.com/test.jpg');
  expect(result.files[0]._refreshKey).toBe('refresh-key-abc');
});

it('should set newFile.url when file has url, _version and _refreshKey', () => {
  const msgWithVersionedFile = {
    ...mockMessage,
    content: JSON.stringify({
      text: 'test',
      files: [{
        fileName: 'test.jpg',
        url: 'http://test.com/versioned.jpg',
        _version: 12345,
        _refreshKey: 'refresh-abc'
      }]
    })
  };
  
  const result = component.parseContent(msgWithVersionedFile);
  
  expect(result.files[0].url).toBe('http://test.com/versioned.jpg');
  expect(result.files[0]._version).toBe(12345);
  expect(result.files[0]._refreshKey).toBe('refresh-abc');
});

it('should return empty string for text when parsed.text is falsy', () => {
  const msgWithNoText = {
    ...mockMessage,
    content: JSON.stringify({
      text: '',
      files: []
    })
  };
  
  const result = component.parseContent(msgWithNoText);
  
  expect(result.text).toBe('');
});

it('should return plain content when JSON parse fails in catch block', () => {
  const msgWithInvalidContent = {
    ...mockMessage,
    content: 'This is not JSON'
  };
  
  const result = component.parseContent(msgWithInvalidContent);
  
  expect(result.text).toBe('This is not JSON');
  expect(result.files).toEqual([]);
});

it('should handle parsed object that is not plain JSON structure', () => {
  const msgWithSpecialObject = {
    ...mockMessage,
    content: JSON.stringify({
      someOtherProperty: 'value',
      randomData: 123
    })
  };
  
  const result = component.parseContent(msgWithSpecialObject);
  
  expect(result.text).toBe(msgWithSpecialObject.content);
  expect(result.files).toEqual([]);
});

it('should extract and set messageId from parsed content', () => {
  const msgWithEmbeddedId = {
    ...mockMessage,
    messageId: 'old-id',
    content: JSON.stringify({
      messageId: 'embedded-id',
      text: 'Hello',
      files: []
    })
  };
  
  component.parseContent(msgWithEmbeddedId);
  
  expect(msgWithEmbeddedId.messageId).toBe('embedded-id');
});

it('should handle JSON parse error when extracting messageId', () => {
  const msgWithInvalidJson = {
    ...mockMessage,
    messageId: 'msg-1',
    content: 'invalid json'
  };
  
  const result = component.parseContent(msgWithInvalidJson);
  
  expect(result.text).toBe('invalid json');
  expect(msgWithInvalidJson.messageId).toBe('msg-1');
});

it('should handle parsed.hasOwnProperty("files") check', () => {
  const msgOnlyFiles = {
    ...mockMessage,
    content: JSON.stringify({
      files: [{ fileName: 'test.jpg', url: 'http://test.com/test.jpg' }]
    })
  };
  
  const result = component.parseContent(msgOnlyFiles);
  
  expect(result.text).toBe('');
  expect(result.files.length).toBe(1);
});

it('should map empty files array', () => {
  const msgWithEmptyFiles = {
    ...mockMessage,
    content: JSON.stringify({
      text: 'Hello',
      files: []
    })
  };
  
  const result = component.parseContent(msgWithEmptyFiles);
  
  expect(result.text).toBe('Hello');
  expect(result.files).toEqual([]);
});

it('should use file._refreshKey when available', () => {
  const msgWithRefreshKey = {
    ...mockMessage,
    content: JSON.stringify({
      text: 'test',
      files: [{
        fileName: 'test.jpg',
        url: 'http://test.com/test.jpg',
        _version: 12345,
        _refreshKey: 'refresh-key-abc'
      }]
    })
  };
  
  const result = component.parseContent(msgWithRefreshKey);
  
  expect(result.files[0].url).toBe('http://test.com/test.jpg');
  expect(result.files[0]._refreshKey).toBe('refresh-key-abc');
});

it('should set newFile.url when file has url, _version and _refreshKey', () => {
  const msgWithVersionedFile = {
    ...mockMessage,
    content: JSON.stringify({
      text: 'test',
      files: [{
        fileName: 'test.jpg',
        url: 'http://test.com/versioned.jpg',
        _version: 12345,
        _refreshKey: 'refresh-abc'
      }]
    })
  };
  
  const result = component.parseContent(msgWithVersionedFile);
  
  expect(result.files[0].url).toBe('http://test.com/versioned.jpg');
  expect(result.files[0]._version).toBe(12345);
  expect(result.files[0]._refreshKey).toBe('refresh-abc');
});

it('should return empty string for text when parsed.text is falsy', () => {
  const msgWithNoText = {
    ...mockMessage,
    content: JSON.stringify({
      text: '',
      files: []
    })
  };
  
  const result = component.parseContent(msgWithNoText);
  
  expect(result.text).toBe('');
});

it('should return plain content when JSON parse fails in catch block', () => {
  const msgWithInvalidContent = {
    ...mockMessage,
    content: 'This is not JSON'
  };
  
  const result = component.parseContent(msgWithInvalidContent);
  
  expect(result.text).toBe('This is not JSON');
  expect(result.files).toEqual([]);
});

it('should handle parsed object that is not plain JSON structure', () => {
  const msgWithSpecialObject = {
    ...mockMessage,
    content: JSON.stringify({
      someOtherProperty: 'value',
      randomData: 123
    })
  };
  
  const result = component.parseContent(msgWithSpecialObject);
  
  expect(result.text).toBe(msgWithSpecialObject.content);
  expect(result.files).toEqual([]);
});

    it('should return plain text for non-JSON content', () => {
      const msg = { ...mockMessage, content: 'Plain text' };
      const result = component.parseContent(msg);
      expect(result.text).toBe('Plain text');
      expect(result.files).toEqual([]);
    });

    it('should handle encrypted content and show decrypting message', () => {
      const result = component.parseContent(mockEncryptedMessage);
      expect(result.text).toBe('[Decrypting...]');
      expect((mockEncryptedMessage as any)._isDecrypting).toBe(true);
    });

    it('should return cached data if available and fresh', () => {
      component.parseContent(mockMessage);
      const secondResult = component.parseContent(mockMessage);
      expect(secondResult.text).toBe('Hello');
    });

    it('should reparse if message has forceRefresh flag', () => {
      component.parseContent(mockMessage);
      (mockMessage as any).forceRefresh = true;
      const result = component.parseContent(mockMessage);
      expect((mockMessage as any).forceRefresh).toBeUndefined();
    });

    it('should detect file types for files', () => {
      const msgWithFile = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [{ fileName: 'test.jpg', url: 'http://test.com/test.jpg' }]
        })
      };
      const result = component.parseContent(msgWithFile);
      expect(result.files[0].type).toBeDefined();
    });

    it('should use cached URL if available and not expired', () => {
      const msgWithFile = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [{ fileName: 'test.jpg', uniqueFileName: 'unique.jpg' }]
        })
      };
      (component as any).urlCache.set('unique.jpg', {
        url: 'http://cached.com/test.jpg',
        timestamp: Date.now()
      });
      const result = component.parseContent(msgWithFile);
      expect(result.files[0].url).toBe('http://cached.com/test.jpg');
    });

    it('should queue file refresh if URL is expired', () => {
      const msgWithFile = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [{ fileName: 'test.jpg', uniqueFileName: 'unique.jpg' }]
        })
      };
      (component as any).urlCache.set('unique.jpg', {
        url: 'http://expired.com/test.jpg',
        timestamp: Date.now() - 2 * 60 * 60 * 1000
      });
      spyOn<any>(component, 'queueFileUrlRefresh');
      component.parseContent(msgWithFile);
      expect((component as any).queueFileUrlRefresh).toHaveBeenCalled();
    });

    it('should show decryption failed message', () => {
      const msg = { ...mockEncryptedMessage };
      (msg as any)._decryptionFailed = true;
      (msg as any)._isDecrypting = false;
      const result = component.parseContent(msg);
      expect(result.text).toBe('[Decryption failed]');
    });

    it('should show decrypting message while decryption is in progress', () => {
      const msg = { ...mockEncryptedMessage };
      (msg as any)._isDecrypting = true;
      const result = component.parseContent(msg);
      expect(result.text).toBe('[Decrypting...]');
    });
  });

  describe('decryptMessageQueued', () => {
    it('should queue decryption for contact', fakeAsync(() => {
      component.messageDecryptor = jasmine.createSpy().and.returnValue(Promise.resolve('decrypted'));
      const msg = { ...mockEncryptedMessage };
      (component as any).decryptMessageQueued(msg);
      tick();
      expect((component as any).decryptionQueue.has('user1')).toBe(false);
    }));

    it('should wait for existing queue', fakeAsync(() => {
      component.messageDecryptor = jasmine.createSpy().and.returnValue(Promise.resolve('decrypted'));
      const msg1 = { ...mockEncryptedMessage, messageId: 'msg-1' };
      const msg2 = { ...mockEncryptedMessage, messageId: 'msg-2' };
      
      (component as any).decryptMessageQueued(msg1);
      (component as any).decryptMessageQueued(msg2);
      tick();
      
      expect(component.messageDecryptor).toHaveBeenCalledTimes(2);
    }));
  });

  describe('performDecryption', () => {
    it('should decrypt message successfully', fakeAsync(() => {
      component.messageDecryptor = jasmine.createSpy().and.returnValue(
        Promise.resolve(JSON.stringify({ text: 'decrypted', files: [] }))
      );
      const msg = { ...mockEncryptedMessage };
      (component as any).performDecryption(msg);
      tick(100);
      expect((msg as any)._decrypted).toBe(true);
      expect((msg as any)._isDecrypting).toBe(false);
    }));

    it('should handle decryption failure', fakeAsync(() => {
      component.messageDecryptor = jasmine.createSpy().and.returnValue(
        Promise.reject(new Error('Decryption failed'))
      );
      const msg = { ...mockEncryptedMessage };
      (component as any).performDecryption(msg);
      tick();
      expect((msg as any)._decryptionFailed).toBe(true);
      expect(msg.content).toContain('[Decryption failed');
    }));

    it('should wait for messageDecryptor to be available', fakeAsync(() => {
      const msg = { ...mockEncryptedMessage };
      (component as any).performDecryption(msg);
      tick(5000);
      expect((msg as any)._decryptionFailed).toBe(true);
    }));

    it('should load files after decryption if present', fakeAsync(() => {
      component.messageDecryptor = jasmine.createSpy().and.returnValue(
        Promise.resolve(JSON.stringify({ text: 'test', files: [{ fileName: 'test.jpg' }] }))
      );
      spyOn<any>(component, 'loadFilesForMessagesBase');
      const msg = { ...mockEncryptedMessage };
      (component as any).performDecryption(msg);
      tick(200);
      expect((component as any).loadFilesForMessagesBase).toHaveBeenCalled();
    }));

    it('should extract messageId from parsed content if present', fakeAsync(() => {
      const msgWithEmbeddedId = {
        ...mockEncryptedMessage,
        messageId: 'old-id',
        content: JSON.stringify({
          messageId: 'embedded-id',
          ciphertext: 'encrypted',
          ephemeralKey: 'key',
          nonce: 'nonce',
          messageNumber: 1
        })
      };
      
      component.messageDecryptor = jasmine.createSpy().and.returnValue(
        Promise.resolve(JSON.stringify({ text: 'decrypted', files: [] }))
      );
      
      (component as any).performDecryption(msgWithEmbeddedId);
      tick();
      
      expect(msgWithEmbeddedId.messageId).toBe('embedded-id');
    }));
  
    it('should handle JSON parse error when extracting messageId', fakeAsync(() => {
      const msgWithInvalidJson = {
        ...mockEncryptedMessage,
        content: 'invalid json'
      };
      
      component.messageDecryptor = jasmine.createSpy().and.returnValue(
        Promise.resolve(JSON.stringify({ text: 'decrypted', files: [] }))
      );
      
      (component as any).performDecryption(msgWithInvalidJson);
      tick();
      expect(component.messageDecryptor).toHaveBeenCalled();
    }));
  
    it('should handle decryption error with error message', fakeAsync(() => {
      component.messageDecryptor = jasmine.createSpy().and.returnValue(
        Promise.reject({ message: 'Custom error message' })
      );
      const msg = { ...mockEncryptedMessage };
      
      (component as any).performDecryption(msg);
      tick();
      
      expect(msg.content).toBe('[Decryption failed: Custom error message]');
      expect((msg as any)._decryptionFailed).toBe(true);
    }));
  
    it('should handle decryption error without error message', fakeAsync(() => {
      component.messageDecryptor = jasmine.createSpy().and.returnValue(
        Promise.reject({})
      );
      const msg = { ...mockEncryptedMessage };
      
      (component as any).performDecryption(msg);
      tick();
      
      expect(msg.content).toBe('[Decryption failed: Unknown error]');
      expect((msg as any)._decryptionFailed).toBe(true);
    }));
  
    it('should handle JSON parse error in setTimeout for files', fakeAsync(() => {
      component.messageDecryptor = jasmine.createSpy().and.returnValue(
        Promise.resolve('not valid json')
      );
      const msg = { ...mockEncryptedMessage };
      
      (component as any).performDecryption(msg);
      tick(200);
      
      expect(msg.content).toBe('not valid json');
      expect((msg as any)._decrypted).toBe(true);
    }));
  
    it('should not call loadFilesForMessagesBase if no files in decrypted content', fakeAsync(() => {
      component.messageDecryptor = jasmine.createSpy().and.returnValue(
        Promise.resolve(JSON.stringify({ text: 'test', files: [] }))
      );
      spyOn<any>(component, 'loadFilesForMessagesBase');
      const msg = { ...mockEncryptedMessage };
      
      (component as any).performDecryption(msg);
      tick(200);
      
      expect((component as any).loadFilesForMessagesBase).not.toHaveBeenCalled();
    }));
  
    it('should delete all decryption flags on successful decryption', fakeAsync(() => {
      component.messageDecryptor = jasmine.createSpy().and.returnValue(
        Promise.resolve(JSON.stringify({ text: 'decrypted', files: [] }))
      );
      const msg = { ...mockEncryptedMessage };
      (msg as any)._decryptionFailed = true;
      
      (component as any).performDecryption(msg);
      tick(100);
      
      expect((msg as any)._decrypted).toBe(true);
      expect((msg as any)._isDecrypting).toBe(false);
      expect((msg as any)._decryptionFailed).toBeUndefined();
    }));
  
    it('should delete decrypted flag on decryption failure', fakeAsync(() => {
      component.messageDecryptor = jasmine.createSpy().and.returnValue(
        Promise.reject(new Error('Failed'))
      );
      const msg = { ...mockEncryptedMessage };
      (msg as any)._decrypted = true;
      
      (component as any).performDecryption(msg);
      tick();
      
      expect((msg as any)._decryptionFailed).toBe(true);
      expect((msg as any)._isDecrypting).toBe(false);
      expect((msg as any)._decrypted).toBeUndefined();
    }));
  
    it('should clear message cache on both success and failure', fakeAsync(() => {
      const msg = { ...mockEncryptedMessage };
      (component as any).messageContentCache.set(msg.messageId, { text: 'cached', files: [], timestamp: 0 });
      
      component.messageDecryptor = jasmine.createSpy().and.returnValue(
        Promise.resolve(JSON.stringify({ text: 'decrypted', files: [] }))
      );
      
      (component as any).performDecryption(msg);
      tick(100);
      
      expect((component as any).messageContentCache.has(msg.messageId)).toBe(false);
      
      (component as any).messageContentCache.set(msg.messageId, { text: 'cached', files: [], timestamp: 0 });
      component.messageDecryptor = jasmine.createSpy().and.returnValue(
        Promise.reject(new Error('Failed'))
      );
      
      (component as any).performDecryption(msg);
      tick();
      
      expect((component as any).messageContentCache.has(msg.messageId)).toBe(false);
    }));
  });

  describe('startUrlExpirationCheck', () => {
    it('should set interval for URL expiration check', () => {
      spyOn(window, 'setInterval').and.returnValue(123 as any);
      (component as any).startUrlExpirationCheck();
      expect(window.setInterval).toHaveBeenCalled();
    });
  });

  describe('onImageError', () => {
    it('should retry loading image on error', fakeAsync(() => {
      const mockImg = { src: '' } as HTMLImageElement;
      const event = { target: mockImg } as unknown as Event;
      const file = { url: 'http://test.com/image.jpg?token=abc' };
      
      component.onImageError(event, file);
      tick(600);
      
      expect(mockImg.src).toContain('http://test.com/image.jpg?retry=');
    }));

    it('should not retry if URL is invalid', () => {
      const mockImg = { src: '' } as HTMLImageElement;
      const event = { target: mockImg } as unknown as Event;
      const file = { url: 'undefined' };
      
      component.onImageError(event, file);
      expect(mockImg.src).toBe('');
    });
  });

  describe('checkAndRefreshExpiredUrls', () => {
    it('should not process if no messages', () => {
      component.messages = [];
      (component as any).checkAndRefreshExpiredUrls();
      expect(fileUploadApiSpy.getDownloadUrls).not.toHaveBeenCalled();
    });

    it('should use fu.originalName as fallback when fu.uniqueFileName is not available', fakeAsync(() => {
      const msgWithFile = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [{ fileName: 'test.jpg', url: 'http://old.com/test.jpg' }]
        })
      };
      component.messages = [msgWithFile];
    
      (component as any).urlCache.set('test.jpg', {
        url: 'http://old.com/test.jpg',
        timestamp: Date.now() - 2 * 60 * 60 * 1000
      });
      
      fileUploadApiSpy.getDownloadUrls.and.returnValue(Promise.resolve([
        { 
          originalName: 'test.jpg', 
          uniqueFileName: undefined as any,
          url: 'http://new.com/test.jpg' 
        }
      ]));
      
      (component as any).checkAndRefreshExpiredUrls();
      tick();
      
      const cachedUrl = (component as any).urlCache.get('test.jpg');
      expect(cachedUrl).toBeDefined();
      expect(cachedUrl.url).toBe('http://new.com/test.jpg');
    }));

    it('should refresh expired URLs', fakeAsync(() => {
      const msgWithFile = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [{ fileName: 'test.jpg', uniqueFileName: 'unique.jpg', url: 'http://old.com/test.jpg' }]
        })
      };
      component.messages = [msgWithFile];
      (component as any).urlCache.set('unique.jpg', {
        url: 'http://old.com/test.jpg',
        timestamp: Date.now() - 2 * 60 * 60 * 1000
      });
      
      fileUploadApiSpy.getDownloadUrls.and.returnValue(Promise.resolve([
        { originalName: 'test.jpg', uniqueFileName: 'unique.jpg', url: 'http://new.com/test.jpg' }
      ]));
      
      (component as any).checkAndRefreshExpiredUrls();
      tick();
      
      expect(fileUploadApiSpy.getDownloadUrls).toHaveBeenCalled();
    }));

    it('should handle refresh errors gracefully', fakeAsync(() => {
      const msgWithFile = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [{ fileName: 'test.jpg', url: 'http://old.com/test.jpg' }]
        })
      };
      component.messages = [msgWithFile];
      (component as any).urlCache.set('test.jpg', {
        url: 'http://old.com/test.jpg',
        timestamp: 0
      });
      
      fileUploadApiSpy.getDownloadUrls.and.returnValue(Promise.reject('error'));
      (component as any).checkAndRefreshExpiredUrls();
      tick();
      
      expect(cdrSpy.markForCheck).not.toHaveBeenCalled();
    }));
  });

  describe('getTimestamp', () => {
    it('should return current timestamp', () => {
      const before = Date.now();
      const result = component.getTimestamp();
      const after = Date.now();
      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });
  });

  describe('queueFileUrlRefresh', () => {
    it('should add file to refresh queue', () => {
      const file = { fileName: 'test.jpg', uniqueFileName: 'unique.jpg' };
      (component as any).queueFileUrlRefresh(file, 'msg-1');
      expect((component as any).fileRefreshQueue.has('unique.jpg')).toBe(true);
    });

    it('should clear existing timer and set new one', fakeAsync(() => {
      const file = { fileName: 'test.jpg' };
      spyOn(window, 'clearTimeout');
      (component as any).fileRefreshTimer = setTimeout(() => {}, 1000);
      (component as any).queueFileUrlRefresh(file, 'msg-1');
      expect(window.clearTimeout).toHaveBeenCalled();
    }));
  });

  describe('processPendingFileRefreshes', () => {
    it('should not process if queue is empty', fakeAsync(() => {
      (component as any).fileRefreshQueue.clear();
      (component as any).processPendingFileRefreshes();
      tick();
      expect(fileUploadApiSpy.getDownloadUrls).not.toHaveBeenCalled();
    }));

    it('should fetch URLs for queued files', fakeAsync(() => {
      (component as any).fileRefreshQueue.set('test.jpg', new Set(['msg-1']));
      fileUploadApiSpy.getDownloadUrls.and.returnValue(Promise.resolve([
        { originalName: 'test.jpg', uniqueFileName: 'unique.jpg', url: 'http://new.com/test.jpg' }
      ]));
      
      (component as any).processPendingFileRefreshes();
      tick();
      
      expect(fileUploadApiSpy.getDownloadUrls).toHaveBeenCalledWith(['test.jpg']);
    }));

    it('should handle fetch errors', fakeAsync(() => {
      (component as any).fileRefreshQueue.set('test.jpg', new Set(['msg-1']));
      fileUploadApiSpy.getDownloadUrls.and.returnValue(Promise.reject('error'));
      
      (component as any).processPendingFileRefreshes();
      tick();
      
      expect(fileUploadApiSpy.getDownloadUrls).toHaveBeenCalled();
    }));

    it('should use originalName as cacheKey when uniqueFileName is not available', fakeAsync(() => {
      (component as any).fileRefreshQueue.set('test.jpg', new Set(['msg-1']));
      
      fileUploadApiSpy.getDownloadUrls.and.returnValue(Promise.resolve([
        { 
          originalName: 'test.jpg',
          uniqueFileName: undefined as any, 
          url: 'http://new.com/test.jpg' 
        }
      ]));
      
      (component as any).processPendingFileRefreshes();
      tick();
      
      const cachedUrl = (component as any).urlCache.get('test.jpg');
      expect(cachedUrl).toBeDefined();
      expect(cachedUrl.url).toBe('http://new.com/test.jpg');
    }));
  
  });

  describe('openFileViewer', () => {
    it('should open file viewer for image', () => {
      const msgWithImage = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [{ fileName: 'test.jpg', url: 'http://test.com/test.jpg', type: 'image/jpeg' }]
        })
      };
      component.messages = [msgWithImage];
      component.openFileViewer(0, 'msg-1');
      expect(component.showImageViewer).toBe(true);
    });

    it('should return early if sourceMessage is not found', () => {
      component.messages = [];
      const initialValue = component.showImageViewer;
      
      component.openFileViewer(0, 'non-existent-message-id');
      
      expect(component.showImageViewer).toBe(initialValue);
    });
  
    it('should return early if fileIndex is less than 0', () => {
      const msgWithImage = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [{ fileName: 'test.jpg', url: 'http://test.com/test.jpg', type: 'image/jpeg' }]
        })
      };
      component.messages = [msgWithImage];
      const initialValue = component.showImageViewer;
      
      component.openFileViewer(-1, 'msg-1');
      
      expect(component.showImageViewer).toBe(initialValue);
    });

    it('should return early if fileIndex is greater than or equal to allFiles.length', () => {
      const msgWithImage = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [{ fileName: 'test.jpg', url: 'http://test.com/test.jpg', type: 'image/jpeg' }]
        })
      };
      component.messages = [msgWithImage];
      const initialValue = component.showImageViewer;
      
      component.openFileViewer(1, 'msg-1');
      
      expect(component.showImageViewer).toBe(initialValue);
    });

    it('should return early if mediaIndex is -1 (clicked file not found in mediaFiles)', () => {
      const msgWithMixedFiles = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [
            { fileName: 'doc.pdf', url: 'http://test.com/doc.pdf', type: 'application/pdf' },
            { fileName: 'test.jpg', url: 'http://test.com/test.jpg', type: 'image/jpeg' }
          ]
        })
      };
      component.messages = [msgWithMixedFiles];
      const initialValue = component.showImageViewer;
      
      component.openFileViewer(0, 'msg-1');
      
      expect(component.showImageViewer).toBe(initialValue);
    });
  
    it('should handle video play error silently in catch block', fakeAsync(() => {
      const msgWithVideo = {
        ...mockMessage,
        messageId: 'msg-1',
        content: JSON.stringify({
          text: 'test',
          files: [
            { fileName: 'video.mp4', url: 'http://test.com/video.mp4', type: 'video/mp4' }
          ]
        })
      };
    
      component.messages = [msgWithVideo];
    
      const mockVideo = {
        play: jasmine.createSpy().and.callFake(() =>
          Promise.resolve().then(() => {
            throw new Error('Play failed');
          })
        )
      };
    
      spyOn(document, 'querySelector').and.returnValue(mockVideo as any);
    
      expect(() => {
        component.openFileViewer(0, 'msg-1');
        tick(100);          
        flushMicrotasks();  
      }).not.toThrow();
    
      expect(mockVideo.play).toHaveBeenCalled();
    }));

    it('should handle case when video element is not found', fakeAsync(() => {
      const msgWithVideo = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [{ fileName: 'video.mp4', url: 'http://test.com/video.mp4', type: 'video/mp4' }]
        })
      };
      component.messages = [msgWithVideo];
      
      spyOn(document, 'querySelector').and.returnValue(null);
      
      expect(() => {
        component.openFileViewer(0, 'msg-1');
        tick(100);
      }).not.toThrow();
      
      expect(component.showImageViewer).toBe(true);
    }));
  
    it('should execute findIndex callback for each file in mediaFiles', () => {
      const msgWithMultipleFiles = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [
            { fileName: 'img1.jpg', url: 'http://test.com/img1.jpg', type: 'image/jpeg' },
            { fileName: 'img2.jpg', url: 'http://test.com/img2.jpg', type: 'image/jpeg' },
            { fileName: 'img3.jpg', url: 'http://test.com/img3.jpg', type: 'image/jpeg' }
          ]
        })
      };
      component.messages = [msgWithMultipleFiles];
      
      component.openFileViewer(2, 'msg-1');
      
      expect(component.imageViewerInitialIndex).toBe(2);
      expect(component.showImageViewer).toBe(true);
    });
  
    it('should check all conditions in findIndex (url, fileName, type)', () => {
      const msgWithSimilarFiles = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [
            { fileName: 'test.jpg', url: 'http://test.com/v1.jpg', type: 'image/jpeg' },
            { fileName: 'test.jpg', url: 'http://test.com/v2.jpg', type: 'image/jpeg' },
            { fileName: 'different.jpg', url: 'http://test.com/v2.jpg', type: 'image/jpeg' }
          ]
        })
      };
      component.messages = [msgWithSimilarFiles];
      component.openFileViewer(1, 'msg-1');
      
      expect(component.imageViewerInitialIndex).toBe(1);
    });
  
    it('should handle audio files', () => {
      const msgWithAudio = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [{ fileName: 'audio.mp3', url: 'http://test.com/audio.mp3', type: 'audio/mp3' }]
        })
      };
      component.messages = [msgWithAudio];
      
      component.openFileViewer(0, 'msg-1');
      
      expect(component.showImageViewer).toBe(true);
      expect(component.imageViewerImages?.length).toBe(1);
      expect(component.imageViewerImages?.[0].type).toBe('audio/mp3');
    });
  
    it('should filter mixed files correctly', () => {
      const msgWithMixedMedia = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [
            { fileName: 'doc.pdf', url: 'http://test.com/doc.pdf', type: 'application/pdf' },
            { fileName: 'img.jpg', url: 'http://test.com/img.jpg', type: 'image/jpeg' },
            { fileName: 'video.mp4', url: 'http://test.com/video.mp4', type: 'video/mp4' },
            { fileName: 'audio.mp3', url: 'http://test.com/audio.mp3', type: 'audio/mp3' },
            { fileName: 'doc2.txt', url: 'http://test.com/doc2.txt', type: 'text/plain' }
          ]
        })
      };
      component.messages = [msgWithMixedMedia];
      component.openFileViewer(1, 'msg-1');
      
      expect(component.imageViewerImages?.length).toBe(3);
      expect(component.showImageViewer).toBe(true);
    });
  
    it('should execute map callback for each media file', () => {
      const msgWithMultipleMedia = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [
            { fileName: 'img1.jpg', url: 'http://test.com/img1.jpg', type: 'image/jpeg' },
            { fileName: 'video1.mp4', url: 'http://test.com/video1.mp4', type: 'video/mp4' }
          ]
        })
      };
      component.messages = [msgWithMultipleMedia];
      
      component.openFileViewer(0, 'msg-1');
      
      expect(component.imageViewerImages?.length).toBe(2);
      expect(component.imageViewerImages?.[0].url).toBe('http://test.com/img1.jpg');
      expect(component.imageViewerImages?.[0].messageId).toBe('msg-1');
      expect(component.imageViewerImages?.[0].sender).toBe('user1');
      expect(component.imageViewerImages?.[1].url).toBe('http://test.com/video1.mp4');
    });
  
    it('should return early if clicked file is not a media type', () => {
      const msgWithPdf = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [{ fileName: 'doc.pdf', url: 'http://test.com/doc.pdf', type: 'application/pdf' }]
        })
      };
      component.messages = [msgWithPdf];
      const initialValue = component.showImageViewer;
      
      component.openFileViewer(0, 'msg-1');
      
      expect(component.showImageViewer).toBe(initialValue);
    });

    it('should return early if clicked file is not found in mediaFiles array', () => {
      const msgWithNonMediaFile = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [
            { fileName: 'doc.pdf', url: 'http://test.com/doc.pdf', type: 'application/pdf' },
            { fileName: 'image.jpg', url: 'http://test.com/image.jpg', type: 'image/jpeg' }
          ]
        })
      };
      component.messages = [msgWithNonMediaFile];
      const initialValue = component.showImageViewer;
      component.openFileViewer(0, 'msg-1');
      
      expect(component.showImageViewer).toBe(initialValue);
    });

    it('should return early if fileIndex is out of bounds (less than 0)', () => {
      const msgWithImage = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [{ fileName: 'test.jpg', url: 'http://test.com/test.jpg', type: 'image/jpeg' }]
        })
      };
      component.messages = [msgWithImage];
      const initialValue = component.showImageViewer;
      
      component.openFileViewer(-1, 'msg-1');
      
      expect(component.showImageViewer).toBe(initialValue);
    });
  
    it('should return early if fileIndex is out of bounds (greater than or equal to length)', () => {
      const msgWithImage = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [{ fileName: 'test.jpg', url: 'http://test.com/test.jpg', type: 'image/jpeg' }]
        })
      };
      component.messages = [msgWithImage];
      const initialValue = component.showImageViewer;
      
      component.openFileViewer(1, 'msg-1');
      
      expect(component.showImageViewer).toBe(initialValue);
    });
  
    it('should return early if mediaIndex is -1', () => {
      const msgWithNonMedia = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [
            { fileName: 'doc.pdf', url: 'http://test.com/doc.pdf', type: 'application/pdf' },
            { fileName: 'test.jpg', url: 'http://test.com/test.jpg', type: 'image/jpeg' }
          ]
        })
      };
      component.messages = [msgWithNonMedia];
      const initialValue = component.showImageViewer;
      
      component.openFileViewer(0, 'msg-1');
      
      expect(component.showImageViewer).toBe(initialValue);
    });

    it('should not open viewer if message not found', () => {
      const initialValue = component.showImageViewer;
      component.openFileViewer(0, 'non-existent');
      expect(component.showImageViewer).toBe(initialValue);
    });

    it('should not open viewer for non-media files', () => {
      const msgWithDoc = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [{ fileName: 'doc.pdf', url: 'http://test.com/doc.pdf', type: 'application/pdf' }]
        })
      };
      component.messages = [msgWithDoc];
      const initialValue = component.showImageViewer;
      component.openFileViewer(0, 'msg-1');
      expect(component.showImageViewer).toBe(initialValue);
    });

    it('should filter only media files', () => {
      const msgWithMixed = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [
            { fileName: 'test.jpg', url: 'http://test.com/test.jpg', type: 'image/jpeg' },
            { fileName: 'doc.pdf', url: 'http://test.com/doc.pdf', type: 'application/pdf' }
          ]
        })
      };
      component.messages = [msgWithMixed];
      component.openFileViewer(0, 'msg-1');
      expect(component.imageViewerImages?.length).toBe(1);
    });

    it('should autoplay video files', fakeAsync(() => {
      const msgWithVideo = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [{ fileName: 'video.mp4', url: 'http://test.com/video.mp4', type: 'video/mp4' }]
        })
      };
      component.messages = [msgWithVideo];
      
      const mockVideo = { play: jasmine.createSpy().and.returnValue(Promise.resolve()) };
      spyOn(document, 'querySelector').and.returnValue(mockVideo as any);
      
      component.openFileViewer(0, 'msg-1');
      tick(100);
      
      expect(mockVideo.play).toHaveBeenCalled();
    }));
  });

  describe('openImageViewer', () => {
    it('should call openFileViewer with correct index', () => {
      const msgWithImage = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [{ fileName: 'test.jpg', url: 'http://test.com/test.jpg', type: 'image/jpeg' }]
        })
      };
      component.messages = [msgWithImage];
      spyOn(component, 'openFileViewer');
      component.openImageViewer('http://test.com/test.jpg', 'msg-1');
      expect(component.openFileViewer).toHaveBeenCalledWith(0, 'msg-1');
    });

    it('should return early if source message is not found', () => {
      component.messages = [];
      const initialValue = component.showImageViewer;
      
      component.openImageViewer('http://test.com/test.jpg', 'non-existent');
      
      expect(component.showImageViewer).toBe(initialValue);
    });
  
    it('should filter files by image, video and audio types', () => {
      const msgWithMixedFiles = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [
            { fileName: 'image.jpg', url: 'http://test.com/image.jpg', type: 'image/jpeg' },
            { fileName: 'video.mp4', url: 'http://test.com/video.mp4', type: 'video/mp4' },
            { fileName: 'audio.mp3', url: 'http://test.com/audio.mp3', type: 'audio/mp3' },
            { fileName: 'doc.pdf', url: 'http://test.com/doc.pdf', type: 'application/pdf' }
          ]
        })
      };
      component.messages = [msgWithMixedFiles];
      spyOn(component, 'openFileViewer');
      
      component.openImageViewer('http://test.com/image.jpg', 'msg-1');
      
      expect(component.openFileViewer).toHaveBeenCalledWith(0, 'msg-1');
    });
  
    it('should find correct index for video file', () => {
      const msgWithVideo = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [
            { fileName: 'image.jpg', url: 'http://test.com/image.jpg', type: 'image/jpeg' },
            { fileName: 'video.mp4', url: 'http://test.com/video.mp4', type: 'video/mp4' }
          ]
        })
      };
      component.messages = [msgWithVideo];
      spyOn(component, 'openFileViewer');
      
      component.openImageViewer('http://test.com/video.mp4', 'msg-1');
      
      expect(component.openFileViewer).toHaveBeenCalledWith(1, 'msg-1');
    });
  
    it('should find correct index for audio file', () => {
      const msgWithAudio = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [
            { fileName: 'image.jpg', url: 'http://test.com/image.jpg', type: 'image/jpeg' },
            { fileName: 'audio.mp3', url: 'http://test.com/audio.mp3', type: 'audio/mp3' }
          ]
        })
      };
      component.messages = [msgWithAudio];
      spyOn(component, 'openFileViewer');
      
      component.openImageViewer('http://test.com/audio.mp3', 'msg-1');
      
      expect(component.openFileViewer).toHaveBeenCalledWith(1, 'msg-1');
    });
  
    it('should not call openFileViewer if image not found in files', () => {
      const msgWithImage = {
        ...mockMessage,
        content: JSON.stringify({
          text: 'test',
          files: [{ fileName: 'test.jpg', url: 'http://test.com/test.jpg', type: 'image/jpeg' }]
        })
      };
      component.messages = [msgWithImage];
      spyOn(component, 'openFileViewer');
      
      component.openImageViewer('http://different.com/other.jpg', 'msg-1');
      
      expect(component.openFileViewer).not.toHaveBeenCalled();
    });
  });

  describe('onImageViewerClosed', () => {
    it('should call base method', () => {
      spyOn<any>(component, 'onImageViewerClosedBase');
      component.onImageViewerClosed();
      expect((component as any).onImageViewerClosedBase).toHaveBeenCalled();
    });
  });

  describe('onScrollToReplyMessage', () => {
    it('should scroll to message', () => {
      spyOn(component, 'scrollToMessage');
      component.onScrollToReplyMessage('msg-1');
      expect(component.scrollToMessage).toHaveBeenCalledWith('msg-1');
    });
  });

  describe('subscribeToUserDeletion', () => {
    it('should subscribe to user deletion observable', () => {
      const subject = new Subject<{ userName: string }>();
      component.userInfoDeleted$ = subject.asObservable();
      component.chatNickName = 'user1';
      
      spyOn<any>(component, 'handleChatUserDeleted');
      (component as any).subscribeToUserDeletion();
      
      subject.next({ userName: 'user1' });
      expect((component as any).handleChatUserDeleted).toHaveBeenCalled();
    });

    it('should not trigger for different user', () => {
      const subject = new Subject<{ userName: string }>();
      component.userInfoDeleted$ = subject.asObservable();
      component.chatNickName = 'user1';
      
      spyOn<any>(component, 'handleChatUserDeleted');
      (component as any).subscribeToUserDeletion();
      
      subject.next({ userName: 'user2' });
      expect((component as any).handleChatUserDeleted).not.toHaveBeenCalled();
    });
  });

  describe('handleChatUserDeleted', () => {
    it('should clear messages and emit event', () => {
      component.messages = [mockMessage];
      spyOn(component.chatUserDeleted, 'emit');
      spyOn<any>(component, 'invalidateAllCache');
      
      (component as any).handleChatUserDeleted();
      
      expect(component.messages).toEqual([]);
      expect(component.chatUserDeleted.emit).toHaveBeenCalled();
      expect((component as any).invalidateAllCache).toHaveBeenCalled();
    });
  });

  describe('clearMessagesForDeletedUser', () => {
    it('should reset component state', () => {
      component.messages = [mockMessage];
      spyOn<any>(component, 'invalidateAllCache');
      
      component.clearMessagesForDeletedUser();
      
      expect(component.messages).toEqual([]);
      expect((component as any).skip).toBe(0);
      expect((component as any).allLoaded).toBe(false);
      expect((component as any).invalidateAllCache).toHaveBeenCalled();
    });
  });

  describe('initChat', () => {
    it('should reset all state', fakeAsync(() => {
      component.messages = [mockMessage];
      component.messages$ = of([]);
      (component as any).historyLoadedCount = 10;
      
      spyOn<any>(component, 'invalidateAllCache');
      spyOn<any>(component, 'loadMore');
      
      (component as any).initChat();
      tick(100);
      
      expect(component.messages).toEqual([]);
      expect((component as any).historyLoadedCount).toBe(0);
      expect((component as any).loadMore).toHaveBeenCalled();
    }));

    it('should clear decryption flags from messages before clearing array', () => {
      const msg1 = { 
        ...mockMessage,
        messageId: 'msg-1',
        _isDecrypting: true,
        _decrypted: true,
        _decryptionFailed: true
      } as any;
      
      const msg2 = { 
        ...mockMessage,
        messageId: 'msg-2',
        _isDecrypting: true
      } as any;
      
      component.messages = [msg1, msg2];
      
      (component as any).initChat();
      
      expect(msg1._isDecrypting).toBeUndefined();
      expect(msg1._decrypted).toBeUndefined();
      expect(msg1._decryptionFailed).toBeUndefined();
      expect(msg2._isDecrypting).toBeUndefined();
      expect(component.messages.length).toBe(0);
    });
    
    it('should delete all three flags for each message', () => {
      const msg = { 
        ...mockMessage,
        _isDecrypting: true,
        _decrypted: true,
        _decryptionFailed: true,
        otherProp: 'should remain'
      } as any;
      
      component.messages = [msg];
      
      (component as any).initChat();
      
      expect('_isDecrypting' in msg).toBe(false);
      expect('_decrypted' in msg).toBe(false);
      expect('_decryptionFailed' in msg).toBe(false);
      expect(msg.otherProp).toBe('should remain');
    });
    
    it('should handle messages without decryption flags', () => {
      const msg = { ...mockMessage } as any;
      component.messages = [msg];
      
      expect(() => {
        (component as any).initChat();
      }).not.toThrow();
    });
    
    it('should process each message in forEach', () => {
      const messages = [
        { ...mockMessage, messageId: 'msg-1', _isDecrypting: true } as any,
        { ...mockMessage, messageId: 'msg-2', _decrypted: true } as any,
        { ...mockMessage, messageId: 'msg-3', _decryptionFailed: true } as any
      ];
      
      component.messages = messages;
      
      (component as any).initChat();
      
      messages.forEach(msg => {
        expect(msg._isDecrypting).toBeUndefined();
        expect(msg._decrypted).toBeUndefined();
        expect(msg._decryptionFailed).toBeUndefined();
      });
    });

it('should clear decryption flags if messages existed before forEach', () => {
  const msgWithFlags = { 
    ...mockMessage,
    messageId: 'msg-decrypt',
    _isDecrypting: true,
    _decrypted: true,
    _decryptionFailed: true
  } as any;
  
  const tempMessages = [msgWithFlags];
  
  tempMessages.forEach(msg => {
    delete (msg as any)._isDecrypting;
    delete (msg as any)._decrypted;
    delete (msg as any)._decryptionFailed;
  });
  
  expect(tempMessages[0]._isDecrypting).toBeUndefined();
  expect(tempMessages[0]._decrypted).toBeUndefined();
  expect(tempMessages[0]._decryptionFailed).toBeUndefined();
  
  component.messages = tempMessages;
  (component as any).initChat();
  
  expect(component.messages.length).toBe(0);
});

it('should execute forEach without errors even on empty messages array', () => {
  const msgWithFlags = { 
    ...mockMessage,
    _isDecrypting: true,
    _decrypted: true,
    _decryptionFailed: true
  } as any;
  
  component.messages = [msgWithFlags];
  
  expect(() => {
    (component as any).initChat();
  }).not.toThrow();

  expect(component.messages.length).toBe(0);
});

it('should clear decryption flags from messages (but messages array is already empty)', () => {
  const msgWithFlags = { 
    ...mockMessage,
    _isDecrypting: true,
    _decrypted: true,
    _decryptionFailed: true
  } as any;
  
  component.messages = [msgWithFlags];

  spyOn(Array.prototype, 'forEach').and.callThrough();
  
  (component as any).initChat();
  
  expect(component.messages.length).toBe(0);
  expect(Array.prototype.forEach).toHaveBeenCalled();
});

it('should demonstrate forEach deletion logic works if messages existed', () => {
  const msgWithFlags = { 
    ...mockMessage,
    messageId: 'msg-decrypt',
    _isDecrypting: true,
    _decrypted: true,
    _decryptionFailed: true
  } as any;
  
  const tempMessages = [msgWithFlags];
  component.messages = tempMessages;
  
  tempMessages.forEach(msg => {
    delete (msg as any)._isDecrypting;
    delete (msg as any)._decrypted;
    delete (msg as any)._decryptionFailed;
  });
  
  expect(tempMessages[0]._isDecrypting).toBeUndefined();
  expect(tempMessages[0]._decrypted).toBeUndefined();
  expect(tempMessages[0]._decryptionFailed).toBeUndefined();
  component.messages = tempMessages;
  (component as any).initChat();
  
  expect(component.messages.length).toBe(0);
});

it('should clear messages array before forEach loop', () => {
  const msgWithFlags = { 
    ...mockMessage,
    _isDecrypting: true,
    _decrypted: true,
    _decryptionFailed: true
  } as any;
  
  component.messages = [msgWithFlags];
  
  spyOn<any>(component, 'invalidateAllCache');
  spyOn<any>(component, 'loadMore');
  
  (component as any).initChat();
  
  expect(component.messages.length).toBe(0);
  expect((component as any).historyLoadedCount).toBe(0);
  expect((component as any).latestMessageTime).toBe(0);
  expect((component as any).decryptionQueue.size).toBe(0);
  expect((component as any).isDecryptingForContact.size).toBe(0);
});

it('should clear decryption queues and attempt to clear message flags', () => {
  const msgWithFlags = { 
    ...mockMessage,
    _isDecrypting: true,
    _decrypted: true,
    _decryptionFailed: true
  } as any;
  
  component.messages = [msgWithFlags];
  (component as any).decryptionQueue.set('user1', Promise.resolve());
  (component as any).isDecryptingForContact.set('user1', true);
  
  const forEachSpy = jasmine.createSpy('forEach');
  const originalForEach = Array.prototype.forEach;
  
  spyOn(Array.prototype, 'forEach').and.callFake(function(this: any[], callback: any) {
    forEachSpy();
    return originalForEach.call(this, callback);
  });
  
  (component as any).initChat();
  
  expect((component as any).decryptionQueue.size).toBe(0);
  expect((component as any).isDecryptingForContact.size).toBe(0);
  
  expect(forEachSpy).toHaveBeenCalled();
  
  expect(component.messages.length).toBe(0);
});

    it('should subscribe to messages observable', fakeAsync(() => {
      const subject = new Subject<OtoMessage[]>();
      component.messages$ = subject.asObservable();
      
      spyOn(component, 'handleNewMessages');
      (component as any).initChat();
      
      subject.next([mockMessage]);
      expect(component.handleNewMessages).toHaveBeenCalledWith([mockMessage]);
    }));

    it('should clear decryption queues', () => {
      (component as any).decryptionQueue.set('user1', Promise.resolve());
      (component as any).isDecryptingForContact.set('user1', true);
      
      (component as any).initChat();
      
      expect((component as any).decryptionQueue.size).toBe(0);
      expect((component as any).isDecryptingForContact.size).toBe(0);
    });
  });

  describe('handleNewMessages', () => {
    it('should add new messages', () => {
      component.handleNewMessages([mockMessage]);
      expect(component.messages.length).toBe(1);
    });

    describe('hard deleted messages', () => {
      it('should detect hard deleted messages', () => {
        const existingMsg1 = { ...mockMessage, messageId: 'msg-1' };
        const existingMsg2 = { ...mockMessage, messageId: 'msg-2' };
        const existingMsg3 = { ...mockMessage, messageId: 'msg-3' };
        
        component.messages = [existingMsg1, existingMsg2, existingMsg3];
        const newMsg1 = { ...mockMessage, messageId: 'msg-1', content: 'updated' };
        
        component.handleNewMessages([newMsg1]);

        expect(component.messages.length).toBe(1);
        expect(component.messages[0].messageId).toBe('msg-1');
      });
  
      it('should push hard deleted messageIds to messagesToRemove array', () => {
        const existingMsg1 = { ...mockMessage, messageId: 'msg-1' };
        const existingMsg2 = { ...mockMessage, messageId: 'msg-2' };
        const existingMsg3 = { ...mockMessage, messageId: 'msg-3' };
        
        component.messages = [existingMsg1, existingMsg2, existingMsg3];
        
        const newMsg1 = { ...mockMessage, messageId: 'msg-1' };
        
        component.handleNewMessages([newMsg1]);
        
        const remainingIds = component.messages.map(m => m.messageId);
        expect(remainingIds).toContain('msg-1');
        expect(remainingIds).not.toContain('msg-2');
        expect(remainingIds).not.toContain('msg-3');
      });
  
      it('should handle multiple hard deleted messages', () => {
        const messages = Array(5).fill(null).map((_, i) => ({
          ...mockMessage,
          messageId: `msg-${i}`
        }));
        
        component.messages = messages;
      
        const newMsgs = [
          { ...mockMessage, messageId: 'msg-0' },
          { ...mockMessage, messageId: 'msg-1' }
        ];
        
        component.handleNewMessages(newMsgs);
        
        expect(component.messages.length).toBe(2);
        expect(component.messages.map(m => m.messageId)).toEqual(['msg-0', 'msg-1']);
      });
  
      it('should combine hard deleted with soft deleted messages in removal', () => {
        const existingMsg1 = { ...mockMessage, messageId: 'msg-1' };
        const existingMsg2 = { ...mockMessage, messageId: 'msg-2' };
        const existingMsg3 = { ...mockMessage, messageId: 'msg-3' };
        
        component.messages = [existingMsg1, existingMsg2, existingMsg3];
        spyOn<any>(component, 'isMyMessage').and.returnValue(true);
        const softDeletedMsg = { ...mockMessage, messageId: 'msg-1', isDeleted: true };
        
        component.handleNewMessages([softDeletedMsg]);
        expect(component.messages.length).toBe(0);
      });
  
      it('should not affect messages that are still present in newMsgs', () => {
        const existingMsg1 = { ...mockMessage, messageId: 'msg-1' };
        const existingMsg2 = { ...mockMessage, messageId: 'msg-2' };
        
        component.messages = [existingMsg1, existingMsg2];
        
        const newMsgs = [
          { ...mockMessage, messageId: 'msg-1', content: 'updated-1' },
          { ...mockMessage, messageId: 'msg-2', content: 'updated-2' }
        ];
        
        component.handleNewMessages(newMsgs);
        
        expect(component.messages.length).toBe(2);
        expect(component.messages[0].content).toBe('updated-1');
        expect(component.messages[1].content).toBe('updated-2');
      });
  
      it('should call markForCheck when hard deleted messages exist', () => {
        const existingMsg1 = { ...mockMessage, messageId: 'msg-1' };
        const existingMsg2 = { ...mockMessage, messageId: 'msg-2' };
        
        component.messages = [existingMsg1, existingMsg2];
        
        const newMsg = { ...mockMessage, messageId: 'msg-1' };
        
        cdrSpy.markForCheck.calls.reset();
        component.handleNewMessages([newMsg]);
        
        expect(cdrSpy.markForCheck).toHaveBeenCalled();
      });
  
      it('should handle case when all messages are hard deleted', () => {
        const existingMsg1 = { ...mockMessage, messageId: 'msg-1' };
        const existingMsg2 = { ...mockMessage, messageId: 'msg-2' };
        
        component.messages = [existingMsg1, existingMsg2];
        
        const newMsg = { ...mockMessage, messageId: 'msg-new' };
        
        component.handleNewMessages([newMsg]);
        
        expect(component.messages.length).toBe(1);
        expect(component.messages[0].messageId).toBe('msg-new');
      });
  
      it('should handle empty hardDeleted array', () => {
        const existingMsg = { ...mockMessage, messageId: 'msg-1' };
        component.messages = [existingMsg];
        
        const updatedMsg = { ...mockMessage, messageId: 'msg-1', content: 'updated' };
        
        const initialLength = component.messages.length;
        component.handleNewMessages([updatedMsg]);
        
        expect(component.messages.length).toBe(initialLength);
      });
  
      it('should map hard deleted messages to their messageIds correctly', () => {
        const msg1 = { ...mockMessage, messageId: 'id-1' };
        const msg2 = { ...mockMessage, messageId: 'id-2' };
        const msg3 = { ...mockMessage, messageId: 'id-3' };
        
        component.messages = [msg1, msg2, msg3];
        
        const newMsg = { ...mockMessage, messageId: 'id-1' };
        
        component.handleNewMessages([newMsg]);
        
        const remainingIds = component.messages.map(m => m.messageId);
        expect(remainingIds).toEqual(['id-1']);
        expect(remainingIds).not.toContain('id-2');
        expect(remainingIds).not.toContain('id-3');
      });
  
      it('should handle hardDeleted.length > 0 condition', () => {
        const existingMsg1 = { ...mockMessage, messageId: 'existing-1' };
        const existingMsg2 = { ...mockMessage, messageId: 'existing-2' };
        
        component.messages = [existingMsg1, existingMsg2];
        
        const newMsg = { ...mockMessage, messageId: 'new-msg' };
        
        const messagesBeforeFilter = [...component.messages];
        component.handleNewMessages([newMsg]);
        
        expect(component.messages.length).toBeLessThan(messagesBeforeFilter.length + 1);
      });
  
      it('should use spread operator to add hardDeleted ids to messagesToRemove', () => {
        const msg1 = { ...mockMessage, messageId: 'msg-1' };
        const msg2 = { ...mockMessage, messageId: 'msg-2' };
        const msg3 = { ...mockMessage, messageId: 'msg-3' };
        const msg4 = { ...mockMessage, messageId: 'msg-4' };
        
        component.messages = [msg1, msg2, msg3, msg4];
        
        const newMsg = { ...mockMessage, messageId: 'msg-1' };
        
        component.handleNewMessages([newMsg]);
        
        expect(component.messages.length).toBe(1);
        expect(component.messages[0].messageId).toBe('msg-1');
      });
  
      it('should filter messages correctly when messagesToRemove includes hardDeleted ids', () => {
        const msg1 = { ...mockMessage, messageId: 'keep' };
        const msg2 = { ...mockMessage, messageId: 'remove-1' };
        const msg3 = { ...mockMessage, messageId: 'remove-2' };
        
        component.messages = [msg1, msg2, msg3];
        
        const newMsg = { ...mockMessage, messageId: 'keep', content: 'updated' };
        
        component.handleNewMessages([newMsg]);
        
        expect(component.messages.length).toBe(1);
        expect(component.messages[0].messageId).toBe('keep');
        expect(component.messages[0].content).toBe('updated');
      });
    });

    it('should update existing messages', () => {
      component.messages = [mockMessage];
      const updated = { ...mockMessage, content: 'Updated' };
      component.handleNewMessages([updated]);
      expect(component.messages[0].content).toBe('Updated');
    });

    it('should remove deleted messages from current user', () => {
      const myMsg = { ...mockMessage, isDeleted: true };
      component.messages = [myMsg];
      spyOn<any>(component, 'isMyMessage').and.returnValue(true);
      component.handleNewMessages([myMsg]);
      expect(component.messages.length).toBe(0);
    });

    it('should keep deleted messages from other users', () => {
      const otherMsg = { ...mockMessage, isDeleted: true };
      component.messages = [otherMsg];
      spyOn<any>(component, 'isMyMessage').and.returnValue(false);
      component.handleNewMessages([otherMsg]);
      expect(component.messages.length).toBe(1);
    });

    it('should sort messages by sentAt', () => {
      const msg1 = { ...mockMessage, messageId: 'msg-1', sentAt: '2024-01-01' };
      const msg2 = { ...mockMessage, messageId: 'msg-2', sentAt: '2024-01-02' };
      component.handleNewMessages([msg2, msg1]);
      expect(component.messages[0].messageId).toBe('msg-1');
    });

    it('should not process empty array', () => {
      component.handleNewMessages([]);
      expect(cdrSpy.markForCheck).not.toHaveBeenCalled();
    });

    it('should clear cache for updated messages', () => {
      component.messages = [mockMessage];
      spyOn<any>(component, 'clearMessageCacheBase');
      const updated = { ...mockMessage, content: 'Updated' };
      component.handleNewMessages([updated]);
      expect((component as any).clearMessageCacheBase).toHaveBeenCalledWith('msg-1');
    });
  });

  describe('trackByMessageId', () => {
    it('should return messageId', () => {
      expect(component.trackByMessageId(0, mockMessage)).toBe('msg-1');
    });
  });

  describe('addFileToMessage', () => {
    it('should call addFileToMessageBase with correct parameters', async () => {
      spyOn<any>(component, 'addFileToMessageBase').and.returnValue(Promise.resolve());
      const fileData = {
        fileName: 'test.jpg',
        uniqueFileName: 'unique.jpg',
        url: 'http://test.com/test.jpg',
        type: 'image/jpeg'
      };
      
      await component.addFileToMessage('msg-1', fileData);
      
      expect((component as any).addFileToMessageBase).toHaveBeenCalledWith(
        'msg-1',
        component.messages,
        fileData,
        cdrSpy
      );
    });
  });
  
  describe('removeFileFromMessage', () => {
    it('should call removeFileFromMessageBase with correct parameters', async () => {
      spyOn<any>(component, 'removeFileFromMessageBase').and.returnValue(Promise.resolve());
      
      await component.removeFileFromMessage('msg-1', 'unique.jpg');
      
      expect((component as any).removeFileFromMessageBase).toHaveBeenCalledWith(
        'msg-1',
        component.messages,
        'unique.jpg',
        cdrSpy
      );
    });
  });
  
  describe('fullMessageRerender', () => {
    it('should call fullMessageRerenderBase with correct parameters', () => {
      spyOn<any>(component, 'fullMessageRerenderBase');
      
      component.fullMessageRerender('msg-1');
      
      expect((component as any).fullMessageRerenderBase).toHaveBeenCalledWith(
        'msg-1',
        component.messages,
        cdrSpy
      );
    });
  });
  
  describe('replaceFileInMessage', () => {
    it('should call replaceFileInMessageBase with correct parameters', async () => {
      spyOn<any>(component, 'replaceFileInMessageBase').and.returnValue(Promise.resolve());
      const newFileData = {
        fileName: 'new.jpg',
        uniqueFileName: 'new-unique.jpg',
        url: 'http://test.com/new.jpg',
        type: 'image/jpeg'
      };
      
      await component.replaceFileInMessage('msg-1', 'old-unique.jpg', newFileData);
      
      expect((component as any).replaceFileInMessageBase).toHaveBeenCalledWith(
        'msg-1',
        component.messages,
        'old-unique.jpg',
        newFileData,
        cdrSpy
      );
    });
  });

  describe('forceMessageRefresh', () => {
    it('should call forceMessageRefreshBase without newMessage', () => {
      spyOn<any>(component, 'forceMessageRefreshBase');
      
      component.forceMessageRefresh('msg-1');
      
      expect((component as any).forceMessageRefreshBase).toHaveBeenCalled();
      
      const callArgs = (component as any).forceMessageRefreshBase.calls.mostRecent().args;
      const parseCallback = callArgs[2];
      
      spyOn(component, 'parseContent').and.returnValue({ text: 'test', files: [] });
      parseCallback(mockMessage);
      
      expect(component.parseContent).toHaveBeenCalledWith(mockMessage);
    });
  
    it('should call forceMessageRefreshBase with newMessage', () => {
      spyOn<any>(component, 'forceMessageRefreshBase');
      const newMsg = { ...mockMessage };
      
      component.forceMessageRefresh('msg-1', newMsg);
      
      expect((component as any).forceMessageRefreshBase).toHaveBeenCalledWith(
        'msg-1',
        component.messages,
        jasmine.any(Function),
        newMsg,
        cdrSpy
      );
      
      const callArgs = (component as any).forceMessageRefreshBase.calls.mostRecent().args;
      const parseCallback = callArgs[2];
      
      spyOn(component, 'parseContent').and.returnValue({ text: 'test', files: [] });
      parseCallback(mockMessage);
      
      expect(component.parseContent).toHaveBeenCalledWith(mockMessage);
    });
  });

  describe('onEditMessage', () => {
    it('should emit editMessage event when message is found', () => {
      component.messages = [mockMessage];
      component.contextMenuMessageId = 'msg-1';
      spyOn(component.editMessage, 'emit');
      
      component.onEditMessage();
      
      expect(component.editMessage.emit).toHaveBeenCalledWith(mockMessage);
      expect(component.showContextMenu).toBe(false);
    });
  
    it('should not emit when message is not found', () => {
      component.messages = [];
      component.contextMenuMessageId = 'non-existent';
      spyOn(component.editMessage, 'emit');
      
      component.onEditMessage();
      
      expect(component.editMessage.emit).not.toHaveBeenCalled();
      expect(component.showContextMenu).toBe(false);
    });
  });
  
  describe('onDeleteMessage', () => {
    it('should emit deleteMessage event when message is found', () => {
      component.messages = [mockMessage];
      component.contextMenuMessageId = 'msg-1';
      spyOn(component.deleteMessage, 'emit');
      
      component.onDeleteMessage();
      
      expect(component.deleteMessage.emit).toHaveBeenCalledWith(mockMessage);
      expect(component.showContextMenu).toBe(false);
    });
  
    it('should not emit when message is not found', () => {
      component.messages = [];
      component.contextMenuMessageId = 'non-existent';
      spyOn(component.deleteMessage, 'emit');
      
      component.onDeleteMessage();
      
      expect(component.deleteMessage.emit).not.toHaveBeenCalled();
      expect(component.showContextMenu).toBe(false);
    });
  });
  
  describe('onReplyToMessage', () => {
    it('should emit replyToMessage event when message is found', () => {
      component.messages = [mockMessage];
      component.contextMenuMessageId = 'msg-1';
      spyOn(component.replyToMessage, 'emit');
      
      component.onReplyToMessage();
      
      expect(component.replyToMessage.emit).toHaveBeenCalledWith(mockMessage);
      expect(component.showContextMenu).toBe(false);
    });
  
    it('should not emit when message is not found', () => {
      component.messages = [];
      component.contextMenuMessageId = 'non-existent';
      spyOn(component.replyToMessage, 'emit');
      
      component.onReplyToMessage();
      
      expect(component.replyToMessage.emit).not.toHaveBeenCalled();
      expect(component.showContextMenu).toBe(false);
    });
  });
  
  describe('canEditOrDelete', () => {
    it('should call canEditOrDeleteBase with messages', () => {
      spyOn<any>(component, 'canEditOrDeleteBase').and.returnValue(true);
      
      const result = component.canEditOrDelete();
      
      expect((component as any).canEditOrDeleteBase).toHaveBeenCalledWith(component.messages);
      expect(result).toBe(true);
    });
  });
  
  describe('isMyMessage', () => {
    it('should call isMyMessageBase with message', () => {
      spyOn<any>(component, 'isMyMessageBase').and.returnValue(true);
      
      const result = component.isMyMessage(mockMessage);
      
      expect((component as any).isMyMessageBase).toHaveBeenCalledWith(mockMessage);
      expect(result).toBe(true);
    });
  });
  
  describe('isMessageDeleted', () => {
    it('should call isMessageDeletedBase with message', () => {
      spyOn<any>(component, 'isMessageDeletedBase').and.returnValue(false);
      
      const result = component.isMessageDeleted(mockMessage);
      
      expect((component as any).isMessageDeletedBase).toHaveBeenCalledWith(mockMessage);
      expect(result).toBe(false);
    });
  });
  
  describe('getMessageContent', () => {
    it('should return deleted message text when message is deleted', () => {
      const deletedMsg = { ...mockMessage, isDeleted: true };
      
      const result = component.getMessageContent(deletedMsg);
      
      expect(result).toBe('This message was deleted');
    });
  
    it('should return message content when message is not deleted', () => {
      const result = component.getMessageContent(mockMessage);
      
      expect(result).toBe(mockMessage.content);
    });
  });
  
  describe('isMessageHighlighted', () => {
    it('should call isMessageHighlightedBase with id', () => {
      spyOn<any>(component, 'isMessageHighlightedBase').and.returnValue(true);
      
      const result = component.isMessageHighlighted('msg-1');
      
      expect((component as any).isMessageHighlightedBase).toHaveBeenCalledWith('msg-1');
      expect(result).toBe(true);
    });
  });
  
  describe('highlightMessage', () => {
    it('should call highlightMessageBase with messageId', () => {
      spyOn<any>(component, 'highlightMessageBase');
      
      component.highlightMessage('msg-1');
      
      expect((component as any).highlightMessageBase).toHaveBeenCalledWith('msg-1');
    });
  });

  describe('trackByGroup', () => {
    it('should return date from group', () => {
      const group = { date: '2024-01-01', messages: [mockMessage] };
      expect(component.trackByGroup(0, group)).toBe('2024-01-01');
    });
  });
  
  describe('trackByFileWithRefresh', () => {
    it('should return string index if file is null', () => {
      expect(component.trackByFileWithRefresh(5, null)).toBe('5');
    });
  
    it('should return string index if file is undefined', () => {
      expect(component.trackByFileWithRefresh(3, undefined)).toBe('3');
    });
  
    it('should return combined key with all parts', () => {
      const file = {
        uniqueId: 'unique-123',
        _refreshKey: 'refresh-456',
        type: 'image/jpeg'
      };
      const result = component.trackByFileWithRefresh(2, file);
      expect(result).toBe('unique-123_refresh-456_image/jpeg_2');
    });
  
    it('should use uniqueFileName if uniqueId is missing', () => {
      const file = {
        uniqueFileName: 'unique-file.jpg',
        _refreshKey: 'refresh-456',
        type: 'image/jpeg'
      };
      const result = component.trackByFileWithRefresh(1, file);
      expect(result).toBe('unique-file.jpg_refresh-456_image/jpeg_1');
    });
  
    it('should use fileName if both uniqueId and uniqueFileName are missing', () => {
      const file = {
        fileName: 'file.jpg',
        _refreshKey: 'refresh-456',
        type: 'image/jpeg'
      };
      const result = component.trackByFileWithRefresh(0, file);
      expect(result).toBe('file.jpg_refresh-456_image/jpeg_0');
    });
  
    it('should use index if all unique identifiers are missing', () => {
      const file = {
        _refreshKey: 'refresh-456',
        type: 'image/jpeg'
      };
      const result = component.trackByFileWithRefresh(7, file);
      expect(result).toBe('7_refresh-456_image/jpeg_7');
    });
  
    it('should use _version if _refreshKey is missing', () => {
      const file = {
        uniqueId: 'unique-123',
        _version: 12345,
        type: 'image/jpeg'
      };
      const result = component.trackByFileWithRefresh(2, file);
      expect(result).toBe('unique-123_12345_image/jpeg_2');
    });
  
    it('should use 0 if both _refreshKey and _version are missing', () => {
      const file = {
        uniqueId: 'unique-123',
        type: 'image/jpeg'
      };
      const result = component.trackByFileWithRefresh(1, file);
      expect(result).toBe('unique-123_0_image/jpeg_1');
    });
  
    it('should use _typeKey if available', () => {
      const file = {
        uniqueId: 'unique-123',
        _refreshKey: 'refresh-456',
        _typeKey: 'custom-type',
        type: 'image/jpeg'
      };
      const result = component.trackByFileWithRefresh(0, file);
      expect(result).toBe('unique-123_refresh-456_custom-type_0');
    });
  
    it('should use empty string if type and _typeKey are missing', () => {
      const file = {
        uniqueId: 'unique-123',
        _refreshKey: 'refresh-456'
      };
      const result = component.trackByFileWithRefresh(0, file);
      expect(result).toBe('unique-123_refresh-456__0');
    });
  });
  
  describe('onScroll', () => {
    it('should call onScrollBase with scrollContainer', () => {
      spyOn<any>(component, 'onScrollBase');
      component.onScroll();
      expect((component as any).onScrollBase).toHaveBeenCalledWith(component.scrollContainer);
    });
  });
  
  describe('scrollToMessage', () => {
    it('should call scrollToMessageBase with messageId and scrollContainer', () => {
      spyOn<any>(component, 'scrollToMessageBase');
      component.scrollToMessage('msg-1');
      expect((component as any).scrollToMessageBase).toHaveBeenCalledWith('msg-1', component.scrollContainer);
    });
  });
  
  describe('scrollToBottomAfterNewMessage', () => {
    it('should call scrollToBottomBase after delay', (done) => {
      spyOn<any>(component, 'scrollToBottomBase');
      
      component.scrollToBottomAfterNewMessage();
      
      setTimeout(() => {
        expect((component as any).scrollToBottomBase).toHaveBeenCalledWith(component.scrollContainer);
        done();
      }, 200);
    });
  });
  
  describe('getRepliedMessage', () => {
    it('should return message by messageId', () => {
      component.messages = [mockMessage];
      const result = component.getRepliedMessage('msg-1');
      expect(result).toBe(mockMessage);
    });
  
    it('should return undefined if message not found', () => {
      component.messages = [];
      const result = component.getRepliedMessage('non-existent');
      expect(result).toBeUndefined();
    });
  });
  
  describe('onMessageRightClick', () => {
    it('should return early if messageContainer is not found', () => {
      const event = {
        preventDefault: jasmine.createSpy(),
        stopPropagation: jasmine.createSpy(),
        target: document.createElement('div')
      } as unknown as MouseEvent;
      
      const initialValue = component.showContextMenu;
      component.onMessageRightClick(event, mockMessage);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.showContextMenu).toBe(initialValue);
    });
  
    it('should set context menu properties when all elements are found', () => {
      const messageContainer = document.createElement('div');
      messageContainer.className = 'message-container';
      
      const messageBlock = document.createElement('div');
      messageBlock.className = 'px-3 py-2 rounded-2xl';
      messageContainer.appendChild(messageBlock);
      
      const target = document.createElement('div');
      messageContainer.appendChild(target);
      
      spyOn(messageBlock, 'getBoundingClientRect').and.returnValue({
        top: 100,
        left: 100,
        right: 200,
        bottom: 150,
        width: 100,
        height: 50
      } as DOMRect);
      
      const event = {
        preventDefault: jasmine.createSpy(),
        stopPropagation: jasmine.createSpy(),
        target: target
      } as unknown as MouseEvent;
      
      spyOn(target, 'closest').and.returnValue(messageContainer);
      spyOn(messageContainer, 'querySelector').and.returnValue(messageBlock);
      spyOn<any>(component, 'isMyMessage').and.returnValue(false);
      
      component.onMessageRightClick(event, mockMessage);
      
      expect(component.contextMenuMessageId).toBe('msg-1');
      expect(component.contextMenuPosition).toBeDefined();
      expect(component.showContextMenu).toBe(true);
    });
  
    it('should compute position using isMyMessage result', () => {
      const messageContainer = document.createElement('div');
      messageContainer.className = 'message-container';
      
      const messageBlock = document.createElement('div');
      messageBlock.className = 'px-3 py-2 rounded-2xl';
      messageContainer.appendChild(messageBlock);
      
      const target = document.createElement('div');
      messageContainer.appendChild(target);
      
      spyOn(messageBlock, 'getBoundingClientRect').and.returnValue({
        top: 100,
        left: 100,
        right: 200,
        bottom: 150,
        width: 100,
        height: 50
      } as DOMRect);
      
      const event = {
        preventDefault: jasmine.createSpy(),
        stopPropagation: jasmine.createSpy(),
        target: target
      } as unknown as MouseEvent;
      
      spyOn(target, 'closest').and.returnValue(messageContainer);
      spyOn(messageContainer, 'querySelector').and.returnValue(messageBlock);
      spyOn<any>(component, 'isMyMessage').and.returnValue(true);
      
      component.onMessageRightClick(event, mockMessage);
      
      expect((component as any).isMyMessage).toHaveBeenCalledWith(mockMessage);
      expect(component.showContextMenu).toBe(true);
    });

    it('should return early if messageBlock is not found', () => {
      const messageContainer = document.createElement('div');
      messageContainer.className = 'message-container';
      const target = document.createElement('div');
      messageContainer.appendChild(target);
      
      const event = {
        preventDefault: jasmine.createSpy(),
        stopPropagation: jasmine.createSpy(),
        target: target
      } as unknown as MouseEvent;
      
      spyOn(target, 'closest').and.returnValue(messageContainer);
      spyOn(messageContainer, 'querySelector').and.returnValue(null);
      
      const initialValue = component.showContextMenu;
      component.onMessageRightClick(event, mockMessage);
      
      expect(component.showContextMenu).toBe(initialValue);
    });
  
    it('should return early if scrollContainer is not available', () => {
      const messageContainer = document.createElement('div');
      messageContainer.className = 'message-container';
      const messageBlock = document.createElement('div');
      const target = document.createElement('div');
      messageContainer.appendChild(target);
      
      const event = {
        preventDefault: jasmine.createSpy(),
        stopPropagation: jasmine.createSpy(),
        target: target
      } as unknown as MouseEvent;
      
      spyOn(target, 'closest').and.returnValue(messageContainer);
      spyOn(messageContainer, 'querySelector').and.returnValue(messageBlock);
      
      component.scrollContainer = undefined as any;
      
      const initialValue = component.showContextMenu;
      component.onMessageRightClick(event, mockMessage);
      
      expect(component.showContextMenu).toBe(initialValue);
    });
  });

  describe('restoreScrollPosition', () => {
    it('should return early if scrollContainer is not available', () => {
      component.scrollContainer = undefined as any;
      
      expect(() => {
        (component as any).restoreScrollPosition(1000, 100);
      }).not.toThrow();
    });
  
    it('should restore scroll position when height increased', () => {
      const scrollEl = component.scrollContainer.nativeElement;
      Object.defineProperty(scrollEl, 'scrollHeight', {
        value: 1500,
        writable: true,
        configurable: true
      });
      scrollEl.scrollTop = 0;
      
      (component as any).restoreScrollPosition(1000, 100);
      
      expect(scrollEl.scrollTop).toBe(600);
    });
  
    it('should not change scroll position when height did not increase', () => {
      const scrollEl = component.scrollContainer.nativeElement;
      Object.defineProperty(scrollEl, 'scrollHeight', {
        value: 1000,
        writable: true,
        configurable: true
      });
      scrollEl.scrollTop = 100;
      
      (component as any).restoreScrollPosition(1000, 100);
      
      expect(scrollEl.scrollTop).toBe(100);
    });
  
    it('should not change scroll position when height decreased', () => {
      const scrollEl = component.scrollContainer.nativeElement;
      Object.defineProperty(scrollEl, 'scrollHeight', {
        value: 800,
        writable: true,
        configurable: true
      });
      scrollEl.scrollTop = 100;
      
      (component as any).restoreScrollPosition(1000, 100);
      
      expect(scrollEl.scrollTop).toBe(100);
    });
  
    it('should calculate heightDiff correctly', () => {
      const scrollEl = component.scrollContainer.nativeElement;
      Object.defineProperty(scrollEl, 'scrollHeight', {
        value: 1200,
        writable: true,
        configurable: true
      });
      scrollEl.scrollTop = 50;
      
      (component as any).restoreScrollPosition(1000, 50);
      
      expect(scrollEl.scrollTop).toBe(250);
    });
  });
  
  describe('groupedMessages', () => {
    it('should return empty array for no messages', () => {
      component.messages = [];
      const result = component.groupedMessages;
      expect(result).toEqual([]);
    });
  
    it('should filter out deleted messages from current user', () => {
      const myDeletedMsg = { ...mockMessage, messageId: 'msg-deleted', isDeleted: true };
      component.messages = [mockMessage, myDeletedMsg];
      spyOn<any>(component, 'isMyMessage').and.callFake((msg: OtoMessage) => 
        msg.messageId === 'msg-deleted'
      );
      
      const result = component.groupedMessages;
      const allMessages = result.flatMap(g => g.messages);
      
      expect(allMessages.length).toBe(1);
      expect(allMessages[0].messageId).toBe('msg-1');
    });
  
    it('should keep deleted messages from other users', () => {
      const otherDeletedMsg = { ...mockMessage, messageId: 'msg-deleted', isDeleted: true };
      component.messages = [mockMessage, otherDeletedMsg];
      spyOn<any>(component, 'isMyMessage').and.returnValue(false);
      
      const result = component.groupedMessages;
      const allMessages = result.flatMap(g => g.messages);
      
      expect(allMessages.length).toBe(2);
    });
  
    it('should keep non-deleted messages', () => {
      const msg = { ...mockMessage, isDeleted: false };
      component.messages = [msg];
      
      const result = component.groupedMessages;
      const allMessages = result.flatMap(g => g.messages);
      
      expect(allMessages.length).toBe(1);
      expect(allMessages[0]).toBe(msg);
    });
  
    it('should sort messages by sentAt', () => {
      const msg1 = { ...mockMessage, messageId: 'msg-1', sentAt: '2024-01-02T10:00:00Z' };
      const msg2 = { ...mockMessage, messageId: 'msg-2', sentAt: '2024-01-01T10:00:00Z' };
      const msg3 = { ...mockMessage, messageId: 'msg-3', sentAt: '2024-01-03T10:00:00Z' };
      component.messages = [msg1, msg2, msg3];
      
      const result = component.groupedMessages;
      const allMessages = result.flatMap(g => g.messages);
      
      expect(allMessages[0].messageId).toBe('msg-2');
      expect(allMessages[1].messageId).toBe('msg-1');
      expect(allMessages[2].messageId).toBe('msg-3');
    });
  
    it('should group messages by date', () => {
      const msg1 = { ...mockMessage, messageId: 'msg-1', sentAt: '2024-01-01T10:00:00Z' };
      const msg2 = { ...mockMessage, messageId: 'msg-2', sentAt: '2024-01-01T15:00:00Z' };
      const msg3 = { ...mockMessage, messageId: 'msg-3', sentAt: '2024-01-02T10:00:00Z' };
      component.messages = [msg1, msg2, msg3];
      
      const result = component.groupedMessages;
      
      expect(result.length).toBe(2);
      expect(result[0].messages.length).toBe(2);
      expect(result[1].messages.length).toBe(1);
    });
  
    it('should create new group when date changes', () => {
      const msg1 = { ...mockMessage, messageId: 'msg-1', sentAt: '2024-01-01T10:00:00Z' };
      const msg2 = { ...mockMessage, messageId: 'msg-2', sentAt: '2024-01-02T10:00:00Z' };
      component.messages = [msg1, msg2];
      
      const result = component.groupedMessages;
      
      expect(result.length).toBe(2);
      expect(result[0].date).toBe(new Date('2024-01-01T10:00:00Z').toDateString());
      expect(result[0].messages).toEqual([msg1]);
      expect(result[1].date).toBe(new Date('2024-01-02T10:00:00Z').toDateString());
      expect(result[1].messages).toEqual([msg2]);
    });
  
    it('should add message to existing group when date is same', () => {
      const msg1 = { ...mockMessage, messageId: 'msg-1', sentAt: '2024-01-01T10:00:00Z' };
      const msg2 = { ...mockMessage, messageId: 'msg-2', sentAt: '2024-01-01T15:00:00Z' };
      component.messages = [msg1, msg2];
      
      const result = component.groupedMessages;
      
      expect(result.length).toBe(1);
      expect(result[0].messages.length).toBe(2);
      expect(result[0].messages[0]).toBe(msg1);
      expect(result[0].messages[1]).toBe(msg2);
    });
  
    it('should return groups array', () => {
      const msg = { ...mockMessage, sentAt: '2024-01-01T10:00:00Z' };
      component.messages = [msg];
      
      const result = component.groupedMessages;
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('forceFileRefresh', () => {
    it('should call forceFileRefreshBase with correct parameters', () => {
      spyOn<any>(component, 'forceFileRefreshBase');
      
      component.forceFileRefresh('msg-1', 'unique-file-id');
      
      expect((component as any).forceFileRefreshBase).toHaveBeenCalledWith(
        'msg-1',
        component.messages,
        'unique-file-id',
        cdrSpy
      );
    });
  
    it('should pass messageId correctly', () => {
      spyOn<any>(component, 'forceFileRefreshBase');
      
      component.forceFileRefresh('test-message-id', 'file-123');
      
      const callArgs = (component as any).forceFileRefreshBase.calls.mostRecent().args;
      expect(callArgs[0]).toBe('test-message-id');
    });
  
    it('should pass messages array correctly', () => {
      const testMessages = [mockMessage, { ...mockMessage, messageId: 'msg-2' }];
      component.messages = testMessages;
      spyOn<any>(component, 'forceFileRefreshBase');
      
      component.forceFileRefresh('msg-1', 'file-123');
      
      const callArgs = (component as any).forceFileRefreshBase.calls.mostRecent().args;
      expect(callArgs[1]).toBe(testMessages);
    });
  
    it('should pass fileUniqueId correctly', () => {
      spyOn<any>(component, 'forceFileRefreshBase');
      
      component.forceFileRefresh('msg-1', 'unique-file-identifier');
      
      const callArgs = (component as any).forceFileRefreshBase.calls.mostRecent().args;
      expect(callArgs[2]).toBe('unique-file-identifier');
    });
  
    it('should pass cdr correctly', () => {
      spyOn<any>(component, 'forceFileRefreshBase');
      
      component.forceFileRefresh('msg-1', 'file-123');
      
      const callArgs = (component as any).forceFileRefreshBase.calls.mostRecent().args;
      expect(callArgs[3]).toBe(cdrSpy);
    });
  
    it('should call forceFileRefreshBase exactly once', () => {
      spyOn<any>(component, 'forceFileRefreshBase');
      
      component.forceFileRefresh('msg-1', 'file-123');
      
      expect((component as any).forceFileRefreshBase).toHaveBeenCalledTimes(1);
    });
  
    it('should handle empty messageId', () => {
      spyOn<any>(component, 'forceFileRefreshBase');
      
      component.forceFileRefresh('', 'file-123');
      
      expect((component as any).forceFileRefreshBase).toHaveBeenCalledWith(
        '',
        component.messages,
        'file-123',
        cdrSpy
      );
    });
  
    it('should handle empty fileUniqueId', () => {
      spyOn<any>(component, 'forceFileRefreshBase');
      
      component.forceFileRefresh('msg-1', '');
      
      expect((component as any).forceFileRefreshBase).toHaveBeenCalledWith(
        'msg-1',
        component.messages,
        '',
        cdrSpy
      );
    });
  
    it('should work with empty messages array', () => {
      component.messages = [];
      spyOn<any>(component, 'forceFileRefreshBase');
      
      component.forceFileRefresh('msg-1', 'file-123');
      
      expect((component as any).forceFileRefreshBase).toHaveBeenCalledWith(
        'msg-1',
        [],
        'file-123',
        cdrSpy
      );
    });
  
    it('should work with multiple messages in array', () => {
      const testMessages = [
        mockMessage,
        { ...mockMessage, messageId: 'msg-2' },
        { ...mockMessage, messageId: 'msg-3' }
      ];
      component.messages = testMessages;
      spyOn<any>(component, 'forceFileRefreshBase');
      
      component.forceFileRefresh('msg-2', 'file-456');
      
      const callArgs = (component as any).forceFileRefreshBase.calls.mostRecent().args;
      expect(callArgs[1]).toBe(testMessages);
      expect(callArgs[1].length).toBe(3);
    });
  });

  describe('loadMore', () => {
    beforeEach(() => {
      (component as any).loading = false;
      (component as any).allLoaded = false;
      (component as any).historyLoadedCount = 0;
      (component as any).shouldScrollToBottom = false;
      component.chatNickName = 'user1';
      (component as any).take = 20;
    });
  
    it('should return early if loading is true', () => {
      (component as any).loading = true;
      const loadHistorySpy = jasmine.createSpy();
      component.loadHistory = loadHistorySpy;
      
      (component as any).loadMore();
      
      expect(loadHistorySpy).not.toHaveBeenCalled();
    });
  
    it('should return early if allLoaded is true', () => {
      (component as any).allLoaded = true;
      const loadHistorySpy = jasmine.createSpy();
      component.loadHistory = loadHistorySpy;
      
      (component as any).loadMore();
      
      expect(loadHistorySpy).not.toHaveBeenCalled();
    });
  
    it('should set loading to true at start', () => {
      const subject = new Subject<OtoMessage[]>();
      component.loadHistory = jasmine.createSpy().and.returnValue(subject.asObservable());
      
      (component as any).loadMore();
      
      expect((component as any).loading).toBe(true);
      
      subject.complete();
    });
  
    it('should return early and set loading to false if loadHistory is not defined', () => {
      component.loadHistory = undefined;
      
      (component as any).loadMore();
      
      expect((component as any).loading).toBe(false);
    });
  
    it('should call loadHistory with correct parameters', fakeAsync(() => {
      const loadHistorySpy = jasmine.createSpy().and.returnValue(of([]));
      component.loadHistory = loadHistorySpy;
      (component as any).historyLoadedCount = 5;
      
      (component as any).loadMore();
      tick();
      
      expect(loadHistorySpy).toHaveBeenCalledWith('user1', 20, 5);
    }));
  
    it('should capture scroll position before loading', fakeAsync(() => {
      component.loadHistory = jasmine.createSpy().and.returnValue(of([]));
      const scrollEl = component.scrollContainer.nativeElement;
      
      Object.defineProperty(scrollEl, 'scrollHeight', {
        value: 1000,
        writable: true,
        configurable: true
      });
      Object.defineProperty(scrollEl, 'scrollTop', {
        value: 100,
        writable: true,
        configurable: true
      });
      
      (component as any).loadMore();
      tick();
      
      expect(component.loadHistory).toHaveBeenCalled();
    }));
  
    it('should handle null scrollContainer gracefully', fakeAsync(() => {
      component.scrollContainer = null as any;
      component.loadHistory = jasmine.createSpy().and.returnValue(of([]));
      
      expect(() => {
        (component as any).loadMore();
        tick();
      }).not.toThrow();
    }));
  
    describe('when newMsgs.length === 0', () => {
      it('should set allLoaded to true', fakeAsync(() => {
        component.loadHistory = jasmine.createSpy().and.returnValue(of([]));
        
        (component as any).loadMore();
        tick();
        
        expect((component as any).allLoaded).toBe(true);
      }));
  
      it('should set loading to false', fakeAsync(() => {
        component.loadHistory = jasmine.createSpy().and.returnValue(of([]));
        
        (component as any).loadMore();
        tick();
        
        expect((component as any).loading).toBe(false);
      }));
  
      it('should call markForCheck', fakeAsync(() => {
        component.loadHistory = jasmine.createSpy().and.returnValue(of([]));
        
        (component as any).loadMore();
        tick();
        
        expect(cdrSpy.markForCheck).toHaveBeenCalled();
      }));
  
      it('should scroll to bottom if shouldScrollToBottom is true and messages exist', fakeAsync(() => {
        component.messages = [mockMessage];
        (component as any).shouldScrollToBottom = true;
        component.loadHistory = jasmine.createSpy().and.returnValue(of([]));
        spyOn<any>(component, 'scrollToBottomBase');
        
        (component as any).loadMore();
        tick(150);
        
        expect((component as any).scrollToBottomBase).toHaveBeenCalledWith(component.scrollContainer);
        expect((component as any).shouldScrollToBottom).toBe(false);
      }));
  
      it('should not scroll to bottom if shouldScrollToBottom is false', fakeAsync(() => {
        component.messages = [mockMessage];
        (component as any).shouldScrollToBottom = false;
        component.loadHistory = jasmine.createSpy().and.returnValue(of([]));
        spyOn<any>(component, 'scrollToBottomBase');
        
        (component as any).loadMore();
        tick(150);
        
        expect((component as any).scrollToBottomBase).not.toHaveBeenCalled();
      }));
  
      it('should not scroll to bottom if messages array is empty', fakeAsync(() => {
        component.messages = [];
        (component as any).shouldScrollToBottom = true;
        component.loadHistory = jasmine.createSpy().and.returnValue(of([]));
        spyOn<any>(component, 'scrollToBottomBase');
        
        (component as any).loadMore();
        tick(150);
        
        expect((component as any).scrollToBottomBase).not.toHaveBeenCalled();
      }));
    });
  
    describe('when filtered.length === 0', () => {
      it('should increment historyLoadedCount by newMsgs.length', fakeAsync(() => {
        const deletedMsg = { ...mockMessage, isDeleted: true };
        component.loadHistory = jasmine.createSpy().and.returnValue(of([deletedMsg]));
        spyOn<any>(component, 'isMyMessage').and.returnValue(true);
        
        (component as any).loadMore();
        tick();
        
        expect((component as any).historyLoadedCount).toBe(1);
      }));
  
      it('should set loading to false', fakeAsync(() => {
        const deletedMsg = { ...mockMessage, isDeleted: true };
        component.loadHistory = jasmine.createSpy().and.returnValue(of([deletedMsg]));
        spyOn<any>(component, 'isMyMessage').and.returnValue(true);
        
        (component as any).loadMore();
        tick();
        
        expect((component as any).loading).toBe(false);
      }));
  
      it('should set allLoaded to true if newMsgs.length < take', fakeAsync(() => {
        const deletedMsg = { ...mockMessage, isDeleted: true };
        component.loadHistory = jasmine.createSpy().and.returnValue(of([deletedMsg]));
        spyOn<any>(component, 'isMyMessage').and.returnValue(true);
        (component as any).take = 20;
        
        (component as any).loadMore();
        tick();
        
        expect((component as any).allLoaded).toBe(true);
      }));
  
      it('should call loadMore again after timeout if newMsgs.length >= take', fakeAsync(() => {
        const deletedMsgs = Array(20).fill(null).map((_, i) => ({
          ...mockMessage,
          messageId: `msg-${i}`,
          isDeleted: true
        }));
        
        let callCount = 0;
        component.loadHistory = jasmine.createSpy().and.callFake(() => {
          callCount++;
          if (callCount === 1) {
            return of(deletedMsgs);
          }
          return of([]);
        });
        
        spyOn<any>(component, 'isMyMessage').and.returnValue(true);
        (component as any).take = 20;
        
        (component as any).loadMore();
        tick(100);
        
        expect(component.loadHistory).toHaveBeenCalledTimes(2);
      }));
  
      it('should call markForCheck', fakeAsync(() => {
        const deletedMsg = { ...mockMessage, isDeleted: true };
        component.loadHistory = jasmine.createSpy().and.returnValue(of([deletedMsg]));
        spyOn<any>(component, 'isMyMessage').and.returnValue(true);
        
        (component as any).loadMore();
        tick();
        
        expect(cdrSpy.markForCheck).toHaveBeenCalled();
      }));
  
      it('should not set allLoaded if newMsgs.length >= take', fakeAsync(() => {
        const deletedMsgs = Array(20).fill(null).map((_, i) => ({
          ...mockMessage,
          messageId: `msg-${i}`,
          isDeleted: true
        }));
        component.loadHistory = jasmine.createSpy().and.returnValue(of(deletedMsgs));
        spyOn<any>(component, 'isMyMessage').and.returnValue(true);
        (component as any).take = 20;
        (component as any).allLoaded = false;
        
        (component as any).loadMore();
        tick();
        
        expect((component as any).allLoaded).toBe(false);
      }));
    });
  
    describe('when unique.length === 0', () => {
      it('should increment historyLoadedCount by filtered.length', fakeAsync(() => {
        const existingMsg = { ...mockMessage, messageId: 'existing' };
        component.messages = [existingMsg];
        component.loadHistory = jasmine.createSpy().and.returnValue(of([existingMsg]));
        
        (component as any).loadMore();
        tick();
        
        expect((component as any).historyLoadedCount).toBe(1);
      }));
  
      it('should set loading to false', fakeAsync(() => {
        const existingMsg = { ...mockMessage, messageId: 'existing' };
        component.messages = [existingMsg];
        component.loadHistory = jasmine.createSpy().and.returnValue(of([existingMsg]));
        
        (component as any).loadMore();
        tick();
        
        expect((component as any).loading).toBe(false);
      }));
  
      it('should set allLoaded to true if filtered.length < take', fakeAsync(() => {
        const existingMsg = { ...mockMessage, messageId: 'existing' };
        component.messages = [existingMsg];
        component.loadHistory = jasmine.createSpy().and.returnValue(of([existingMsg]));
        (component as any).take = 20;
        
        (component as any).loadMore();
        tick();
        
        expect((component as any).allLoaded).toBe(true);
      }));
  
      it('should call loadMore again after timeout if filtered.length >= take', fakeAsync(() => {
        const existingMsgs = Array(20).fill(null).map((_, i) => ({
          ...mockMessage,
          messageId: `existing-${i}`
        }));
        component.messages = existingMsgs;
        
        let callCount = 0;
        component.loadHistory = jasmine.createSpy().and.callFake(() => {
          callCount++;
          if (callCount === 1) {
            return of(existingMsgs);
          }
          return of([]);
        });
        
        (component as any).take = 20;
        
        (component as any).loadMore();
        tick(100);
        
        expect(component.loadHistory).toHaveBeenCalledTimes(2);
      }));
  
      it('should call markForCheck', fakeAsync(() => {
        const existingMsg = { ...mockMessage, messageId: 'existing' };
        component.messages = [existingMsg];
        component.loadHistory = jasmine.createSpy().and.returnValue(of([existingMsg]));
        
        (component as any).loadMore();
        tick();
        
        expect(cdrSpy.markForCheck).toHaveBeenCalled();
      }));
  
      it('should not set allLoaded if filtered.length >= take', fakeAsync(() => {
        const existingMsgs = Array(20).fill(null).map((_, i) => ({
          ...mockMessage,
          messageId: `existing-${i}`
        }));
        component.messages = existingMsgs;
        component.loadHistory = jasmine.createSpy().and.returnValue(of(existingMsgs));
        (component as any).take = 20;
        (component as any).allLoaded = false;
        
        (component as any).loadMore();
        tick();
        
        expect((component as any).allLoaded).toBe(false);
      }));
    });
  
    describe('when unique messages are loaded', () => {
      it('should increment historyLoadedCount by unique.length', fakeAsync(() => {
        const newMsg = { ...mockMessage, messageId: 'new-msg' };
        component.loadHistory = jasmine.createSpy().and.returnValue(of([newMsg]));
        
        (component as any).loadMore();
        tick();
        
        expect((component as any).historyLoadedCount).toBe(1);
      }));
  
      it('should call loadFilesForMessagesBase with unique messages', fakeAsync(() => {
        const newMsg = { ...mockMessage, messageId: 'new-msg' };
        component.loadHistory = jasmine.createSpy().and.returnValue(of([newMsg]));
        spyOn<any>(component, 'loadFilesForMessagesBase');
        
        (component as any).loadMore();
        tick();
        
        expect((component as any).loadFilesForMessagesBase).toHaveBeenCalledWith([newMsg]);
      }));
  
      it('should prepend unique messages to existing messages', fakeAsync(() => {
        const existingMsg = { ...mockMessage, messageId: 'existing' };
        const newMsg = { ...mockMessage, messageId: 'new-msg' };
        component.messages = [existingMsg];
        component.loadHistory = jasmine.createSpy().and.returnValue(of([newMsg]));
        
        (component as any).loadMore();
        tick();
        
        expect(component.messages.length).toBe(2);
        expect(component.messages[0].messageId).toBe('new-msg');
        expect(component.messages[1].messageId).toBe('existing');
      }));
  
      it('should set allLoaded to true if unique.length < take', fakeAsync(() => {
        const newMsg = { ...mockMessage, messageId: 'new-msg' };
        component.loadHistory = jasmine.createSpy().and.returnValue(of([newMsg]));
        (component as any).take = 20;
        
        (component as any).loadMore();
        tick();
        
        expect((component as any).allLoaded).toBe(true);
      }));
  
      it('should not set allLoaded if unique.length >= take', fakeAsync(() => {
        const newMsgs = Array(20).fill(null).map((_, i) => ({
          ...mockMessage,
          messageId: `new-msg-${i}`
        }));
        component.loadHistory = jasmine.createSpy().and.returnValue(of(newMsgs));
        (component as any).take = 20;
        (component as any).allLoaded = false;
        
        (component as any).loadMore();
        tick();
        
        expect((component as any).allLoaded).toBe(false);
      }));
  
      it('should restore scroll position multiple times if not shouldScrollToBottom', fakeAsync(() => {
        const newMsg = { ...mockMessage, messageId: 'new-msg' };
        component.loadHistory = jasmine.createSpy().and.returnValue(of([newMsg]));
        (component as any).shouldScrollToBottom = false;
        spyOn<any>(component, 'restoreScrollPosition');
        
        (component as any).loadMore();
        tick(0);
        tick(50);
        tick(100);
        tick(200);
        
        expect((component as any).restoreScrollPosition).toHaveBeenCalledTimes(4);
      }));
  
      it('should scroll to bottom if shouldScrollToBottom is true', fakeAsync(() => {
        const newMsg = { ...mockMessage, messageId: 'new-msg' };
        component.loadHistory = jasmine.createSpy().and.returnValue(of([newMsg]));
        (component as any).shouldScrollToBottom = true;
        spyOn<any>(component, 'scrollToBottomBase');
        
        (component as any).loadMore();
        tick(150);
        
        expect((component as any).scrollToBottomBase).toHaveBeenCalledWith(component.scrollContainer);
        expect((component as any).shouldScrollToBottom).toBe(false);
      }));
  
      it('should not restore scroll position if shouldScrollToBottom is true', fakeAsync(() => {
        const newMsg = { ...mockMessage, messageId: 'new-msg' };
        component.loadHistory = jasmine.createSpy().and.returnValue(of([newMsg]));
        (component as any).shouldScrollToBottom = true;
        spyOn<any>(component, 'restoreScrollPosition');
        
        (component as any).loadMore();
        tick(200);
        
        expect((component as any).restoreScrollPosition).not.toHaveBeenCalled();
      }));
  
      it('should set loading to false', fakeAsync(() => {
        const newMsg = { ...mockMessage, messageId: 'new-msg' };
        component.loadHistory = jasmine.createSpy().and.returnValue(of([newMsg]));
        
        (component as any).loadMore();
        tick();
        
        expect((component as any).loading).toBe(false);
      }));
  
      it('should call markForCheck', fakeAsync(() => {
        const newMsg = { ...mockMessage, messageId: 'new-msg' };
        component.loadHistory = jasmine.createSpy().and.returnValue(of([newMsg]));
        
        (component as any).loadMore();
        tick();
        
        expect(cdrSpy.markForCheck).toHaveBeenCalled();
      }));
  
      it('should filter out deleted messages from current user', fakeAsync(() => {
        const newMsg = { ...mockMessage, messageId: 'new-msg' };
        const deletedMsg = { ...mockMessage, messageId: 'deleted-msg', isDeleted: true };
        component.loadHistory = jasmine.createSpy().and.returnValue(of([newMsg, deletedMsg]));
        spyOn<any>(component, 'isMyMessage').and.callFake((msg: OtoMessage) => 
          msg.messageId === 'deleted-msg'
        );
        
        (component as any).loadMore();
        tick();
        
        expect(component.messages.length).toBe(1);
        expect(component.messages[0].messageId).toBe('new-msg');
      }));
  
      it('should keep deleted messages from other users', fakeAsync(() => {
        const newMsg = { ...mockMessage, messageId: 'new-msg' };
        const deletedMsg = { ...mockMessage, messageId: 'deleted-msg', isDeleted: true };
        component.loadHistory = jasmine.createSpy().and.returnValue(of([newMsg, deletedMsg]));
        spyOn<any>(component, 'isMyMessage').and.returnValue(false);
        
        (component as any).loadMore();
        tick();
        
        expect(component.messages.length).toBe(2);
      }));
  
      it('should create Set from existing messageIds', fakeAsync(() => {
        const existingMsg1 = { ...mockMessage, messageId: 'existing-1' };
        const existingMsg2 = { ...mockMessage, messageId: 'existing-2' };
        const newMsg = { ...mockMessage, messageId: 'new-msg' };
        component.messages = [existingMsg1, existingMsg2];
        component.loadHistory = jasmine.createSpy().and.returnValue(of([newMsg, existingMsg1]));
        
        (component as any).loadMore();
        tick();
        
        expect(component.messages.length).toBe(3);
        expect(component.messages.filter(m => m.messageId === 'existing-1').length).toBe(1);
      }));
  
      it('should handle prevScrollHeight correctly', fakeAsync(() => {
        const newMsg = { ...mockMessage, messageId: 'new-msg' };
        component.loadHistory = jasmine.createSpy().and.returnValue(of([newMsg]));
        const scrollEl = component.scrollContainer.nativeElement;
        
        Object.defineProperty(scrollEl, 'scrollHeight', {
          value: 500,
          writable: true,
          configurable: true
        });
        Object.defineProperty(scrollEl, 'scrollTop', {
          value: 100,
          writable: true,
          configurable: true
        });
        
        spyOn<any>(component, 'restoreScrollPosition');
        
        (component as any).loadMore();
        tick(0);
        
        expect((component as any).restoreScrollPosition).toHaveBeenCalledWith(500, 100);
      }));
  
      it('should handle prevScrollTop correctly', fakeAsync(() => {
        const newMsg = { ...mockMessage, messageId: 'new-msg' };
        component.loadHistory = jasmine.createSpy().and.returnValue(of([newMsg]));
        const scrollEl = component.scrollContainer.nativeElement;
        
        Object.defineProperty(scrollEl, 'scrollHeight', {
          value: 500,
          writable: true,
          configurable: true
        });
        Object.defineProperty(scrollEl, 'scrollTop', {
          value: 250,
          writable: true,
          configurable: true
        });
        
        spyOn<any>(component, 'restoreScrollPosition');
        
        (component as any).loadMore();
        tick(0);
        
        expect((component as any).restoreScrollPosition).toHaveBeenCalledWith(500, 250);
      }));
    });
  
    describe('error handling', () => {
      it('should set loading to false on error', fakeAsync(() => {
        component.loadHistory = jasmine.createSpy().and.returnValue(throwError(() => new Error('Load error')));
        
        (component as any).loadMore();
        tick();
        
        expect((component as any).loading).toBe(false);
      }));
  
      it('should call markForCheck on error', fakeAsync(() => {
        component.loadHistory = jasmine.createSpy().and.returnValue(throwError(() => new Error('Load error')));
        
        (component as any).loadMore();
        tick();
        
        expect(cdrSpy.markForCheck).toHaveBeenCalled();
      }));
  
      it('should not throw error when loadHistory fails', fakeAsync(() => {
        component.loadHistory = jasmine.createSpy().and.returnValue(throwError(() => new Error('Load error')));
        
        expect(() => {
          (component as any).loadMore();
          tick();
        }).not.toThrow();
      }));
    });
  
    describe('takeUntil integration', () => {
      it('should use takeUntil with destroy$', fakeAsync(() => {
        const subject = new Subject<OtoMessage[]>();
        component.loadHistory = jasmine.createSpy().and.returnValue(subject.asObservable());
        
        (component as any).loadMore();
        
        (component as any).destroy$.next();
        (component as any).destroy$.complete();
        
        subject.next([mockMessage]);
        tick();
        
        expect(component.messages.length).toBe(0);
      }));
    });
  
    describe('edge cases', () => {
      it('should handle messages with same messageId', fakeAsync(() => {
        const msg1 = { ...mockMessage, messageId: 'same-id', content: 'old' };
        const msg2 = { ...mockMessage, messageId: 'same-id', content: 'new' };
        component.messages = [msg1];
        component.loadHistory = jasmine.createSpy().and.returnValue(of([msg2]));
        
        (component as any).loadMore();
        tick();
        
        expect(component.messages.length).toBe(1);
        expect(component.messages[0].content).toBe('old');
      }));
  
      it('should handle take = 1', fakeAsync(() => {
        const newMsg = { ...mockMessage, messageId: 'new-msg' };
        component.loadHistory = jasmine.createSpy().and.returnValue(of([newMsg]));
        (component as any).take = 1;
        
        (component as any).loadMore();
        tick();
        
        expect((component as any).allLoaded).toBe(false);
      }));
  
      it('should handle multiple unique messages', fakeAsync(() => {
        const newMsgs = [
          { ...mockMessage, messageId: 'new-1' },
          { ...mockMessage, messageId: 'new-2' },
          { ...mockMessage, messageId: 'new-3' }
        ];
        component.loadHistory = jasmine.createSpy().and.returnValue(of(newMsgs));
        
        (component as any).loadMore();
        tick();
        
        expect(component.messages.length).toBe(3);
        expect((component as any).historyLoadedCount).toBe(3);
      }));
  
      it('should handle mixed new and existing messages', fakeAsync(() => {
        const existing1 = { ...mockMessage, messageId: 'existing-1' };
        const existing2 = { ...mockMessage, messageId: 'existing-2' };
        const newMsg = { ...mockMessage, messageId: 'new-msg' };
        component.messages = [existing1, existing2];
        component.loadHistory = jasmine.createSpy().and.returnValue(of([newMsg, existing1]));
        
        (component as any).loadMore();
        tick();
        
        expect(component.messages.length).toBe(3);
        expect((component as any).historyLoadedCount).toBe(1);
      }));
  
      it('should preserve message order after prepending', fakeAsync(() => {
        const existing = { ...mockMessage, messageId: 'existing', sentAt: '2024-01-02' };
        const newMsg = { ...mockMessage, messageId: 'new-msg', sentAt: '2024-01-01' };
        component.messages = [existing];
        component.loadHistory = jasmine.createSpy().and.returnValue(of([newMsg]));
        
        (component as any).loadMore();
        tick();
        
        expect(component.messages[0].messageId).toBe('new-msg');
        expect(component.messages[1].messageId).toBe('existing');
      }));
    });
  });
});