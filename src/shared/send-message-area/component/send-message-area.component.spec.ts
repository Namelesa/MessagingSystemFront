import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SendAreaComponent } from './send-message-area.component';
import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface BaseMessage {
  messageId?: string;
  id?: string;
  sender: string;
  content: string;
}

@Component({
  standalone: true,
  imports: [SendAreaComponent, FormsModule, TranslateModule],
  template: `<shared-send-message-area 
               [editingMessage]="editingMessage" 
               [replyingToMessage]="replyingToMessage"
               [draftText]="draftText"
               [maxFileSize]="maxFileSize"
               [editFileUploading]="editFileUploading"
               (send)="onSend($event)"
               (editComplete)="onEditComplete($event)"
               (editCancel)="onEditCancel()"
               (replyCancel)="onReplyCancel()"
               (fileUpload)="onFileUpload($event)"
               (fileValidationError)="onFileValidationError($event)"
               (removeFileFromEditingMessage)="onRemoveFile($event)"
               (editFile)="onEditFile($event)"
               (draftTextChange)="onDraftTextChange($event)">
             </shared-send-message-area>`
})
class TestHostComponent {
  editingMessage?: BaseMessage;
  replyingToMessage?: BaseMessage;
  draftText = '';
  maxFileSize = 1024 * 1024 * 1024;
  editFileUploading = false;
  sentMessage = '';
  editedMessage: any = null;
  editCanceled = false;
  replyCanceled = false;
  uploadedFiles: any = null;
  validationErrors: any = null;
  removedFile: any = null;
  editedFile: any = null;
  draftChanged = '';

  @ViewChild(SendAreaComponent) sendArea!: SendAreaComponent;

  onSend(msg: string) { this.sentMessage = msg; }
  onEditComplete(event: any) { this.editedMessage = event; }
  onEditCancel() { this.editCanceled = true; }
  onReplyCancel() { this.replyCanceled = true; }
  onFileUpload(event: any) { this.uploadedFiles = event; }
  onFileValidationError(errors: any) { this.validationErrors = errors; }
  onRemoveFile(event: any) { this.removedFile = event; }
  onEditFile(event: any) { this.editedFile = event; }
  onDraftTextChange(text: string) { this.draftChanged = text; }
}

describe('SendAreaComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let translateService: TranslateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, TranslateModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    translateService = TestBed.inject(TranslateService);
    
    spyOn(translateService, 'instant').and.callFake((key: string, params?: any) => {
      if (key === 'messages.editPlaceholder') return 'Edit Message...';
      if (key === 'messages.replyToPlaceholder') return `Reply to ${params?.sender}...`;
      if (key === 'messages.sendPlaceholder') return 'Send message...';
      return key;
    });

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(host.sendArea).toBeTruthy();
  });

  it('should clear message if editingMessage and replyingToMessage are removed', () => {
    host.sendArea.message = 'Test';
    host.sendArea.ngOnChanges({ editingMessage: { currentValue: null, previousValue: { content: 'x' }, firstChange: false, isFirstChange: () => false } });
    expect(host.sendArea.message).toBe('');
  });

  it('should emit send for normal message', () => {
    host.sendArea.message = 'Hi there';
    host.sendArea.emitMessage();
    expect(host.sentMessage).toBe('Hi there');
    expect(host.sendArea.message).toBe('');
  });

  it('should not emit if message is empty', () => {
    host.sendArea.message = '    ';
    host.sendArea.emitMessage();
    expect(host.sentMessage).toBe('');
  });

  it('should not emit if message is too long', () => {
    host.sendArea.message = 'x'.repeat(host.sendArea.maxLength + 1);
    host.sendArea.emitMessage();
    expect(host.sentMessage).toBe('');
  });

  it('should cancel edit', () => {
    host.sendArea.message = 'some text';
    host.sendArea.cancelEdit();
    expect(host.editCanceled).toBeTrue();
    expect(host.sendArea.message).toBe('');
  });

  it('should cancel reply', () => {
    host.sendArea.message = 'some text';
    host.sendArea.cancelReply();
    expect(host.replyCanceled).toBeTrue();
    expect(host.sendArea.message).toBe('');
  });

  it('should truncate text correctly', () => {
    const text = 'x'.repeat(60);
    expect(host.sendArea.truncateText(text, 50)).toBe('x'.repeat(50) + '...');
    expect(host.sendArea.truncateText('short', 50)).toBe('short');
  });

  it('should handle Enter key without shift', () => {
    host.sendArea.message = 'hello';
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    spyOn(host.sendArea, 'emitMessage').and.callThrough();
    host.sendArea.onKeyDown(event);
    expect(host.sendArea.emitMessage).toHaveBeenCalled();
  });

  it('should not send on Enter with shift', () => {
    host.sendArea.message = 'hello';
    const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });
    spyOn(host.sendArea, 'emitMessage').and.callThrough();
    host.sendArea.onKeyDown(event);
    expect(host.sendArea.emitMessage).not.toHaveBeenCalled();
  });

  it('should calculate textareaRows correctly', () => {
    host.sendArea.message = 'line1';
    expect(host.sendArea.textareaRows).toBe(1);
    host.sendArea.message = 'line1\nline2\nline3\nline4\nline5\nline6';
    expect(host.sendArea.textareaRows).toBe(5);
  });

  it('should calculate warningThreshold, messageLength, showCounter, isTooLong, remainingMessage, remainingChars', () => {
    host.sendArea.message = 'x'.repeat(1900);
    expect(host.sendArea.warningThreshold).toBe(host.sendArea.maxLength - 100);
    expect(host.sendArea.messageLength).toBe(1900);
    expect(host.sendArea.showCounter).toBeTrue();
    expect(host.sendArea.isTooLong).toBeFalse();
    expect(host.sendArea.remainingMessage).toBe('1900/2000');
    expect(host.sendArea.remainingChars).toBe('100');
  });

  it('should return correct placeholderText', () => {
    expect(host.sendArea.placeholderText).toBe('Send message...');
    host.sendArea.editingMessage = { messageId: '1', sender: 'Alice', content: 'hi' };
    expect(host.sendArea.placeholderText).toBe('Edit Message...');
    host.sendArea.editingMessage = undefined;
    host.sendArea.replyingToMessage = { id: '2', sender: 'Bob', content: 'reply' };
    expect(host.sendArea.placeholderText).toBe('Reply to Bob...');
  });

  it('should correctly report isEditing and isReplying', () => {
    host.sendArea.editingMessage = { messageId: '1', sender: 'Alice', content: 'hi' };
    expect(host.sendArea.isEditing).toBeTrue();
    host.sendArea.editingMessage = undefined;
    host.sendArea.replyingToMessage = { id: '2', sender: 'Bob', content: 'reply' };
    expect(host.sendArea.isReplying).toBeTrue();
  });

  it('should not clear message if replyingToMessage removed while editingMessage exists', () => {
    host.sendArea.editingMessage = { messageId: '123', sender: 'Alice', content: 'edit me' };
    host.sendArea.message = 'keep me';
    host.sendArea.ngOnChanges({ replyingToMessage: { currentValue: null, previousValue: { sender: 'Bob', content: 'reply' }, firstChange: false, isFirstChange: () => false } });
    expect(host.sendArea.message).toBe('keep me');
  });

  it('should not emit if message exceeds maxBytes', () => {
    const originalBlob = window.Blob;
    spyOn(window, 'Blob').and.returnValue({ size: 9000 } as Blob);
  
    host.sendArea.message = 'test message under char limit';

    expect(host.sendArea.message.length).toBeLessThan(host.sendArea.maxLength);
    expect(host.sendArea.isTooLong).toBeFalse();
  
    const initialMessage = host.sentMessage;
    host.sendArea.emitMessage();
    expect(host.sentMessage).toBe(initialMessage);
    (window.Blob as any) = originalBlob;
  });

  it('should not emit if called too soon (spam protection)', () => {
    host.sendArea.message = 'test spam';
    (host.sendArea as any).lastSentAt = Date.now(); 
    host.sendArea.emitMessage();
    expect(host.sentMessage).toBe('');
  });

  it('should emit editComplete when in edit mode', () => {
    const msg = { messageId: 'm1', sender: 'Alice', content: 'old' };
    host.sendArea.editingMessage = msg;
    host.sendArea.message = 'new content';
    host.sendArea.emitMessage();
    expect(host.editedMessage.messageId).toBe('m1');
    expect(JSON.parse(host.editedMessage.content)).toEqual({ text: 'new content', files: [] });
  });

  it('should return negative remainingChars if message too long', () => {
    host.sendArea.message = 'x'.repeat(host.sendArea.maxLength + 5);
    expect(parseInt(host.sendArea.remainingChars, 10)).toBeLessThan(0);
  });

  it('should do nothing on non-Enter key', () => {
    host.sendArea.message = 'test';
    spyOn(host.sendArea, 'emitMessage');
    const event = new KeyboardEvent('keydown', { key: 'a' });
    host.sendArea.onKeyDown(event);
    expect(host.sendArea.emitMessage).not.toHaveBeenCalled();
  });

  it('should emit editComplete with id when editingMessage has no messageId but has id', () => {
    const msg = { id: 'id-456', sender: 'Bob', content: 'original' };
    host.sendArea.editingMessage = msg;
    host.sendArea.message = 'modified content';
    host.sendArea.emitMessage();
    expect(host.editedMessage.messageId).toBe('id-456');
    expect(JSON.parse(host.editedMessage.content)).toEqual({ text: 'modified content', files: [] });
  });
  
  it('should set message to editing content when editingMessage is set', () => {
    const editingMsg = { messageId: '123', sender: 'Alice', content: 'edit this' };
    host.sendArea.editingMessage = editingMsg;
    host.sendArea.ngOnChanges({ 
      editingMessage: { 
        currentValue: editingMsg, 
        previousValue: null, 
        firstChange: false, 
        isFirstChange: () => false 
      } 
    });
    expect(host.sendArea.message).toBe('edit this');
  });

  it('should use default maxLength parameter in truncateText', () => {
    const longText = 'x'.repeat(60);
    expect(host.sendArea.truncateText(longText)).toBe('x'.repeat(50) + '...');
  });

  it('should handle editingMessage with only id property (no messageId)', () => {
    const editingMsg = { id: 'only-id', sender: 'Charlie', content: 'edit with id only' };
    host.sendArea.editingMessage = editingMsg;
    host.sendArea.message = 'modified text';
    
    host.sendArea.emitMessage();
    
    expect(host.editedMessage.messageId).toBe('only-id');
    expect(JSON.parse(host.editedMessage.content)).toEqual({ text: 'modified text', files: [] });
  });

  it('should emit fileUpload with valid file and clear message', () => {
    const file = new File(['content'], 'test.png', { type: 'image/png' });
    host.sendArea.message = 'with file';
    spyOn(host.sendArea.fileUpload, 'emit');
  
    const event = { target: { files: [file], value: '' } } as any;
    host.sendArea.onFileInputChange(event);
  
    expect(host.sendArea.fileUpload.emit).toHaveBeenCalledWith({
      files: [file],
      message: 'with file'
    });
    expect(host.sendArea.message).toBe('');
  });
  
  it('should not emit fileUpload if file is too large', () => {
    const file = new File(['x'], 'bigfile.dat', { type: 'application/pdf' });
    Object.defineProperty(file, 'size', { value: host.sendArea.maxFileSize + 1 });
  
    spyOn(host.sendArea.fileUpload, 'emit');
    const event = { target: { files: [file], value: '' } } as any;
  
    host.sendArea.onFileInputChange(event);
  
    expect(host.sendArea.fileUpload.emit).not.toHaveBeenCalled();
  });

  it('should reset input value after handling files', () => {
    const file = new File(['abc'], 'file.txt', { type: 'text/plain' });
    const inputMock = { files: [file], value: 'something' };
    const event = { target: inputMock } as any;
  
    host.sendArea.onFileInputChange(event);
  
    expect(inputMock.value).toBe('');
  });

  it('should handle draftText input changes', () => {
    host.draftText = 'Draft message';
    fixture.detectChanges();
    expect(host.sendArea.message).toBe('Draft message');
  });

  it('should emit draftTextChange when message is sent', () => {
    spyOn(host.sendArea.draftTextChange, 'emit');
    host.sendArea.message = 'test';
    host.sendArea.emitMessage();
    expect(host.sendArea.draftTextChange.emit).toHaveBeenCalledWith('');
  });

  it('should not emit when editFileUploading is true', () => {
    host.editFileUploading = true;
    fixture.detectChanges();
    host.sendArea.message = 'test';
    const initialSent = host.sentMessage;
    host.sendArea.emitMessage();
    expect(host.sentMessage).toBe(initialSent);
  });

  it('should emit message with only files (no text) in edit mode', () => {
    host.sendArea.editingMessage = { messageId: '123', sender: 'Alice', content: '' };
    host.sendArea.editingFiles = [{ fileName: 'test.pdf', url: 'url', uniqueId: 'f1' }];
    host.sendArea.message = '';
    
    host.sendArea.emitMessage();
    
    expect(host.editedMessage.content).toContain('"files"');
  });

  it('should parse editingMessage with JSON content', () => {
    const msg = { 
      messageId: '123', 
      sender: 'Alice', 
      content: JSON.stringify({ text: 'Hello', files: [{ fileName: 'doc.pdf', url: 'url' }] })
    };
    host.sendArea.editingMessage = msg;
    host.sendArea.ngOnChanges({ 
      editingMessage: { currentValue: msg, previousValue: null, firstChange: false, isFirstChange: () => false } 
    });
    
    expect(host.sendArea.message).toBe('Hello');
    expect(host.sendArea.editingFiles.length).toBe(1);
  });

  it('should parse editingMessage with parsedFiles property', () => {
    const msg: any = { 
      messageId: '123', 
      sender: 'Alice', 
      content: JSON.stringify({ text: 'Test' }),
      parsedFiles: [{ fileName: 'image.png', url: 'url', uniqueId: 'img1' }]
    };
    host.sendArea.editingMessage = msg;
    host.sendArea.ngOnChanges({ 
      editingMessage: { currentValue: msg, previousValue: null, firstChange: false, isFirstChange: () => false } 
    });
    
    expect(host.sendArea.editingFiles.length).toBe(1);
    expect(host.sendArea.editingFiles[0].fileName).toBe('image.png');
  });

  it('should parse editingMessage with parsedContent property', () => {
    const msg: any = { 
      messageId: '123', 
      sender: 'Alice', 
      content: 'raw',
      parsedContent: { text: 'Parsed text', files: [] }
    };
    host.sendArea.editingMessage = msg;
    host.sendArea.ngOnChanges({ 
      editingMessage: { currentValue: msg, previousValue: null, firstChange: false, isFirstChange: () => false } 
    });
    
    expect(host.sendArea.message).toBe('Parsed text');
  });

  it('should handle editingMessage with string content (not JSON)', () => {
    const msg = { messageId: '123', sender: 'Alice', content: 'Plain text' };
    host.sendArea.editingMessage = msg;
    host.sendArea.ngOnChanges({ 
      editingMessage: { currentValue: msg, previousValue: null, firstChange: false, isFirstChange: () => false } 
    });
    
    expect(host.sendArea.message).toBe('Plain text');
    expect(host.sendArea.editingFiles.length).toBe(0);
  });

  it('should handle editingMessage with empty content', () => {
    const msg = { messageId: '123', sender: 'Alice', content: '' };
    host.sendArea.editingMessage = msg;
    host.sendArea.ngOnChanges({ 
      editingMessage: { currentValue: msg, previousValue: null, firstChange: false, isFirstChange: () => false } 
    });
    
    expect(host.sendArea.message).toBe('');
  });

  it('should parse replyingToMessage with JSON content', () => {
    const msg = { 
      id: '456', 
      sender: 'Bob', 
      content: JSON.stringify({ text: 'Reply text', files: [{ fileName: 'file.txt', url: 'url' }] })
    };
    host.sendArea.replyingToMessage = msg;
    host.sendArea.parseReplyingMessage();
    
    expect(host.sendArea.replyingText).toBe('Reply text');
    expect(host.sendArea.replyingFiles.length).toBe(1);
  });

  it('should parse replyingToMessage with plain text', () => {
    const msg = { id: '456', sender: 'Bob', content: 'Plain reply' };
    host.sendArea.replyingToMessage = msg;
    host.sendArea.parseReplyingMessage();
    
    expect(host.sendArea.replyingText).toBe('Plain reply');
    expect(host.sendArea.replyingFiles.length).toBe(0);
  });

  it('should detect file type as image', () => {
    expect(host.sendArea.detectFileType('photo.jpg')).toBe('image');
    expect(host.sendArea.detectFileType('photo.png')).toBe('image');
  });

  it('should detect file type as video', () => {
    expect(host.sendArea.detectFileType('movie.mp4')).toBe('video');
  });

  it('should detect file type as audio', () => {
    expect(host.sendArea.detectFileType('song.mp3')).toBe('audio');
  });

  it('should detect file type as document', () => {
    expect(host.sendArea.detectFileType('report.pdf')).toBe('document');
  });

  it('should detect file type as file for unknown extensions', () => {
    expect(host.sendArea.detectFileType('data.xyz')).toBe('file');
  });

  it('should get correct file icon for each type', () => {
    expect(host.sendArea.getFileIcon({ fileName: 'img.png', url: '' })).toBe('🖼️');
    expect(host.sendArea.getFileIcon({ fileName: 'vid.mp4', url: '' })).toBe('🎥');
    expect(host.sendArea.getFileIcon({ fileName: 'audio.mp3', url: '' })).toBe('🎵');
    expect(host.sendArea.getFileIcon({ fileName: 'doc.pdf', url: '' })).toBe('📄');
    expect(host.sendArea.getFileIcon({ fileName: 'unknown.xyz', url: '' })).toBe('📎');
  });

  it('should format file size correctly', () => {
    expect(host.sendArea.formatFileSize(0)).toBe('0 B');
    expect(host.sendArea.formatFileSize(500)).toBe('500 B');
    expect(host.sendArea.formatFileSize(1024)).toBe('1 KB');
    expect(host.sendArea.formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(host.sendArea.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
  });

  it('should remove editing file', () => {
    host.sendArea.editingMessage = { messageId: '123', sender: 'Alice', content: '' };
    host.sendArea.editingFiles = [
      { fileName: 'file1.pdf', url: '', uniqueId: 'f1' },
      { fileName: 'file2.pdf', url: '', uniqueId: 'f2' }
    ];
    
    spyOn(host.sendArea.removeFileFromEditingMessage, 'emit');
    
    host.sendArea.removeEditingFile({ fileName: 'file1.pdf', url: '', uniqueId: 'f1' });
    
    expect(host.sendArea.editingFiles.length).toBe(1);
    expect(host.sendArea.removeFileFromEditingMessage.emit).toHaveBeenCalledWith({
      messageId: '123',
      uniqueFileName: 'f1'
    });
  });

  it('should not remove file if no editingMessage', () => {
    host.sendArea.editingFiles = [{ fileName: 'file.pdf', url: '', uniqueId: 'f1' }];
    const initialLength = host.sendArea.editingFiles.length;
    
    host.sendArea.removeEditingFile({ fileName: 'file.pdf', url: '', uniqueId: 'f1' });
    
    expect(host.sendArea.editingFiles.length).toBe(initialLength);
  });

  it('should not remove file if no uniqueId', () => {
    host.sendArea.editingMessage = { messageId: '123', sender: 'Alice', content: '' };
    host.sendArea.editingFiles = [{ fileName: 'file.pdf', url: '' }];
    const initialLength = host.sendArea.editingFiles.length;
    
    host.sendArea.removeEditingFile({ fileName: 'file.pdf', url: '' });
    
    expect(host.sendArea.editingFiles.length).toBe(initialLength);
  });

  it('should set file to edit', () => {
    const file = { fileName: 'test.pdf', url: '', uniqueId: 'f1' };
    host.sendArea.setFileToEdit(file);
    expect(host.sendArea.fileBeingEdited).toBe(file);
  });

  it('should emit fileValidationError for invalid files', () => {
    const largeFile = new File(['x'], 'large.dat', { type: 'application/pdf' });
    Object.defineProperty(largeFile, 'size', { value: host.sendArea.maxFileSize + 1 });
    
    spyOn(host.sendArea.fileValidationError, 'emit');
    
    const event = { target: { files: [largeFile], value: '' } } as any;
    host.sendArea.onFileInputChange(event);
    
    expect(host.sendArea.fileValidationError.emit).toHaveBeenCalled();
  });

  it('should not clear message in edit mode when uploading files', () => {
    host.sendArea.editingMessage = { messageId: '123', sender: 'Alice', content: '' };
    host.sendArea.message = 'keep this';
    const file = new File(['content'], 'test.png', { type: 'image/png' });
    
    const event = { target: { files: [file], value: '' } } as any;
    host.sendArea.onFileInputChange(event);
    
    expect(host.sendArea.message).toBe('keep this');
  });

  it('should return maxFileSizeFormatted', () => {
    expect(host.sendArea.maxFileSizeFormatted).toBe('1 GB');
  });

  it('should return fileSizeInfo', () => {
    expect(host.sendArea.fileSizeInfo).toContain('Max file size');
  });

  it('should track files by uniqueId', () => {
    const file = { fileName: 'test.pdf', url: '', uniqueId: 'uid123' };
    expect(host.sendArea.trackByFile(0, file)).toBe('uid123');
  });

  it('should track files by uniqueFileName if no uniqueId', () => {
    const file = { fileName: 'test.pdf', url: '', uniqueFileName: 'ufn123' };
    expect(host.sendArea.trackByFile(0, file)).toBe('ufn123');
  });

  it('should track files by fileName if no uniqueId or uniqueFileName', () => {
    const file = { fileName: 'test.pdf', url: '' };
    expect(host.sendArea.trackByFile(0, file)).toBe('test.pdf');
  });

  it('should track files by index if nothing else available', () => {
    const file = { fileName: '', url: '' };
    expect(host.sendArea.trackByFile(5, file)).toBe('5');
  });

  it('should handle onEditFileInputChange', () => {
    host.sendArea.editingMessage = { messageId: '123', sender: 'Alice', content: '' };
    host.sendArea.editingFiles = [{ fileName: 'old.pdf', url: '', uniqueId: 'f1' }];
    host.sendArea.fileBeingEdited = { fileName: 'old.pdf', url: '', uniqueId: 'f1' };
    
    const newFile = new File(['content'], 'new.pdf', { type: 'application/pdf' });
    const inputMock = { files: [newFile], value: 'test' };
    const event = { target: inputMock } as any;
    
    spyOn(host.sendArea.editFile, 'emit');
    
    host.sendArea.onEditFileInputChange(event);
    
    expect(host.sendArea.editingFiles[0].fileName).toBe('new.pdf');
    expect(host.sendArea.editFile.emit).toHaveBeenCalled();
    expect(host.sendArea.fileBeingEdited).toBeUndefined();
    expect(inputMock.value).toBe('');
  });

  it('should not handle onEditFileInputChange if no fileBeingEdited', () => {
    const newFile = new File(['content'], 'new.pdf', { type: 'application/pdf' });
    const inputMock = { files: [newFile], value: 'test' };
    const event = { target: inputMock } as any;
    
    spyOn(host.sendArea.editFile, 'emit');
    
    host.sendArea.onEditFileInputChange(event);
    
    expect(host.sendArea.editFile.emit).not.toHaveBeenCalled();
  });

it('should use content as fallback when parsing fails in parsedFiles branch', () => {
  const msg: any = { 
    messageId: '123', 
    sender: 'Alice', 
    content: 'Plain content text',
    parsedFiles: [{ fileName: 'file.pdf', url: 'url', uniqueId: 'f1' }]
  };
  
  host.sendArea.editingMessage = msg;
  host.sendArea.ngOnChanges({ 
    editingMessage: { 
      currentValue: msg, 
      previousValue: null, 
      firstChange: false, 
      isFirstChange: () => false 
    } 
  });
  
  expect(host.sendArea.message).toBe('Plain content text');
  expect(host.sendArea.editingFiles.length).toBe(1);
});

it('should handle fileName without dot in getFileExtension', () => {
  const result = host.sendArea.getFileExtension('noextension');
  expect(result).toBe('NOEXTENSION');
});

it('should call parseReplyingMessage when replyingToMessage is set', () => {
  const msg = { id: '123', sender: 'Bob', content: JSON.stringify({ text: 'Hey' }) };
  
  spyOn(host.sendArea, 'parseReplyingMessage').and.callThrough();

  host.sendArea.replyingToMessage = msg;

  host.sendArea.ngOnChanges({
    replyingToMessage: {
      currentValue: msg,
      previousValue: null,
      firstChange: false,
      isFirstChange: () => false
    }
  });

  expect(host.sendArea.parseReplyingMessage).toHaveBeenCalled();
  expect(host.sendArea.replyingText).toBe('Hey');
});

it('should return true when total file size is within limit', () => {
  const smallFile = new File(['123'], 'small.txt');
  Object.defineProperty(smallFile, 'size', { value: 100 });

  const result = host.sendArea.checkTotalFileSize([smallFile]);
  expect(result).toBeTrue();
});

it('should return false when total file size exceeds limit', () => {
  const bigFile = new File(['xxx'], 'big.txt');
  Object.defineProperty(bigFile, 'size', { value: host.sendArea.maxFileSize + 1 });

  const result = host.sendArea.checkTotalFileSize([bigFile]);
  expect(result).toBeFalse();
});

it('should return early in parseReplyingMessage when replyingToMessage is missing', () => {
  host.sendArea.replyingToMessage = undefined;

  host.sendArea.replyingText = 'should reset?';
  host.sendArea.replyingFiles = [{ fileName: 'x', url: '' }];

  host.sendArea.parseReplyingMessage();

  expect(host.sendArea.replyingText).toBe('should reset?');
  expect(host.sendArea.replyingFiles.length).toBe(1);
});


it('should return early in parseEditingMessage when editingMessage is missing', () => {
  host.sendArea.editingMessage = undefined;

  host.sendArea.message = 'keep me';
  host.sendArea.editingFiles = [{ fileName: 'x', url: '' }];

  (host.sendArea as any).parseEditingMessage();

  expect(host.sendArea.message).toBe('keep me');
  expect(host.sendArea.editingFiles.length).toBe(1);
});

it('should reset message and editingFiles when editingMessage has no content and no parsed data', () => {
  const msg = { messageId: '123', sender: 'Alice', content: undefined as any };
  host.sendArea.editingMessage = msg;

  host.sendArea.message = 'old';
  host.sendArea.editingFiles = [{ fileName: 'x', url: '' }];

  host.sendArea.ngOnChanges({
    editingMessage: {
      currentValue: msg,
      previousValue: null,
      firstChange: false,
      isFirstChange: () => false
    }
  });

  expect(host.sendArea.message).toBe('');
  expect(host.sendArea.editingFiles.length).toBe(0);
});


it('should return "File" when fileName is empty in getFileExtension', () => {
  expect(host.sendArea.getFileExtension('')).toBe('File');
});


it('should return "File" when fileName has dot but no extension', () => {
  expect(host.sendArea.getFileExtension('file.')).toBe('File');
});

it('should map files from parsed JSON using originalName and set undefined for missing unique ids', () => {
  const msg: any = {
    messageId: 'p1',
    sender: 'Alice',
    content: JSON.stringify({
      text: 'Hello parsed',
      files: [
        { originalName: 'orig.pdf', type: 'application/pdf', size: 123 }
      ]
    })
  };

  host.sendArea.editingMessage = msg;
  host.sendArea.ngOnChanges({
    editingMessage: { currentValue: msg, previousValue: null, firstChange: false, isFirstChange: () => false }
  });

  expect(host.sendArea.message).toBe('Hello parsed');
  expect(host.sendArea.editingFiles.length).toBe(1);

  const ef = host.sendArea.editingFiles[0];
  expect(ef.fileName).toBe('orig.pdf');         
  expect(ef.url).toBe('');                      
  expect(ef.type).toBe('application/pdf');
  expect(ef.size).toBe(123);
  expect(ef.uniqueId).toBeUndefined();          
  expect(ef.uniqueFileName).toBeUndefined();
});

it('should fallback to empty message and empty editingFiles when parsed JSON has no text or files', () => {
  const msg: any = {
    messageId: 'p2',
    sender: 'Bob',
    content: JSON.stringify({ other: 'value' }) 
  };

  host.sendArea.message = 'keep me';
  host.sendArea.editingFiles = [{ fileName: 'x', url: '' }];

  host.sendArea.editingMessage = msg;
  host.sendArea.ngOnChanges({
    editingMessage: { currentValue: msg, previousValue: null, firstChange: false, isFirstChange: () => false }
  });

  expect(host.sendArea.message).toBe('');           
  expect(host.sendArea.editingFiles.length).toBe(0);
});

it('should emit empty content and empty messageId when editingMessage has neither messageId nor id', () => {
  const msg: any = { sender: 'User', content: 'old' }; 
  host.sendArea.editingMessage = msg;

  host.sendArea.message = '   ';   
  host.sendArea.editingFiles = []; 

  (host.sendArea as any).lastSentAt = -999999;

  spyOn(host.sendArea.editComplete, 'emit');

  host.sendArea.emitMessage();

  expect(host.sendArea.editComplete.emit).toHaveBeenCalledWith({
    messageId: '',
    content: ''
  });
});

it('should not update any file and not emit when fileBeingEdited is missing (covers :f branch)', () => {
  host.sendArea.editingMessage = { id: '1', sender: 'u', content: '' };

  host.sendArea.editingFiles = [
    { fileName: 'old.txt', url: '', uniqueId: 'A' }
  ];

  host.sendArea.fileBeingEdited = undefined;

  const newFile = new File(['x'], 'new.txt');
  const event = {
    target: {
      files: [newFile],
      value: '123'
    }
  } as any;

  spyOn(host.sendArea.editFile, 'emit');

  host.sendArea.onEditFileInputChange(event);
  expect(host.sendArea.editingFiles[0].fileName).toBe('old.txt');

  expect(host.sendArea.editFile.emit).not.toHaveBeenCalled();
  expect(event.target.value).toBe('123');
});

it('should use empty sender ("") in reply placeholder when replyingToMessage has no sender', () => {
  host.sendArea.replyingToMessage = { id: '2', content: 'reply' } as any;

  fixture.detectChanges();

  expect(host.sendArea.placeholderText).toBe('Reply to ...');
});

it('should use editingMessage.id when messageId is missing in removeEditingFile', () => {
  host.sendArea.editingMessage = { id: 'ID-999', sender: 'Alice', content: '' };

  host.sendArea.editingFiles = [
    { fileName: 'file.pdf', url: '', uniqueId: 'f1' }
  ];

  spyOn(host.sendArea.removeFileFromEditingMessage, 'emit');

  host.sendArea.removeEditingFile({ fileName: 'file.pdf', url: '', uniqueId: 'f1' });

  expect(host.sendArea.removeFileFromEditingMessage.emit).toHaveBeenCalledWith({
    messageId: 'ID-999',
    uniqueFileName: 'f1'
  });
});

it('should use empty messageId ("") when both messageId and id are missing in removeEditingFile', () => {
  host.sendArea.editingMessage = { sender: 'Alice', content: '' } as any;

  host.sendArea.editingFiles = [
    { fileName: 'file.pdf', url: '', uniqueId: 'f1' }
  ];

  spyOn(host.sendArea.removeFileFromEditingMessage, 'emit');

  host.sendArea.removeEditingFile({ fileName: 'file.pdf', url: '', uniqueId: 'f1' });

  expect(host.sendArea.removeFileFromEditingMessage.emit).toHaveBeenCalledWith({
    messageId: '',
    uniqueFileName: 'f1'
  });
});

it('should apply fallback values in parseReplyingMessage (empty text, unknown filename, empty url)', () => {
  host.sendArea.replyingToMessage = {
    id: '123',
    sender: 'Bob',
    content: JSON.stringify({
      text: '',
      files: [
        { fileName: '', url: null, type: 'file', size: 100 }
      ]
    })
  };

  host.sendArea.parseReplyingMessage();
  expect(host.sendArea.replyingText).toBe('');

  expect(host.sendArea.replyingFiles.length).toBe(1);
  const f = host.sendArea.replyingFiles[0];

  expect(f.fileName).toBe('Unknown file');
  expect(f.url).toBe('');                 
  expect(f.type).toBe('file');
  expect(f.size).toBe(100);
});

it('should apply all fallback values in parseEditingMessage when JSON has empty text and incomplete files', () => {
  const msg: any = {
    messageId: '123',
    sender: 'Alice',
    content: JSON.stringify({
      text: '',                          
      files: [
        {
          fileName: '',                  
          originalName: '',              
          uniqueFileName: '',            
          url: null,                     
          type: 'pdf',
          size: 50,
          uniqueId: undefined,           
        }
      ]
    })
  };

  host.sendArea.editingMessage = msg;

  host.sendArea.ngOnChanges({
    editingMessage: {
      currentValue: msg,
      previousValue: null,
      firstChange: false,
      isFirstChange: () => false
    }
  });

  expect(host.sendArea.message).toBe('');     
  const f = host.sendArea.editingFiles[0];

  expect(f.fileName).toBe('Unknown file');    
  expect(f.url).toBe('');                     
  expect(f.type).toBe('pdf');
  expect(f.size).toBe(50);

  expect(f.uniqueId).toBeUndefined();         
  expect(f.uniqueFileName).toBeUndefined();   
});

it('should fallback to empty editingFiles when parsed JSON contains no files array', () => {
  const msg: any = {
    messageId: 'p-nofiles',
    sender: 'Bob',
    content: JSON.stringify({ text: 'Hello' }) 
  };

  host.sendArea.editingMessage = msg;

  host.sendArea.ngOnChanges({
    editingMessage: {
      currentValue: msg,
      previousValue: null,
      firstChange: false,
      isFirstChange: () => false
    }
  });

  expect(host.sendArea.message).toBe('Hello');
  expect(host.sendArea.editingFiles.length).toBe(0);  
});

it('should cover all fallback branches in parsedFiles mapping inside parseEditingMessage', () => {
  const msg: any = {
    messageId: '123',
    sender: 'Alice',
    content: JSON.stringify({ text: '' }),  
    parsedFiles: [
      {
        fileName: '',            
        originalName: '',        
        uniqueFileName: '',      
        url: null,               
        type: 'pdf',
        size: 10,
        uniqueId: undefined,     
      }
    ]
  };

  host.sendArea.editingMessage = msg;

  host.sendArea.ngOnChanges({
    editingMessage: {
      currentValue: msg,
      previousValue: null,
      firstChange: false,
      isFirstChange: () => false
    }
  });

  expect(host.sendArea.message).toBe('');
  expect(host.sendArea.editingFiles.length).toBe(1);
  const f = host.sendArea.editingFiles[0];
  expect(f.fileName).toBe('Unknown file');
  expect(f.url).toBe('');
  expect(f.type).toBe('pdf');
  expect(f.size).toBe(10);
  expect(f.uniqueId).toBeUndefined();
  expect(f.uniqueFileName).toBeUndefined();
});

it('should fall back to empty string when JSON.parse fails in parsedFiles branch and content is empty', () => {
  const msg: any = {
    messageId: '123',
    sender: 'Alice',
    content: '',   
    parsedFiles: [
      {
        fileName: 'file.pdf',
        url: 'url',
        type: 'pdf',
        size: 100
      }
    ]
  };

  host.sendArea.editingMessage = msg;

  host.sendArea.ngOnChanges({
    editingMessage: {
      currentValue: msg,
      previousValue: null,
      firstChange: false,
      isFirstChange: () => false
    }
  });
  expect(host.sendArea.message).toBe('');
});

it('should use empty messageId ("") when both messageId and id are missing in onEditFileInputChange', () => {
  host.sendArea.editingMessage = { sender: 'A', content: '' } as any; 

  host.sendArea.editingFiles = [
    { fileName: 'old.txt', url: '', uniqueId: 'u1' }
  ];

  host.sendArea.fileBeingEdited = { uniqueId: 'u1', uniqueFileName: undefined } as any;

  const newFile = new File(['123'], 'new.txt', { type: 'text/plain' });

  const event = {
    target: {
      files: [newFile],
      value: 'xxx'
    }
  } as any;

  spyOn(host.sendArea.editFile, 'emit');

  host.sendArea.onEditFileInputChange(event);

  expect(host.sendArea.editFile.emit).toHaveBeenCalledWith({
    messageId: '',
    file: jasmine.any(Object)
  });
});

it('should execute ": f" branch when uniqueId does not match (file unchanged)', () => {
  host.sendArea.editingMessage = { id: '123', sender: 'A', content: '' };

  host.sendArea.editingFiles = [
    { fileName: 'old1.txt', url: '', uniqueId: 'A' },
    { fileName: 'old2.txt', url: '', uniqueId: 'B' }
  ];

  host.sendArea.fileBeingEdited = { uniqueId: 'X', uniqueFileName: undefined } as any;

  const newFile = new File(['xxx'], 'new.txt', { type: 'text/plain' });

  const event = {
    target: {
      files: [newFile],
      value: '111'
    }
  } as any;

  spyOn(host.sendArea.editFile, 'emit');
  host.sendArea.onEditFileInputChange(event);
  expect(host.sendArea.editingFiles[0].fileName).toBe('old1.txt');
  expect(host.sendArea.editingFiles[1].fileName).toBe('old2.txt');
  expect(host.sendArea.editFile.emit).toHaveBeenCalled();
  expect(event.target.value).toBe('');
});

});