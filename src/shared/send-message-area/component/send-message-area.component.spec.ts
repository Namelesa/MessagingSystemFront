import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SendAreaComponent } from './send-message-area.component';
import { Component, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface BaseMessage {
  messageId?: string;
  id?: string;
  sender: string;
  content: string;
}

@Component({
  standalone: true,
  imports: [SendAreaComponent, FormsModule],
  template: `<shared-send-message-area 
               [editingMessage]="editingMessage" 
               [replyingToMessage]="replyingToMessage"
               (send)="onSend($event)"
               (editComplete)="onEditComplete($event)"
               (editCancel)="onEditCancel()"
               (replyCancel)="onReplyCancel()">
             </shared-send-message-area>`
})
class TestHostComponent {
  editingMessage?: BaseMessage;
  replyingToMessage?: BaseMessage;
  sentMessage = '';
  editedMessage: any = null;
  editCanceled = false;
  replyCanceled = false;

  @ViewChild(SendAreaComponent) sendArea!: SendAreaComponent;

  onSend(msg: string) { this.sentMessage = msg; }
  onEditComplete(event: any) { this.editedMessage = event; }
  onEditCancel() { this.editCanceled = true; }
  onReplyCancel() { this.replyCanceled = true; }
}

describe('SendAreaComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
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
    expect(host.editedMessage).toEqual({ messageId: 'm1', content: 'new content' });
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
    expect(host.editedMessage).toEqual({ messageId: 'id-456', content: 'modified content' });
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
    
    expect(host.editedMessage).toEqual({ messageId: 'only-id', content: 'modified text' });
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
  
  it('should not emit fileUpload if file type is not allowed', () => {
    const file = new File(['abc'], 'bad.exe', { type: 'application/x-msdownload' });
  
    spyOn(host.sendArea.fileUpload, 'emit');
    const event = { target: { files: [file], value: '' } } as any;
  
    host.sendArea.onFileInputChange(event);
  
    expect(host.sendArea.fileUpload.emit).not.toHaveBeenCalled();
  });
  
  it('should emit only valid files if some are invalid', () => {
    const validFile = new File(['abc'], 'ok.txt', { type: 'text/plain' });
    const invalidFile = new File(['abc'], 'bad.exe', { type: 'application/x-msdownload' });
  
    spyOn(host.sendArea.fileUpload, 'emit');
    host.sendArea.message = 'multi test';
  
    const event = { target: { files: [validFile, invalidFile], value: '' } } as any;
    host.sendArea.onFileInputChange(event);
  
    expect(host.sendArea.fileUpload.emit).toHaveBeenCalledWith({
      files: [validFile],
      message: 'multi test'
    });
  });
  
  it('should reset input value after handling files', () => {
    const file = new File(['abc'], 'file.txt', { type: 'text/plain' });
    const inputMock = { files: [file], value: 'something' };
    const event = { target: inputMock } as any;
  
    host.sendArea.onFileInputChange(event);
  
    expect(inputMock.value).toBe('');
  });
});