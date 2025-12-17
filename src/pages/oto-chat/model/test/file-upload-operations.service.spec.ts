import { TestBed } from '@angular/core/testing';
import { FileUploadOperationsService } from '../file-upload-operations.service';
import { FileUploadStateService } from '../file-state-service';
import { FileUploadApiService } from '../../../../features/file-sender';
import { OtoMessagesService } from '../../api/oto-message/oto-messages.api';
import { ToastService } from '../../../../shared/ui-elements';
import { MessageStateService } from '../message-state.service';
import { DraftStateService } from '../draft-state-service';
import { defer, Observable, of, throwError } from 'rxjs';

describe('FileUploadOperationsService', () => {
  let service: FileUploadOperationsService;
  let fileState: jasmine.SpyObj<FileUploadStateService>;
  let api: jasmine.SpyObj<FileUploadApiService>;
  let msg: jasmine.SpyObj<OtoMessagesService>;
  let toast: jasmine.SpyObj<ToastService>;
  let msgState: jasmine.SpyObj<MessageStateService>;
  let draft: jasmine.SpyObj<DraftStateService>;

  beforeEach(() => {
    fileState = jasmine.createSpyObj(
      'FileUploadStateService',
      [
        'getUploadState',
        'setIsUploading',
        'updateUploadItem',
        'removeUploadItem',
        'closeUploadModal',
        'handleModalFileInput',
        'handleFileDrop',
        'checkUploadSizeLimit',
        'formatFileSize'
      ]
    );

    api = jasmine.createSpyObj('FileUploadApiService', [
      'getUploadUrls',
      'uploadFileWithProgress',
      'getDownloadUrls'
    ]);

    msg = jasmine.createSpyObj('OtoMessagesService', ['sendMessage']);
    toast = jasmine.createSpyObj('ToastService', ['show']);
    msgState = jasmine.createSpyObj('MessageStateService', ['scrollToBottom']);
    draft = jasmine.createSpyObj('DraftStateService', ['clearCurrentDraft']);

    TestBed.configureTestingModule({
      providers: [
        FileUploadOperationsService,
        { provide: FileUploadStateService, useValue: fileState },
        { provide: FileUploadApiService, useValue: api },
        { provide: OtoMessagesService, useValue: msg },
        { provide: ToastService, useValue: toast },
        { provide: MessageStateService, useValue: msgState },
        { provide: DraftStateService, useValue: draft }
      ]
    });

    service = TestBed.inject(FileUploadOperationsService);
  });

  function mockUploadState(overrides: any = {}) {
    fileState.getUploadState.and.returnValue({
      uploadItems: [],
      uploadCaption: '',
      isUploading: false,
      ...overrides
    });
  }

  it('should return error if invalid upload state', async () => {
    mockUploadState({ uploadItems: [] });

    const result = await service.uploadAndSend('chat1', 'nick');
    expect(result.success).toBeFalse();
    expect(result.error).toBe('Invalid upload state');
  });

  it('should return error if >40 files', async () => {
    const largeArray = new Array(41).fill({ file: {} });
    mockUploadState({ uploadItems: largeArray });
    const result = await service.uploadAndSend('chat1', 'nick');

    expect(result.success).toBeFalse();
    expect(toast.show).toHaveBeenCalled();
  });

  it('should upload, send message and close modal', async () => {
    const mockFile = { file: {}, name: 'a.txt' };
    mockUploadState({
      uploadItems: [mockFile],
      uploadCaption: 'caption'
    });

    api.getUploadUrls.and.returnValue(
      Promise.resolve([
        {
          originalName: 'a.txt',
          uniqueFileName: 'uuidA',
          url: 'upload-url'
        }
      ])
    );

    api.uploadFileWithProgress.and.returnValue({
        observable: new Observable(sub => {
          queueMicrotask(() => {
            sub.next({
              progress: 100,
              fileData: {
                fileName: 'a.txt',
                uniqueFileName: 'uuidA',
                url: 'upload-url'
              }
            });
            sub.complete();
          });
        }),
        abort: () => {}
      });
      

    api.getDownloadUrls.and.returnValue(
      Promise.resolve([
        {
          originalName: 'a.txt',
          uniqueFileName: 'uuidA',
          url: 'download-url'
        }
      ])
    );

    msg.sendMessage.and.returnValue(Promise.resolve());

    const res = await service.uploadAndSend('chat1', 'nick');

    expect(res.success).toBeTrue();
    expect(res.uploadedFiles!.length).toBe(1);
    expect(fileState.closeUploadModal).toHaveBeenCalled();
    expect(msgState.scrollToBottom).toHaveBeenCalled();
  });

  it('should handle upload error gracefully', async () => {
    const mockFile = { file: {}, name: 'a.txt' };
    mockUploadState({ uploadItems: [mockFile] });

    api.getUploadUrls.and.returnValue(
      Promise.resolve([
        { originalName: 'a.txt', uniqueFileName: 'u1', url: 'upload-url' }
      ])
    );

    api.uploadFileWithProgress.and.returnValue({
      observable: throwError(() => new Error('fail')),
      abort: () => {}
    });

    const res = await service.uploadAndSend('chat1', 'nick');

    expect(res.success).toBeFalse();
  });

  it('should merge download urls', () => {
    const uploaded = [
      { fileName: 'a', url: 'old', uniqueFileName: 'u1' }
    ];
    const dl = [
      { originalName: 'a', uniqueFileName: 'u1', url: 'new' }
    ];

    const result = (service as any).mergeDownloadUrls(uploaded, dl);
    expect(result[0].url).toBe('new');
  });

  it('should fallback when no download url', () => {
    const uploaded = [
      { fileName: 'a', url: 'old', uniqueFileName: 'u1' }
    ];

    const result = (service as any).mergeDownloadUrls(uploaded, []);
    expect(result[0].url).toBe('old');
  });

  it('should send message with files and clear draft', async () => {
    msg.sendMessage.and.returnValue(Promise.resolve());

    await (service as any).sendMessageWithFiles(
      [
        { fileName: 'a', uniqueFileName: 'u1', url: 'u' }
      ],
      'cap',
      'chat'
    );

    expect(msg.sendMessage).toHaveBeenCalled();
    expect(draft.clearCurrentDraft).toHaveBeenCalled();
  });

  it('cancel should remove item', () => {
    service.cancelFileUpload(1);
    expect(fileState.removeUploadItem).toHaveBeenCalledWith(1);
  });

  it('remove should remove item', () => {
    service.removeFileFromList(2);
    expect(fileState.removeUploadItem).toHaveBeenCalledWith(2);
  });

  it('closeUploadModal should call state', () => {
    service.closeUploadModal();
    expect(fileState.closeUploadModal).toHaveBeenCalled();
  });

  it('should handle modal file input and show errors', () => {
    const input = document.createElement('input');
    input.type = 'file';
    const file = new File(['xxx'], 'a.txt', { type: 'text/plain' });

    Object.defineProperty(input, 'files', { value: [file] });

    const event = { target: input } as any;

    fileState.handleModalFileInput.and.returnValue({
      errors: [
        { fileName: 'a.txt', message: 'err', error: 'type' }
      ],
      validFiles: []
    });

    service.handleModalFileInput(event);

    expect(toast.show).toHaveBeenCalledWith('err', 'error');
  });

  it('should return validFiles and show errors', () => {
    fileState.handleFileDrop.and.returnValue({
      validFiles: [{} as File],
      errors: [
        { fileName: 'a.txt', message: 'bad', error: 'type' }
      ]
    });

    const result = service.handleFileDrop([{} as File], 'chat', '', false);

    expect(result.validFiles.length).toBe(1);
    expect(result.hasErrors).toBeTrue();
    expect(toast.show).toHaveBeenCalledWith('bad', 'error');
  });

  it('should do nothing if no chat or no files', () => {
    const res = service.handleFileDrop([], '', '', false);
    expect(res.validFiles.length).toBe(0);
    expect(res.hasErrors).toBeFalse();
  });

  it('should show over-limit error', () => {
    fileState.checkUploadSizeLimit.and.returnValue({
      isOverLimit: true,
      isNearLimit: false,
      totalSize: 1000,
      maxSize: 500
    });

    fileState.formatFileSize.and.callFake(x => x + 'B');

    service.checkUploadSizeLimit();
    expect(toast.show).toHaveBeenCalled();
  });

  it('should show near-limit warning', () => {
    fileState.checkUploadSizeLimit.and.returnValue({
      isOverLimit: false,
      isNearLimit: true,
      totalSize: 800,
      maxSize: 1000
    });

    fileState.formatFileSize.and.callFake(x => x + 'B');

    service.checkUploadSizeLimit();
    expect(toast.show).toHaveBeenCalled();
  });

  it('should show nothing if within limits', () => {
    fileState.checkUploadSizeLimit.and.returnValue({
      isOverLimit: false,
      isNearLimit: false,
      totalSize: 100,
      maxSize: 1000
    });

    service.checkUploadSizeLimit();
    expect(toast.show).not.toHaveBeenCalled();
  });

  it('should go to catch block when getUploadUrls rejects', async () => {
    const mockFile = { file: {}, name: 'a.txt' };
    mockUploadState({ uploadItems: [mockFile] });
  
    api.getUploadUrls.and.returnValue(Promise.reject('boom'));
  
    const res = await service.uploadAndSend('chat1', 'nick');
  
    expect(res.success).toBeFalse();
    expect(res.error).toBe('boom');
  });
  
  it('should mark file as error when no upload URL', async () => {
    const mockFile = { file: {}, name: 'a.txt' };
    mockUploadState({ uploadItems: [mockFile] });
  
    api.getUploadUrls.and.returnValue(
      Promise.resolve([
        {
          originalName: 'b.txt',
          uniqueFileName: 'uuidB',
          url: 'upload-url'
        }
      ])
    );
  
    api.uploadFileWithProgress.and.throwError("should not be called");
  
    const result = await service.uploadAndSend('chat1', 'nick');
  
    expect(result.success).toBeFalse();
    expect(result.error).toBe('No files uploaded');
  
    expect(fileState.updateUploadItem).toHaveBeenCalledWith(0, { error: 'No URL' });
  });
  
  it('should send original uploaded files when getDownloadUrls fails', async () => {
    const uploadedFiles = [
      { fileName: 'a.txt', uniqueFileName: 'u1', url: 'old-url' }
    ];
  
    api.getDownloadUrls.and.returnValue(Promise.reject('fail'));
  
    const spy = spyOn<any>(service, 'sendMessageWithFiles').and.returnValue(Promise.resolve());
  
    await (service as any).sendUploadedFiles(uploadedFiles, 'caption', 'chat1');
  
    expect(spy).toHaveBeenCalledWith(
      uploadedFiles,  
      'caption',
      'chat1'
    );
  
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should use empty string when caption is falsy', async () => {
    const files = [{ fileName: 'a.txt' }];
  
    msg.sendMessage.and.returnValue(Promise.resolve());
  
    await (service as any).sendMessageWithFiles(files, undefined as any, 'chat1');
  
    expect(msg.sendMessage).toHaveBeenCalledTimes(1);
  
    const json = msg.sendMessage.calls.mostRecent().args[1];
    const parsed = JSON.parse(json);
  
    expect(parsed.text).toBe(''); 
    expect(parsed.files).toEqual(files);
  });  
});
