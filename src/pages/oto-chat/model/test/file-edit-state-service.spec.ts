import { fakeAsync, flush, flushMicrotasks, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { FileEditStateService } from '../file-edit-state-service';
import { FileUploadApiService } from '../../../../features/file-sender';
import { OtoMessage } from '../../../../entities/oto-message';

describe('FileEditStateService', () => {
  let service: FileEditStateService;
  let api: jasmine.SpyObj<FileUploadApiService>;

  beforeEach(() => {
    const apiSpy = jasmine.createSpyObj('FileUploadApiService', [
      'getUploadUrls',
      'uploadFileWithProgress',
      'getDownloadUrls',
      'deleteSpecificFileVersion'
    ]);

    TestBed.configureTestingModule({
      providers: [
        FileEditStateService,
        { provide: FileUploadApiService, useValue: apiSpy }
      ]
    });

    service = TestBed.inject(FileEditStateService);
    api = TestBed.inject(FileUploadApiService) as jasmine.SpyObj<FileUploadApiService>;
  });

  const mockMessage = (content: any): OtoMessage =>
    ({ id: '1', content: JSON.stringify(content) } as any);

  const mockFile = (name = 'file.txt', type = 'text/plain', size = 10) => {
    return new File(['abc'], name, { type });
  };

  it('should increment and decrement uploading count', () => {
    expect(service.isEditFileUploading).toBeFalse();

    service.incrementEditFileUploadingCount();
    expect(service.isEditFileUploading).toBeTrue();

    service.decrementEditFileUploadingCount();
    expect(service.isEditFileUploading).toBeFalse();
  });

  it('should not decrement below zero', () => {
    service.decrementEditFileUploadingCount();
    expect(service.isEditFileUploading).toBeFalse();
  });

  it('should set and clear editingOriginalFiles', () => {
    service.setEditingOriginalFiles([1, 2, 3]);
    expect(service.editingOriginalFiles.length).toBe(3);

    service.clearEditingOriginalFiles();
    expect(service.editingOriginalFiles.length).toBe(0);
  });

  it('should fully reset state', () => {
    service.setEditingOriginalFiles([5]);
    service.incrementEditFileUploadingCount();

    service.resetState();

    expect(service.editingOriginalFiles.length).toBe(0);
    expect(service.isEditFileUploading).toBeFalse();
  });

  it('should throw if uploadUrls missing file', async () => {
    const file = mockFile('a.jpg');

    api.getUploadUrls.and.returnValue(Promise.resolve([]));

    await expectAsync(
      service.addFilesToEditingMessage(
        mockMessage({ text: '' }),
        [file],
        undefined,
        'nick'
      )
    ).toBeRejected();
  });

  it('should delete files from message', async () => {
    api.deleteSpecificFileVersion.and.returnValue(Promise.resolve(true));

    const msg = mockMessage({
      text: '',
      files: [{ fileName: 'f', uniqueFileName: 'u' }]
    });

    const result = await service.deleteFilesFromMessage(msg, 'nick');

    expect(result.success).toBeTrue();
    expect(api.deleteSpecificFileVersion).toHaveBeenCalledWith('u', 'nick');
  });

  it('should handle deletion failures', async () => {
    api.deleteSpecificFileVersion.and.returnValue(Promise.resolve(false));

    const msg = mockMessage({
      files: [{ fileName: 'f', uniqueFileName: 'u' }]
    });

    const result = await service.deleteFilesFromMessage(msg, 'nick');

    expect(result.success).toBeFalse();
    expect(result.failedFiles.length).toBe(1);
  });

  it('should return success if no files', async () => {
    const msg = mockMessage({ files: [] });
    const result = await service.deleteFilesFromMessage(msg, 'nick');
    expect(result.success).toBeTrue();
  });

  it('should delete removed files', async () => {
    api.deleteSpecificFileVersion.and.returnValue(Promise.resolve(true));

    const original = [{ fileName: 'a', uniqueFileName: '1' }];
    const final: { fileName: string; uniqueFileName: string }[] = []; 

    const result = await service.deleteRemovedFilesAfterEdit(original, final, 'nick');

    expect(result.success).toBeTrue();
    expect(api.deleteSpecificFileVersion).toHaveBeenCalledWith('1', 'nick');
  });

  it('should count failed deletions', async () => {
    api.deleteSpecificFileVersion.and.returnValue(Promise.resolve(false));

    const original = [{ fileName: 'a', uniqueFileName: '1' }];
    const final: { fileName: string; uniqueFileName: string }[] = [];

    const r = await service.deleteRemovedFilesAfterEdit(original, final, 'nick');

    expect(r.success).toBeFalse();
    expect(r.failedCount).toBe(1);
  });

  it('should delete replaced files', async () => {
    api.deleteSpecificFileVersion.and.returnValue(Promise.resolve(true));

    await service.deleteReplacedFiles(['1', '2'], 'nick');

    expect(api.deleteSpecificFileVersion.calls.count()).toBe(2);
  });

  it('should delete temporary files', async () => {
    api.deleteSpecificFileVersion.and.returnValue(Promise.resolve(true));

    const msg = mockMessage({
      text: '',
      files: [
        { fileName: 'a', uniqueFileName: '1', _isTemporary: true },
        { fileName: 'b', uniqueFileName: '2' }
      ]
    });

    await service.cleanupTemporaryFiles(msg, 'nick');

    expect(api.deleteSpecificFileVersion.calls.count()).toBe(1);
    expect(api.deleteSpecificFileVersion).toHaveBeenCalledWith('1', 'nick');
  });

  it('should update file URLs', async () => {
    api.getDownloadUrls.and.returnValue(
      Promise.resolve([{ originalName: 'a', uniqueFileName: 'unique-a', url: 'updated' }])
    );

    const files = [
      { fileName: 'a', url: '', _isTemporary: true, _oldFile: true }
    ];

    const r = await service.updateFileDownloadUrls(files, 'nick');

    expect(r[0].url).toBe('updated');
    expect(r[0]._oldFile).toBeUndefined();
    expect(r[0]._isTemporary).toBeUndefined();
  });

  it('should skip if no files', async () => {
    const r = await service.updateFileDownloadUrls([], 'nick');
    expect(r.length).toBe(0);
  });

  it('should request new URL when existing url contains s3.amazonaws.com', async () => {
    const files = [
      { fileName: 'a', url: 'https://bucket.s3.amazonaws.com/somepath' }
    ];

    api.getDownloadUrls.and.returnValue(
      Promise.resolve([{ originalName: 'a', uniqueFileName: 'unique-a', url: 'fixed-url' }])
    );

    const result = await service.updateFileDownloadUrls(files, 'nick');

    expect(api.getDownloadUrls).toHaveBeenCalledWith(['a'], 'nick');
    expect(result[0].url).toBe('fixed-url');
  });


  it('should log error when getDownloadUrls throws', async () => {
    const files = [{ fileName: 'a', url: '' }];
    const consoleSpy = spyOn(console, 'error');
    api.getDownloadUrls.and.returnValue(Promise.reject('network-error'));

    const result = await service.updateFileDownloadUrls(files, 'nick');

    expect(result.length).toBe(1);
    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleSpy.calls.mostRecent().args[0])
      .toBe('Error getting download URL:');
    expect(consoleSpy.calls.mostRecent().args[1])
      .toBe('network-error');
  });

  describe('cleanupTemporaryFiles', () => {

    it('should return immediately if editingMessage is undefined', async () => {
      const consoleError = spyOn(console, 'error');
      const consoleWarn = spyOn(console, 'warn');

      await service.cleanupTemporaryFiles(undefined, 'nick');

      expect(api.deleteSpecificFileVersion).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();
      expect(consoleWarn).not.toHaveBeenCalled();
    });


    it('should do nothing when there are no temporary files', async () => {
      const message = {
        content: JSON.stringify({ files: [] })
      } as any;

      const consoleWarn = spyOn(console, 'warn');
      const consoleError = spyOn(console, 'error');

      await service.cleanupTemporaryFiles(message, 'nick');

      expect(api.deleteSpecificFileVersion).not.toHaveBeenCalled();
      expect(consoleWarn).not.toHaveBeenCalled();
      expect(consoleError).not.toHaveBeenCalled();
    });


    it('should warn if deleteSpecificFileVersion fails for a temporary file', async () => {
      const message = {
        content: JSON.stringify({
          files: [
            { _isTemporary: true, uniqueFileName: 'abc123' }
          ]
        })
      } as any;

      api.deleteSpecificFileVersion.and.returnValue(Promise.reject('delete-error'));

      const warnSpy = spyOn(console, 'warn');

      await service.cleanupTemporaryFiles(message, 'nick');

      expect(api.deleteSpecificFileVersion)
        .toHaveBeenCalledWith('abc123', 'nick');

      expect(warnSpy).toHaveBeenCalled();

      expect(warnSpy.calls.mostRecent().args[0])
        .toBe('Could not delete temporary file:');

      expect(warnSpy.calls.mostRecent().args[1])
        .toBe('delete-error');
    });


    it('should catch JSON.parse error and log console.error', async () => {
      const message = {
        content: 'INVALID_JSON'
      } as any;

      const errorSpy = spyOn(console, 'error');

      await service.cleanupTemporaryFiles(message, 'nick');

      expect(api.deleteSpecificFileVersion).not.toHaveBeenCalled();

      expect(errorSpy).toHaveBeenCalled();

      expect(errorSpy.calls.mostRecent().args[0])
        .toBe('Error cleaning up temporary files:');
    });
    
    it('should return immediately when uniqueFileNames is empty', async () => {
        api.deleteSpecificFileVersion.calls.reset();
      
        await service.deleteReplacedFiles([], 'nick');
      
        expect(api.deleteSpecificFileVersion).not.toHaveBeenCalled();
      }); 

      it('should log an error when deletion of a replaced file fails', async () => {
        const consoleErr = spyOn(console, 'error');
      
        api.deleteSpecificFileVersion.and.returnValue(Promise.reject('boom'));
      
        await service.deleteReplacedFiles(['file1.jpg'], 'nick');
      
        expect(consoleErr).toHaveBeenCalledWith(
          'Failed to delete replaced file: file1.jpg',
          'boom'
        );
      });      

      it('should log top-level error when Promise.all fails', async () => {
        const errorSpy = spyOn(console, 'error');
        const invalid: any = { length: 1 };
      
        await service.deleteReplacedFiles(invalid, 'nick');
      
        expect(errorSpy.calls.mostRecent().args[0])
          .toBe('Error deleting replaced files:');
      });

      describe('deleteRemovedFilesAfterEdit', () => {
        let service: FileEditStateService;
        let api: jasmine.SpyObj<FileUploadApiService>;
      
        beforeEach(() => {
          api = jasmine.createSpyObj('FileUploadApiService', ['deleteSpecificFileVersion']);
      
          service = new FileEditStateService(api);
        });
      
        it('should return { success: true, failedCount: 0 } when no files removed', async () => {
          const originalFiles = [
            { uniqueFileName: 'a', fileName: 'a' }
          ];
          const finalFiles = [
            { uniqueFileName: 'a', fileName: 'a' }
          ];
      
          const result = await service.deleteRemovedFilesAfterEdit(originalFiles, finalFiles, 'nick');
      
          expect(result).toEqual({ success: true, failedCount: 0 });
        });

        it('should return failure for file without uniqueFileName', async () => {
          const originalFiles = [
            { fileName: 'a', uniqueFileName: null }
          ];
        interface File {
            fileName: string;
            uniqueFileName: string | null;
        }

        const finalFiles: File[] = [];
      
          const result = await service.deleteRemovedFilesAfterEdit(originalFiles, finalFiles, 'nick');
      
          expect(result.success).toBeFalse();
          expect(result.failedCount).toBe(1);
        });

        it('should delete file successfully when backend returns success', async () => {
          api.deleteSpecificFileVersion.and.resolveTo(true);
      
          const originalFiles = [
            { fileName: 'a', uniqueFileName: 'A' }
          ];
        interface File {
            fileName: string;
            uniqueFileName: string | null;
        }

        const finalFiles: File[] = [];
      
          const result = await service.deleteRemovedFilesAfterEdit(originalFiles, finalFiles, 'nick');
      
          expect(api.deleteSpecificFileVersion).toHaveBeenCalledWith('A', 'nick');
          expect(result).toEqual({ success: true, failedCount: 0 });
        });

        it('should capture backend error per-file', async () => {
          api.deleteSpecificFileVersion.and.rejectWith('BACKEND_ERR');
      
          const originalFiles = [
            { fileName: 'a', uniqueFileName: 'A' }
          ];
        interface File {
            fileName: string;
            uniqueFileName: string | null;
        }

        const finalFiles: File[] = [];
      
          const result = await service.deleteRemovedFilesAfterEdit(originalFiles, finalFiles, 'nick');
      
          expect(result.success).toBeFalse();
          expect(result.failedCount).toBe(1);
        });

        it('should log top-level error and return {-1} when outer try fails', async () => {
          const errorSpy = spyOn(console, 'error');
      
          spyOn(Promise, 'all').and.throwError('TOP_LEVEL');
      
          const originalFiles = [
            { fileName: 'a', uniqueFileName: 'A' }
          ];
        interface File {
            fileName: string;
            uniqueFileName: string | null;
        }

        const finalFiles: File[] = [];
      
          const result = await service.deleteRemovedFilesAfterEdit(originalFiles, finalFiles, 'nick');
      
          expect(errorSpy).toHaveBeenCalledWith(
            'Error in deleteRemovedFilesAfterEdit:',
            jasmine.any(Error)
          );
      
          expect(result).toEqual({ success: false, failedCount: -1 });
        });
      });  
      
      it('should NOT delete file when fileName matches between original and final', async () => {
        api.deleteSpecificFileVersion.and.resolveTo(true);
      
        const originalFiles = [
          { fileName: 'sameName', uniqueFileName: 'OLD', uniqueId: 'X' }
        ];
      
        const finalFiles = [
          { fileName: 'sameName', uniqueFileName: 'NEW', uniqueId: 'Y' }
        ];
      
        const result = await service.deleteRemovedFilesAfterEdit(originalFiles, finalFiles, 'nick');
      
        expect(result).toEqual({ success: true, failedCount: 0 });
        expect(api.deleteSpecificFileVersion).not.toHaveBeenCalled();
      });
      
      it('should NOT delete file when uniqueId matches between original and final', async () => {
        api.deleteSpecificFileVersion.and.resolveTo(true);
      
        const originalFiles = [
          { fileName: 'aaa', uniqueFileName: 'OLD', uniqueId: 'XYZ' }
        ];
      
        const finalFiles = [
          { fileName: 'bbb', uniqueFileName: 'NEW', uniqueId: 'XYZ' }
        ];
      
        const result = await service.deleteRemovedFilesAfterEdit(originalFiles, finalFiles, 'nick');
      
        expect(result).toEqual({ success: true, failedCount: 0 });
        expect(api.deleteSpecificFileVersion).not.toHaveBeenCalled();
      });
      
      it('should return success:true when JSON.parse fails', async () => {
        const msg = { content: 'INVALID_JSON' } as any;
      
        const result = await service.deleteFilesFromMessage(msg, 'nick');
      
        expect(result).toEqual({ success: true, failedFiles: [] });
      });
      
      it('should return success:false for a file when deleteSpecificFileVersion throws', async () => {
        api.deleteSpecificFileVersion.and.returnValue(Promise.reject('ERR'));
      
        const msg = {
          content: JSON.stringify({
            files: [
              { fileName: 'a', uniqueFileName: 'A' }
            ]
          })
        } as any;
      
        const result = await service.deleteFilesFromMessage(msg, 'nick');
      
        expect(result.success).toBeFalse();
        expect(result.failedFiles).toEqual(['a']);
      });

      it('should log error and return failure when outer try/catch catches an error', async () => {
        const consoleSpy = spyOn(console, 'error');
      
        spyOn(Promise, 'all').and.throwError('TOPLEVEL');
      
        const msg = {
          content: JSON.stringify({
            files: [{ fileName: 'a', uniqueFileName: 'A' }]
          })
        } as any;
      
        const result = await service.deleteFilesFromMessage(msg, 'nick');
      
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error deleting files from message:',
          jasmine.any(Error)
        );
      
        expect(result).toEqual({ success: false, failedFiles: [] });
      });

      it('should return URL when downloadUrls contains url', async () => {
        api.getDownloadUrls.and.resolveTo([
          { url: 'correct-url', originalName: 'file', uniqueFileName: 'UF' }
        ]);
      
        const url = await (service as any).getDownloadUrl('file', 'nick');
      
        expect(url).toBe('correct-url');
        expect(api.getDownloadUrls).toHaveBeenCalledWith(['file'], 'nick');
      });

      it('should return empty string when downloadUrls is empty', async () => {
        api.getDownloadUrls.and.resolveTo([]);
      
        const url = await (service as any).getDownloadUrl('file', 'nick');
      
        expect(url).toBe('');
      });

      it('should return empty string when downloadUrls is null', async () => {
        api.getDownloadUrls.and.resolveTo(null as any);
      
        const url = await (service as any).getDownloadUrl('file', 'nick');
      
        expect(url).toBe('');
      });
      
      it('should do nothing when there are files but none are temporary', async () => {
        const consoleWarn = spyOn(console, 'warn');
        const consoleError = spyOn(console, 'error');
      
        const message = {
          content: JSON.stringify({
            files: [
              { fileName: 'a', uniqueFileName: '1' },  
              { fileName: 'b', uniqueFileName: '2' }   
            ]
          })
        } as any;
      
        await service.cleanupTemporaryFiles(message, 'nick');
      
        expect(api.deleteSpecificFileVersion).not.toHaveBeenCalled();
        expect(consoleWarn).not.toHaveBeenCalled();
        expect(consoleError).not.toHaveBeenCalled();
      });
      
      it('should resolve with finalFileData when fileData is provided', async () => {
        const mockFile = new File(['abc'], 'a.txt');
        const uploadSubject = new Subject<any>();
      
        api.uploadFileWithProgress.and.returnValue({ observable: uploadSubject, abort: () => {} });
      
        const promise = (service as any).uploadNewFile(mockFile, 'upload-url', 'nick');
      
        uploadSubject.next({ fileData: { fileName: 'a', uniqueFileName: 'U', url: 'URL' } });
      
        uploadSubject.complete();
      
        const result = await promise;
      
        expect(result).toEqual({ fileName: 'a', uniqueFileName: 'U', url: 'URL' });
      });
            
      it('should reject when upload completes without fileData', async () => {
        const mockFile = new File(['abc'], 'a.txt');
        const uploadSubject = new Subject<any>();
      
        api.uploadFileWithProgress.and.returnValue({ observable: uploadSubject, abort: () => {} });
      
        const promise = (service as any).uploadNewFile(mockFile, 'upload-url', 'nick');
      
        uploadSubject.complete();
      
        await expectAsync(promise).toBeRejectedWithError(
          'Upload completed but no file data received'
        );
      });

      it('should reject when upload observable emits error', async () => {
        const mockFile = new File(['abc'], 'a.txt');
        const uploadSubject = new Subject<any>();
      
        api.uploadFileWithProgress.and.returnValue({ observable: uploadSubject, abort: () => {} });
      
        const promise = (service as any).uploadNewFile(mockFile, 'upload-url', 'nick');
      
        uploadSubject.error('UPLOAD_ERROR');
      
        await expectAsync(promise).toBeRejectedWith('UPLOAD_ERROR');
      });          

      it('should replace file successfully', async () => {
        const oldFile = { fileName: 'old.txt', uniqueFileName: 'OLD123' };
        const newFile = new File(['abc'], 'new.txt', { type: 'text/plain' });
      
        api.getUploadUrls.and.resolveTo([{ url: 'upload-url', originalName: 'new.txt', uniqueFileName: 'NEW123' }]);
      
        spyOn(service as any, 'uploadNewFile').and.resolveTo({
          fileName: 'new.txt',
          uniqueFileName: 'NEW123',
          url: 'uploaded-url'
        });
      
        spyOn(service as any, 'getDownloadUrl').and.resolveTo('final-url');
      
        const result = await service.replaceFileInMessage(oldFile, newFile, 'nick');
      
        expect(result.fileName).toBe('new.txt');
        expect(result.uniqueFileName).toBe('NEW123');
        expect(result.url).toBe('final-url');
        expect(result.type).toBe('text/plain');
        expect(result.size).toBe(newFile.size);
        expect(result._isTemporary).toBeTrue();
        expect(result._replacesFile).toBe('OLD123');
      
        expect(result.uniqueId).toMatch(/^FILE_/);
        expect(result._version).toBeGreaterThan(0);
        expect(result._refreshKey).toMatch(/\d+_[a-z0-9]+/);
      });
      
      it('should use oldFile.fileName if uniqueFileName is missing', async () => {
        const oldFile = { fileName: 'oldOnly.txt' }; 
        const newFile = new File(['abc'], 'new.txt', { type: 'text/plain' });
      
        api.getUploadUrls.and.resolveTo([{ url: 'upload-url', originalName: 'new.txt', uniqueFileName: 'NEW123' }]);
        spyOn(service as any, 'uploadNewFile').and.resolveTo({
          fileName: 'new.txt',
          uniqueFileName: 'NEW123',
          url: 'uploaded-url'
        });
        spyOn(service as any, 'getDownloadUrl').and.resolveTo('final-url');
      
        const result = await service.replaceFileInMessage(oldFile, newFile, 'nick');
      
        expect(result._replacesFile).toBe('oldOnly.txt'); 
        expect(result.fileName).toBe('new.txt');
        expect(result.uniqueFileName).toBe('NEW123');
      });      

      it('should throw and log error if upload fails', async () => {
        const oldFile = { fileName: 'old.txt', uniqueFileName: 'OLD123' };
        const newFile = new File(['abc'], 'new.txt', { type: 'text/plain' });
      
        api.getUploadUrls.and.rejectWith('UPLOAD_FAIL');
      
        const consoleSpy = spyOn(console, 'error');
      
        await expectAsync(
          service.replaceFileInMessage(oldFile, newFile, 'nick')
        ).toBeRejectedWith('UPLOAD_FAIL');
      
        expect(consoleSpy).toHaveBeenCalledWith('Error replacing file:', 'UPLOAD_FAIL');
      });
      

      describe('addFilesToEditingMessage', () => {
        let service: FileEditStateService;
        let api: jasmine.SpyObj<FileUploadApiService>;
      
        beforeEach(() => {
          api = jasmine.createSpyObj('FileUploadApiService', [
            'getUploadUrls',
            'uploadFileWithProgress',
            'getDownloadUrls'
          ]);
          service = new FileEditStateService(api);
        });
          
        it('should reject when upload observable emits error', async () => {
          const file = new File(['abc'], 'file.txt');
          const editingMessage: OtoMessage = { 
            messageId: '1', 
            sender: 'testSender', 
            recipient: 'testRecipient', 
            sentAt: new Date(), 
            content: JSON.stringify({ text: '', files: [] }) 
          };
      
          api.getUploadUrls.and.resolveTo([{ originalName: 'file.txt', uniqueFileName: 'U123', url: 'upload-url' }]);
          const uploadSubject = new Subject<any>();
          api.uploadFileWithProgress.and.returnValue({ observable: uploadSubject, abort: () => {} });
      
          const promise = service.addFilesToEditingMessage(editingMessage, [file], undefined, 'nick');
      
          uploadSubject.error('UPLOAD_FAIL');
      
          await expectAsync(promise).toBeRejectedWith('UPLOAD_FAIL');
        });
      
        it('should throw if upload URL is missing', async () => {
          const file = new File(['abc'], 'file.txt');
          const editingMessage: OtoMessage = { 
            messageId: '1', 
            sender: 'testSender', 
            recipient: 'testRecipient', 
            sentAt: new Date(), 
            content: JSON.stringify({ text: '', files: [] }) 
          };
      
          api.getUploadUrls.and.resolveTo([]);
      
          await expectAsync(service.addFilesToEditingMessage(editingMessage, [file], undefined, 'nick'))
            .toBeRejectedWithError(`No URL for file ${file.name}`);
        });

        it('should upload file, collect fileData, fetch downloadUrls and return updated message', fakeAsync(async () => {
            const file = new File(['abc'], 'file.txt', { type: 'text/plain' });
          
            const editingMessage: OtoMessage = {
              messageId: '1',
              sender: 'testSender',
              recipient: 'testRecipient',
              sentAt: new Date(),
              content: JSON.stringify({ text: 'old', files: [] })
            } as any;
          
            api.getUploadUrls.and.returnValue(Promise.resolve([
              { originalName: 'file.txt', uniqueFileName: 'UF', url: 'upload-url' }
            ]));
          
            const upload$ = new Subject<any>();
            api.uploadFileWithProgress.and.returnValue({
              observable: upload$,
              abort: () => {}
            });
          
            api.getDownloadUrls.and.returnValue(Promise.resolve([
              { originalName: 'file.txt', uniqueFileName: 'UF', url: 'final-download-url' }
            ]));
          
            const promise = service.addFilesToEditingMessage(
              editingMessage,
              [file],
              'new text',
              'nick'
            );
          
            flushMicrotasks();
          
            upload$.next({
              progress: 50,
              fileData: {
                fileName: 'file.txt',
                uniqueFileName: 'UF',
                url: 'temp-upload-url'
              }
            });
          
            upload$.complete();
          
            const result = await promise;
            const parsed = JSON.parse(result.content);
          
            expect(parsed.text).toBe('new text');
            expect(parsed.files).toBeDefined();
            expect(parsed.files.length).toBe(1);
            expect(parsed.files[0].fileName).toBe('file.txt');
            expect(parsed.files[0].uniqueFileName).toBe('UF');
            expect(parsed.files[0].url).toBe('final-download-url');
            expect(parsed.files[0].type).toBe('text/plain');
            expect(parsed.files[0].size).toBe(3);
            expect(parsed.files[0].uniqueId).toBe('UF');
          
            expect(api.getUploadUrls).toHaveBeenCalledWith([file]);
            expect(api.uploadFileWithProgress).toHaveBeenCalledWith(file, 'upload-url', 'nick');
            expect(api.getDownloadUrls).toHaveBeenCalledWith(['file.txt']);
          }));


it('should upload file, collect fileData, fetch downloadUrls and return updated message', fakeAsync(() => {
    const file = new File(['abc'], 'file.txt', { type: 'text/plain' });
  
    const editingMessage: OtoMessage = {
      messageId: '1',
      sender: 'testSender',
      recipient: 'testRecipient',
      sentAt: new Date(),
      content: JSON.stringify({ text: 'old', files: [] })
    } as any;
  
    api.getUploadUrls.and.returnValue(Promise.resolve([
      { originalName: 'file.txt', uniqueFileName: 'UF', url: 'upload-url' }
    ]));
  
    const upload$ = new Subject<any>();
    api.uploadFileWithProgress.and.returnValue({
      observable: upload$,
      abort: () => {}
    });
  
    api.getDownloadUrls.and.returnValue(Promise.resolve([
      { originalName: 'file.txt', uniqueFileName: 'UF', url: 'final-download-url' }
    ]));
  
    let result: any = null;
    
    service.addFilesToEditingMessage(
      editingMessage,
      [file],
      'new text',
      'nick'
    ).then(res => result = res);

    flushMicrotasks();

    upload$.next({
      progress: 50,
      fileData: {
        fileName: 'file.txt',
        uniqueFileName: 'UF',
        url: 'temp-upload-url'
      }
    });
  
    upload$.complete();

    flush();
  
    expect(result).not.toBeNull();
    
    const parsed = JSON.parse(result.content);
  
    expect(parsed.text).toBe('new text');
    expect(parsed.files).toBeDefined();
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].fileName).toBe('file.txt');
    expect(parsed.files[0].uniqueFileName).toBe('UF');
    expect(parsed.files[0].url).toBe('final-download-url');
    expect(parsed.files[0].type).toBe('text/plain');
    expect(parsed.files[0].size).toBe(3);
    expect(parsed.files[0].uniqueId).toBe('UF');
  
    expect(api.getUploadUrls).toHaveBeenCalledWith([file]);
    expect(api.uploadFileWithProgress).toHaveBeenCalledWith(file, 'upload-url', 'nick');
    expect(api.getDownloadUrls).toHaveBeenCalledWith(['file.txt']);
  }));
  
it('should upload file, collect fileData, fetch downloadUrls and return updated message', fakeAsync(() => {
    const file = new File(['abc'], 'file.txt', { type: 'text/plain' });
  
    const editingMessage: OtoMessage = {
      messageId: '1',
      sender: 'testSender',
      recipient: 'testRecipient',
      sentAt: new Date(),
      content: JSON.stringify({ text: 'old', files: [] })
    } as any;
  
    api.getUploadUrls.and.returnValue(Promise.resolve([
      { originalName: 'file.txt', uniqueFileName: 'UF', url: 'upload-url' }
    ]));
  
    const upload$ = new Subject<any>();
    api.uploadFileWithProgress.and.returnValue({
      observable: upload$,
      abort: () => {}
    });
  
    api.getDownloadUrls.and.returnValue(Promise.resolve([
      { originalName: 'file.txt', uniqueFileName: 'UF', url: 'final-download-url' }
    ]));
  
    let result: any = null;
    
    service.addFilesToEditingMessage(
      editingMessage,
      [file],
      'new text',
      'nick'
    ).then(res => result = res);
  
    flushMicrotasks();
  
    upload$.next({
      progress: 50,
      fileData: {
        fileName: 'file.txt',
        uniqueFileName: 'UF',
        url: 'temp-upload-url'
      }
    });
    upload$.complete();
  
    flush();
  
    expect(result).not.toBeNull();
    
    const parsed = JSON.parse(result.content);
  
    expect(parsed.text).toBe('new text');
    expect(parsed.files).toBeDefined();
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].fileName).toBe('file.txt');
    expect(parsed.files[0].uniqueFileName).toBe('UF');
    expect(parsed.files[0].url).toBe('final-download-url');
    expect(parsed.files[0].type).toBe('text/plain');
    expect(parsed.files[0].size).toBe(3);
    expect(parsed.files[0].uniqueId).toBe('UF');
  
    expect(api.getUploadUrls).toHaveBeenCalledWith([file]);
    expect(api.uploadFileWithProgress).toHaveBeenCalledWith(file, 'upload-url', 'nick');
    expect(api.getDownloadUrls).toHaveBeenCalledWith(['file.txt']);
  }));

  it('should fallback to default parsed object when editingMessage.content is invalid JSON', fakeAsync(() => {
    const file = new File(['abc'], 'file.txt', { type: 'text/plain' });
  
    const editingMessage: OtoMessage = {
      messageId: '1',
      content: 'INVALID_JSON'
    } as any;
  
    api.getUploadUrls.and.returnValue(Promise.resolve([
      { originalName: 'file.txt', uniqueFileName: 'UF', url: 'upload-url' }
    ]));
  
    const upload$ = new Subject<any>();
    api.uploadFileWithProgress.and.returnValue({ 
      observable: upload$, 
      abort: () => {} 
    });
  
    api.getDownloadUrls.and.returnValue(Promise.resolve([
      { originalName: 'file.txt', uniqueFileName: 'UF', url: 'final-url' }
    ]));
  
    let result: any = null;
    service.addFilesToEditingMessage(editingMessage, [file], 'new text', 'nick')
      .then(res => result = res)
      .catch(err => { throw err; });

    flushMicrotasks();

    upload$.next({
      fileData: { fileName: 'file.txt', uniqueFileName: 'UF', url: 'temp-url' }
    });
    upload$.complete();

    flush();
  
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result.content);
    expect(parsed.text).toBe('new text');
    expect(parsed.files.length).toBe(1);
  }));
  
  it('should create parsed.files array when it does not exist', fakeAsync(() => {
    const file = new File(['abc'], 'file.txt');
  
    const editingMessage: OtoMessage = {
      messageId: '1',
      content: JSON.stringify({ text: 'hello' }) 
    } as any;
  
    api.getUploadUrls.and.returnValue(Promise.resolve([
      { originalName: 'file.txt', uniqueFileName: 'UF', url: 'upload-url' }
    ]));
  
    const upload$ = new Subject<any>();
    api.uploadFileWithProgress.and.returnValue({ 
      observable: upload$, 
      abort: () => {} 
    });
  
    api.getDownloadUrls.and.returnValue(Promise.resolve([
      { originalName: 'file.txt', uniqueFileName: 'UF', url: 'final-url' }
    ]));
  
    let result: any = null;
    service.addFilesToEditingMessage(editingMessage, [file], undefined, 'nick')
      .then(res => result = res)
      .catch(err => { throw err; });
  
    flushMicrotasks();
  
    upload$.next({
      fileData: { fileName: 'file.txt', uniqueFileName: 'UF', url: 'temp-url' }
    });
    upload$.complete();
  
    flush();
  
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result.content);
    expect(Array.isArray(parsed.files)).toBeTrue();
    expect(parsed.files.length).toBe(1);
  }));
                   
          
      });      
  });

  it('should log error when getDownloadUrls fails but continue with uploaded files', fakeAsync(() => {
    const file = new File(['abc'], 'file.txt', { type: 'text/plain' });
  
    const editingMessage: OtoMessage = {
      messageId: '1',
      sender: 'testSender',
      recipient: 'testRecipient',
      sentAt: new Date(),
      content: JSON.stringify({ text: 'old', files: [] })
    } as any;

    api.getUploadUrls.and.returnValue(Promise.resolve([
      { originalName: 'file.txt', uniqueFileName: 'UF', url: 'upload-url' }
    ]));
  
    const upload$ = new Subject<any>();
    api.uploadFileWithProgress.and.returnValue({
      observable: upload$,
      abort: () => {}
    });

    api.getDownloadUrls.and.callFake(() => {
      return new Promise((resolve, reject) => {
        reject('DOWNLOAD_URL_ERROR');
      });
    });
  
    const consoleErrorSpy = spyOn(console, 'error');
  
    let result: any = null;
    
    const promise = service.addFilesToEditingMessage(
      editingMessage,
      [file],
      'new text',
      'nick'
    );
  
    promise.then(res => result = res);

    flushMicrotasks();

    upload$.next({
      progress: 100,
      fileData: {
        fileName: 'file.txt',
        uniqueFileName: 'UF',
        url: 'temp-upload-url'
      }
    });

    upload$.complete();

    flushMicrotasks();
    flush();

    expect(result).not.toBeNull();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error getting download URLs:',
      'DOWNLOAD_URL_ERROR'
    );

    const parsed = JSON.parse(result.content);
    expect(parsed.files.length).toBe(1);
    expect(parsed.files[0].fileName).toBe('file.txt');
    expect(parsed.files[0].url).toBe('temp-upload-url'); 
  }));
  
  it('should use empty string for text when editingMessage.content is empty string', fakeAsync(() => {
    const file = new File(['abc'], 'file.txt', { type: 'text/plain' });
  
    const editingMessage: OtoMessage = {
      messageId: '1',
      sender: 'testSender',
      recipient: 'testRecipient',
      sentAt: new Date(),
      content: ''
    } as any;
  
    api.getUploadUrls.and.returnValue(Promise.resolve([
      { originalName: 'file.txt', uniqueFileName: 'UF', url: 'upload-url' }
    ]));
  
    const upload$ = new Subject<any>();
    api.uploadFileWithProgress.and.returnValue({ 
      observable: upload$, 
      abort: () => {} 
    });
  
    api.getDownloadUrls.and.returnValue(Promise.resolve([
      { originalName: 'file.txt', uniqueFileName: 'UF', url: 'final-url' }
    ]));
  
    let result: any = null;
    service.addFilesToEditingMessage(editingMessage, [file], undefined, 'nick')
      .then(res => result = res);

    flushMicrotasks();
    upload$.next({
      fileData: { fileName: 'file.txt', uniqueFileName: 'UF', url: 'temp-url' }
    });
    upload$.complete();
    flush();
  
    expect(result).not.toBeNull();
    const parsed = JSON.parse(result.content);
    expect(parsed.text).toBe('');
    expect(parsed.files.length).toBe(1);
  }));

  it('should handle case when parsed.files is undefined and use empty array fallback', async () => {
    const message = {
      content: JSON.stringify({ text: 'some text' })
    } as any;
  
    const consoleWarn = spyOn(console, 'warn');
    const consoleError = spyOn(console, 'error');
  
    await service.cleanupTemporaryFiles(message, 'nick');
  
    expect(api.deleteSpecificFileVersion).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });
  
  it('should handle case when parsed.files is null and use empty array fallback', async () => {
    const message = {
      content: JSON.stringify({ files: null })
    } as any;
  
    const consoleWarn = spyOn(console, 'warn');
    const consoleError = spyOn(console, 'error');
  
    await service.cleanupTemporaryFiles(message, 'nick');
  
    expect(api.deleteSpecificFileVersion).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
