import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { DatabaseStats, DeleteVersionResult, FilesGroupedResult, FileUploadApiService } from './file-sender.api';
import { environment } from '../../../shared/api-urls';
import { FileVersion, BatchMappingResult, CreateFileMappingRequest, FileMapping } from '../model/file-sender.model';
import { HttpErrorResponse } from '@angular/common/http';

describe('FileUploadApiService (full)', () => {
  let service: FileUploadApiService;
  let httpMock: HttpTestingController;
  const mappingBase = 'http://localhost:4000/api/mapping';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [FileUploadApiService]
    });

    service = TestBed.inject(FileUploadApiService);
    httpMock = TestBed.inject(HttpTestingController);

    (window as any).fetch = jasmine.createSpy('fetch');
  });

  afterEach(() => {
    httpMock.verify();
  });

describe('getUploadUrls', () => {
    it('should successfully get upload URLs for files', async () => {
      const files = [
        new File(['content1'], 'file1.txt'),
        new File(['content2'], 'file2.txt')
      ];
  
      const promise = service.getUploadUrls(files);
  
      const req = httpMock.expectOne(`${environment.fileloaderUrl}get-load-file-url`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBeTrue();
      expect(req.request.withCredentials).toBeTrue();
  
      req.flush([
        { originalName: 'file1.txt', uniqueFileName: 'unique1.txt', url: 'https://s3/unique1.txt' },
        { originalName: 'file2.txt', uniqueFileName: 'unique2.txt', url: 'https://s3/unique2.txt' }
      ]);
  
      const result = await promise;
      expect(result.length).toBe(2);
      expect(result[0].originalName).toBe('file1.txt');
      expect(result[0].uniqueFileName).toBe('unique1.txt');
      expect(result[0].url).toBe('https://s3/unique1.txt');
    });
  
    it('should throw error when more than 40 files provided', async () => {
      const files = Array.from({ length: 41 }, (_, i) => new File([''], `file${i}.txt`));
  
      await expectAsync(service.getUploadUrls(files))
        .toBeRejectedWithError('Max 40 files allowed');
    });
  
    it('should propagate http errors', async () => {
      const files = [new File([''], 'test.txt')];
      
      const promise = service.getUploadUrls(files);
      
      const req = httpMock.expectOne(`${environment.fileloaderUrl}get-load-file-url`);
      req.flush({ message: 'Server error' }, { status: 500, statusText: 'Internal Server Error' });
  
      await expectAsync(promise).toBeRejected();
    });
  });
  
  describe('uploadFileToS3', () => {
    it('should successfully upload file and create mapping', async () => {
      const file = new File(['content'], 'test.txt');
      const url = 'https://s3/upload-url';
      const userId = 'user123';
  
      (window as any).fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
      );
  
      spyOn<any>(service, 'createMappingAfterUpload').and.returnValue(
        Promise.resolve({ fileName: 'test.txt', uniqueFileName: 'unique.txt', url })
      );
  
      await service.uploadFileToS3(file, url, userId);
  
      expect((window as any).fetch).toHaveBeenCalledWith(url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });
      expect((service as any).createMappingAfterUpload).toHaveBeenCalledWith(file, url, userId);
    });
  
    it('should throw error when fetch response is not ok', async () => {
      const file = new File(['content'], 'test.txt');
      const url = 'https://s3/upload-url';
  
      (window as any).fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({ ok: false, status: 403, statusText: 'Forbidden' })
      );
  
      await expectAsync(service.uploadFileToS3(file, url, 'user1'))
        .toBeRejectedWithError('Upload failed for test.txt: 403 Forbidden');
    });
  
    it('should propagate fetch network errors', async () => {
      const file = new File(['content'], 'test.txt');
      const url = 'https://s3/upload-url';
  
      (window as any).fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.reject(new Error('Network failure'))
      );
  
      await expectAsync(service.uploadFileToS3(file, url, 'user1'))
        .toBeRejectedWithError('Network failure');
    });
  
    it('should propagate mapping creation errors', async () => {
      const file = new File(['content'], 'test.txt');
      const url = 'https://s3/upload-url';
  
      (window as any).fetch = jasmine.createSpy('fetch').and.returnValue(
        Promise.resolve({ ok: true, status: 200, statusText: 'OK' })
      );
  
      spyOn<any>(service, 'createMappingAfterUpload').and.returnValue(
        Promise.reject(new Error('Mapping failed'))
      );
  
      await expectAsync(service.uploadFileToS3(file, url, 'user1'))
        .toBeRejectedWithError('Mapping failed');
    });
  });
  
  describe('uploadFileWithProgress', () => {
    let mockXhr: any;
  
    beforeEach(() => {
      mockXhr = {
        open: jasmine.createSpy('open'),
        setRequestHeader: jasmine.createSpy('setRequestHeader'),
        send: jasmine.createSpy('send'),
        abort: jasmine.createSpy('abort'),
        upload: {},
        status: 0,
        statusText: ''
      };
  
      spyOn(window as any, 'XMLHttpRequest').and.returnValue(mockXhr);
    });
  
    it('should emit progress updates during upload', (done) => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const url = 'https://s3/upload';
      const userId = 'user1';
  
      spyOn<any>(service, 'createMappingAfterUpload').and.returnValue(
        Promise.resolve({ fileName: 'test.txt', uniqueFileName: 'unique.txt', url })
      );
  
      const { observable } = service.uploadFileWithProgress(file, url, userId);
  
      const progressValues: number[] = [];
  
      observable.subscribe({
        next: (data) => {
          progressValues.push(data.progress);
        },
        complete: () => {
          expect(progressValues).toContain(50);
          expect(progressValues).toContain(100);
          done();
        }
      });
  
      const progressEvent = { lengthComputable: true, loaded: 50, total: 100 };
      mockXhr.upload.onprogress(progressEvent);
  
      mockXhr.status = 200;
      mockXhr.onload();
    });
  
    it('should emit fileData on successful upload', (done) => {
      const file = new File(['content'], 'test.txt');
      const url = 'https://s3/upload';
      const fileData = { fileName: 'test.txt', uniqueFileName: 'unique.txt', url };
  
      spyOn<any>(service, 'createMappingAfterUpload').and.returnValue(Promise.resolve(fileData));
  
      const { observable } = service.uploadFileWithProgress(file, url, 'user1');
  
      observable.subscribe({
        next: (data) => {
          if (data.progress === 100 && data.fileData) {
            expect(data.fileData).toEqual(fileData);
            done();
          }
        }
      });
  
      mockXhr.status = 200;
      mockXhr.onload();
    });
  
    it('should complete even if mapping creation fails', (done) => {
      const file = new File(['content'], 'test.txt');
      
      spyOn<any>(service, 'createMappingAfterUpload').and.returnValue(
        Promise.reject(new Error('Mapping failed'))
      );
      spyOn(console, 'error');
  
      const { observable } = service.uploadFileWithProgress(file, 'https://s3/upload', 'user1');
  
      observable.subscribe({
        next: (data) => {
          if (data.progress === 100) {
            expect(data.fileData).toBeUndefined();
          }
        },
        complete: () => {
          expect(console.error).toHaveBeenCalled();
          done();
        }
      });
  
      mockXhr.status = 200;
      mockXhr.onload();
    });
  
    it('should emit error on upload failure', (done) => {
      const file = new File(['content'], 'test.txt');
      const { observable } = service.uploadFileWithProgress(file, 'https://s3/upload', 'user1');
  
      observable.subscribe({
        error: (err) => {
          expect(err.message).toContain('Upload failed');
          done();
        }
      });
  
      mockXhr.status = 500;
      mockXhr.statusText = 'Server Error';
      mockXhr.onload();
    });
  
    it('should emit error on network error', (done) => {
      const file = new File(['content'], 'test.txt');
      const { observable } = service.uploadFileWithProgress(file, 'https://s3/upload', 'user1');
  
      observable.subscribe({
        error: (err) => {
          expect(err.message).toBe('Network error during upload');
          done();
        }
      });
  
      mockXhr.onerror();
    });
  
    it('should emit error on abort', (done) => {
      const file = new File(['content'], 'test.txt');
      const { observable } = service.uploadFileWithProgress(file, 'https://s3/upload', 'user1');
  
      observable.subscribe({
        error: (err) => {
          expect(err.message).toBe('Upload aborted');
          done();
        }
      });
  
      mockXhr.onabort();
    });
  
    it('should set Content-Type header when file has type', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const { observable } = service.uploadFileWithProgress(file, 'https://s3/upload', 'user1');
  
      observable.subscribe();
  
      expect(mockXhr.open).toHaveBeenCalledWith('PUT', 'https://s3/upload', true);
      expect(mockXhr.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
      expect(mockXhr.send).toHaveBeenCalledWith(file);
    });
  
    it('should not set Content-Type header when file has no type', () => {
      const file = new File(['content'], 'test.txt');
      const { observable } = service.uploadFileWithProgress(file, 'https://s3/upload', 'user1');
  
      observable.subscribe();
  
      expect(mockXhr.setRequestHeader).not.toHaveBeenCalled();
    });
  
    it('should abort upload when abort is called', () => {
      const file = new File(['content'], 'test.txt');
      const { observable, abort } = service.uploadFileWithProgress(file, 'https://s3/upload', 'user1');
  
      observable.subscribe({
        error: () => {}
      });
  
      abort();
  
      expect(mockXhr.abort).toHaveBeenCalled();
    });
  
    it('should handle abort gracefully when called multiple times', () => {
      const file = new File(['content'], 'test.txt');
      const { observable, abort } = service.uploadFileWithProgress(file, 'https://s3/upload', 'user1');
  
      observable.subscribe({
        error: () => {}
      });
  
      abort();
      
      mockXhr.abort.calls.reset();
      
      abort();

      expect(mockXhr.abort).not.toHaveBeenCalled();
    });
  
    it('should ignore progress events when not lengthComputable', (done) => {
      const file = new File(['content'], 'test.txt');
      
      spyOn<any>(service, 'createMappingAfterUpload').and.returnValue(
        Promise.resolve({ fileName: 'test.txt', uniqueFileName: 'unique.txt', url: 'url' })
      );
  
      const { observable } = service.uploadFileWithProgress(file, 'https://s3/upload', 'user1');
  
      const progressValues: number[] = [];
  
      observable.subscribe({
        next: (data) => {
          progressValues.push(data.progress);
        },
        complete: () => {
          expect(progressValues.length).toBe(1);
          expect(progressValues).toContain(100);
          done();
        }
      });
  
      mockXhr.upload.onprogress({ lengthComputable: false });
  
      mockXhr.status = 200;
      mockXhr.onload();
    });
  });
  
  describe('uploadMultipleFiles', () => {
    it('should successfully upload all files', async () => {
      const files = [
        new File(['content1'], 'file1.txt'),
        new File(['content2'], 'file2.txt')
      ];
  
      spyOn(service, 'getUploadUrls').and.returnValue(Promise.resolve([
        { originalName: 'file1.txt', uniqueFileName: 'u1.txt', url: 'https://s3/u1' },
        { originalName: 'file2.txt', uniqueFileName: 'u2.txt', url: 'https://s3/u2' }
      ]));
  
      spyOn(service, 'uploadFileToS3').and.returnValue(Promise.resolve());
  
      const result = await service.uploadMultipleFiles(files, 'user1');
  
      expect(result.successful).toEqual(['file1.txt', 'file2.txt']);
      expect(result.failed).toEqual([]);
      expect(service.uploadFileToS3).toHaveBeenCalledTimes(2);
    });
  
    it('should mark files as failed when fileUrl not found', async () => {
      const files = [
        new File(['content1'], 'file1.txt'),
        new File(['content2'], 'file2.txt')
      ];
  
      spyOn(service, 'getUploadUrls').and.returnValue(Promise.resolve([
        { originalName: 'file1.txt', uniqueFileName: 'u1.txt', url: 'https://s3/u1' }
      ]));
  
      spyOn(service, 'uploadFileToS3').and.returnValue(Promise.resolve());
  
      const result = await service.uploadMultipleFiles(files, 'user1');
  
      expect(result.successful).toEqual(['file1.txt']);
      expect(result.failed).toEqual(['file2.txt']);
    });
  
    it('should mark files as failed when upload throws error', async () => {
      const files = [
        new File(['content1'], 'file1.txt'),
        new File(['content2'], 'file2.txt')
      ];
  
      spyOn(service, 'getUploadUrls').and.returnValue(Promise.resolve([
        { originalName: 'file1.txt', uniqueFileName: 'u1.txt', url: 'https://s3/u1' },
        { originalName: 'file2.txt', uniqueFileName: 'u2.txt', url: 'https://s3/u2' }
      ]));
  
      spyOn(service, 'uploadFileToS3').and.callFake((file: File) => {
        if (file.name === 'file2.txt') {
          return Promise.reject(new Error('Upload failed'));
        }
        return Promise.resolve();
      });
  
      spyOn(console, 'error');
  
      const result = await service.uploadMultipleFiles(files, 'user1');
  
      expect(result.successful).toEqual(['file1.txt']);
      expect(result.failed).toEqual(['file2.txt']);
      expect(console.error).toHaveBeenCalled();
    });
  
    it('should throw error when getUploadUrls fails', async () => {
      const files = [new File(['content'], 'test.txt')];
  
      spyOn(service, 'getUploadUrls').and.returnValue(
        Promise.reject(new Error('Failed to get URLs'))
      );
      spyOn(console, 'error');
  
      await expectAsync(service.uploadMultipleFiles(files, 'user1'))
        .toBeRejectedWithError('Failed to get URLs');
  
      expect(console.error).toHaveBeenCalled();
    });
  
    it('should continue uploading remaining files after one fails', async () => {
      const files = [
        new File(['content1'], 'file1.txt'),
        new File(['content2'], 'file2.txt'),
        new File(['content3'], 'file3.txt')
      ];
  
      spyOn(service, 'getUploadUrls').and.returnValue(Promise.resolve([
        { originalName: 'file1.txt', uniqueFileName: 'u1.txt', url: 'https://s3/u1' },
        { originalName: 'file2.txt', uniqueFileName: 'u2.txt', url: 'https://s3/u2' },
        { originalName: 'file3.txt', uniqueFileName: 'u3.txt', url: 'https://s3/u3' }
      ]));
  
      spyOn(service, 'uploadFileToS3').and.callFake((file: File) => {
        if (file.name === 'file2.txt') {
          return Promise.reject(new Error('Upload failed'));
        }
        return Promise.resolve();
      });
  
      spyOn(console, 'error');
  
      const result = await service.uploadMultipleFiles(files, 'user1');
  
      expect(result.successful).toEqual(['file1.txt', 'file3.txt']);
      expect(result.failed).toEqual(['file2.txt']);
      expect(service.uploadFileToS3).toHaveBeenCalledTimes(3);
    });

    it('should continue uploading remaining files after one fails', async () => {
        const files = [
          new File(['content1'], 'file1.txt'),
          new File(['content2'], 'file2.txt'),
          new File(['content3'], 'file3.txt')
        ];
      
        spyOn(service, 'getUploadUrls').and.returnValue(Promise.resolve([
          { originalName: 'file1.txt', uniqueFileName: 'u1.txt', url: 'https://s3/u1' },
          { originalName: 'file2.txt', uniqueFileName: 'u2.txt', url: 'https://s3/u2' },
          { originalName: 'file3.txt', uniqueFileName: 'u3.txt', url: 'https://s3/u3' }
        ]));
      
        spyOn(service, 'uploadFileToS3').and.callFake((file: File) => {
          if (file.name === 'file2.txt') {
            return Promise.reject(new Error('Upload failed'));
          }
          return Promise.resolve();
        });
      
        spyOn(console, 'error');
      
        const result = await service.uploadMultipleFiles(files, 'user1');
      
        expect(result.successful).toEqual(['file1.txt', 'file3.txt']);
        expect(result.failed).toEqual(['file2.txt']);
      
        expect(service.uploadFileToS3).toHaveBeenCalledTimes(3);
        expect(console.error).toHaveBeenCalled();
      });      
  });

  describe('getDownloadUrls', () => {
    function mockFileVersion(
      originalName: string,
      uniqueFileName: string,
      version: number
    ): FileVersion {
      return {
        id: 'id_' + version,
        originalName,
        uniqueFileName,
        uploadedAt: '2024-01-01T00:00:00Z',
        version,
        userId: 'user1',
        createdAt: '2024-01-01T00:00:00Z'
      };
    }
  
    it('should return empty array when no mappings exist', async () => {
      spyOn(service, 'getBatchFileMappings').and.returnValue(
        Promise.resolve({
          mappings: [],
          errors: [],
          totalProcessed: 0,
          successful: 0
        } as BatchMappingResult)
      );
  
      const result = await service.getDownloadUrls(['file1.txt']);
  
      expect(result).toEqual([]);
    });
  
    it('should return download URLs for all versions sorted by date', async () => {
      const mappings = [
        mockFileVersion('file1.txt', 'unique1_v1.txt', 1),
        mockFileVersion('file1.txt', 'unique1_v2.txt', 2),
        mockFileVersion('file2.txt', 'unique2_v1.txt', 1)
      ];
  
      spyOn(service, 'getBatchFileMappings').and.returnValue(
        Promise.resolve({
          mappings,
          errors: [],
          totalProcessed: 3,
          successful: 3
        } as BatchMappingResult)
      );
  
      const promise = service.getDownloadUrls(['file1.txt', 'file2.txt'], 'user1');

      await Promise.resolve();
  
      const req = httpMock.expectOne(req => 
        req.url.includes('get-download-file-url')
      );
      
      req.flush([
        { fileName: 'unique1_v1.txt', url: 'https://s3/unique1_v1.txt' },
        { fileName: 'unique1_v2.txt', url: 'https://s3/unique1_v2.txt' },
        { fileName: 'unique2_v1.txt', url: 'https://s3/unique2_v1.txt' }
      ]);
  
      const result = await promise;
  
      expect(result.length).toBe(3);
    });
  
    it('should handle file not found in allVersionsMap', async () => {
      const mappings = [mockFileVersion('file1.txt', 'unique1.txt', 1)];
  
      spyOn(service, 'getBatchFileMappings').and.returnValue(
        Promise.resolve({
          mappings,
          errors: [],
          totalProcessed: 1,
          successful: 1
        } as BatchMappingResult)
      );
  
      const promise = service.getDownloadUrls(['file1.txt']);
      
      await Promise.resolve();
  
      const req = httpMock.expectOne(req => 
        req.url.includes('get-download-file-url')
      );
      
      req.flush([
        { fileName: 'unknown.txt', url: 'https://s3/unknown.txt' }
      ]);
  
      const result = await promise;
  
      expect(result.length).toBe(1);
      expect(result[0].originalName).toBe('unknown.txt');
    });
  
    it('should propagate errors from getBatchFileMappings', async () => {
      spyOn(service, 'getBatchFileMappings').and.returnValue(
        Promise.reject(new Error('Batch failed'))
      );
  
      await expectAsync(service.getDownloadUrls(['file1.txt']))
        .toBeRejectedWithError('Batch failed');
    });
  
    it('should propagate errors from http request', async () => {
      const mappings = [mockFileVersion('file1.txt', 'unique1.txt', 1)];
  
      spyOn(service, 'getBatchFileMappings').and.returnValue(
        Promise.resolve({
          mappings,
          errors: [],
          totalProcessed: 1,
          successful: 1
        } as BatchMappingResult)
      );
  
      const promise = service.getDownloadUrls(['file1.txt']);
      
      await Promise.resolve();
  
      const req = httpMock.expectOne(req => 
        req.url.includes('get-download-file-url')
      );
      
      req.flush({ message: 'Server error' }, { status: 500, statusText: 'Error' });
  
      await expectAsync(promise).toBeRejected();
    });

    it('should return empty array when batchResult.mappings is undefined', async () => {
      spyOn(service, 'getBatchFileMappings').and.returnValue(
        Promise.resolve({
          mappings: undefined as any,
          errors: [],
          totalProcessed: 0,
          successful: 0
        } as BatchMappingResult)
      );
    
      const result = await service.getDownloadUrls(['file1.txt']);
    
      expect(result).toEqual([]);
    });
  });

  describe('getLatestVersionDownloadUrls', () => {
    function mockFileVersion(
      originalName: string,
      uniqueFileName: string,
      version: number
    ): FileVersion {
      return {
        id: 'id_' + version,
        originalName,
        uniqueFileName,
        uploadedAt: '2024-01-01T00:00:00Z',
        version,
        userId: 'user1',
        createdAt: '2024-01-01T00:00:00Z'
      };
    }
  
    it('should return empty array when no mappings exist', async () => {
      spyOn(service, 'getBatchFileMappings').and.returnValue(
        Promise.resolve({
          mappings: [],
          errors: [],
          totalProcessed: 0,
          successful: 0
        } as BatchMappingResult)
      );
  
      const result = await service.getLatestVersionDownloadUrls(['file1.txt']);
  
      expect(result).toEqual([]);
    });
  
    it('should return empty array when batchResult.mappings is undefined', async () => {
      spyOn(service, 'getBatchFileMappings').and.returnValue(
        Promise.resolve({
          mappings: undefined as any,
          errors: [],
          totalProcessed: 0,
          successful: 0
        } as BatchMappingResult)
      );
  
      const result = await service.getLatestVersionDownloadUrls(['file1.txt']);
  
      expect(result).toEqual([]);
    });
  
    it('should return download URLs only for latest versions', async () => {
      const mappings = [
        mockFileVersion('file1.txt', 'unique1_v1.txt', 1),
        mockFileVersion('file1.txt', 'unique1_v3.txt', 3),
        mockFileVersion('file1.txt', 'unique1_v2.txt', 2),
        mockFileVersion('file2.txt', 'unique2_v1.txt', 1)
      ];
  
      spyOn(service, 'getBatchFileMappings').and.returnValue(
        Promise.resolve({
          mappings,
          errors: [],
          totalProcessed: 4,
          successful: 4
        } as BatchMappingResult)
      );
  
      const promise = service.getLatestVersionDownloadUrls(['file1.txt', 'file2.txt'], 'user1');
  
      await Promise.resolve();
  
      const req = httpMock.expectOne(req => 
        req.url.includes('get-download-file-url')
      );
      
      expect(req.request.params.getAll('fileNames')).toEqual(['unique1_v3.txt', 'unique2_v1.txt']);
      
      req.flush([
        { fileName: 'unique1_v3.txt', url: 'https://s3/unique1_v3.txt' },
        { fileName: 'unique2_v1.txt', url: 'https://s3/unique2_v1.txt' }
      ]);
  
      const result = await promise;
  
      expect(result.length).toBe(2);
      expect(result[0].originalName).toBe('file1.txt');
      expect(result[0].uniqueFileName).toBe('unique1_v3.txt');
      expect(result[1].originalName).toBe('file2.txt');
      expect(result[1].uniqueFileName).toBe('unique2_v1.txt');
    });
  
    it('should handle file not found in latestVersionsMap', async () => {
      const mappings = [mockFileVersion('file1.txt', 'unique1.txt', 1)];
  
      spyOn(service, 'getBatchFileMappings').and.returnValue(
        Promise.resolve({
          mappings,
          errors: [],
          totalProcessed: 1,
          successful: 1
        } as BatchMappingResult)
      );
  
      const promise = service.getLatestVersionDownloadUrls(['file1.txt']);
      
      await Promise.resolve();
  
      const req = httpMock.expectOne(req => 
        req.url.includes('get-download-file-url')
      );
      
      req.flush([
        { fileName: 'unknown.txt', url: 'https://s3/unknown.txt' }
      ]);
  
      const result = await promise;
  
      expect(result.length).toBe(1);
      expect(result[0].originalName).toBe('unknown.txt');
      expect(result[0].uniqueFileName).toBe('unknown.txt');
    });
  
    it('should propagate errors from getBatchFileMappings', async () => {
      spyOn(service, 'getBatchFileMappings').and.returnValue(
        Promise.reject(new Error('Batch failed'))
      );
  
      await expectAsync(service.getLatestVersionDownloadUrls(['file1.txt']))
        .toBeRejectedWithError('Batch failed');
    });
  
    it('should propagate errors from http request', async () => {
      const mappings = [mockFileVersion('file1.txt', 'unique1.txt', 1)];
  
      spyOn(service, 'getBatchFileMappings').and.returnValue(
        Promise.resolve({
          mappings,
          errors: [],
          totalProcessed: 1,
          successful: 1
        } as BatchMappingResult)
      );
  
      const promise = service.getLatestVersionDownloadUrls(['file1.txt']);
      
      await Promise.resolve();
  
      const req = httpMock.expectOne(req => 
        req.url.includes('get-download-file-url')
      );
      
      req.flush({ message: 'Server error' }, { status: 500, statusText: 'Error' });
  
      await expectAsync(promise).toBeRejected();
    });
  
    it('should log error and rethrow when error occurs', async () => {
      spyOn(service, 'getBatchFileMappings').and.returnValue(
        Promise.reject(new Error('Network error'))
      );
      
      spyOn(console, 'error');
  
      await expectAsync(service.getLatestVersionDownloadUrls(['file1.txt']))
        .toBeRejectedWithError('Network error');
      
      expect(console.error).toHaveBeenCalledWith('❌ Error in getLatestVersionDownloadUrls:', jasmine.any(Error));
    });
  });

  describe('deleteFiles', () => {
    it('should successfully delete multiple files', async () => {
      const fileNames = ['file1.txt', 'file2.txt'];
  
      const promise = service.deleteFiles(fileNames);
  
      const req = httpMock.expectOne(req => 
        req.url.includes('delete-file')
      );
      
      expect(req.request.method).toBe('DELETE');
      expect(req.request.params.getAll('fileName')).toEqual(fileNames);
      expect(req.request.withCredentials).toBeTrue();
  
      req.flush(null);
  
      await promise;
    });
  
    it('should return early when fileNames is empty array', async () => {
      await service.deleteFiles([]);
  
      httpMock.expectNone(req => req.url.includes('delete-file'));
    });
  
    it('should return early when fileNames is null', async () => {
      await service.deleteFiles(null as any);
  
      httpMock.expectNone(req => req.url.includes('delete-file'));
    });
  
    it('should return early when fileNames is undefined', async () => {
      await service.deleteFiles(undefined as any);
  
      httpMock.expectNone(req => req.url.includes('delete-file'));
    });
  
    it('should propagate http errors', async () => {
      const fileNames = ['test.txt'];
  
      const promise = service.deleteFiles(fileNames);
  
      const req = httpMock.expectOne(req => 
        req.url.includes('delete-file')
      );
      
      req.flush({ message: 'Delete failed' }, { status: 500, statusText: 'Error' });
  
      await expectAsync(promise).toBeRejected();
    });
  });
  
  describe('deleteFileVersion', () => {
    it('should successfully delete file version', async () => {
      const originalName = 'test.txt';
      const userId = 'user123';
      const uniqueFileName = 'unique_test.txt';
      const expectedResult: DeleteVersionResult = {
        success: true,
        deletedVersion: uniqueFileName,
        remainingVersions: 2
      };
  
      const promise = service.deleteFileVersion(originalName, userId, uniqueFileName);
  
      const req = httpMock.expectOne(
        `${mappingBase}/${encodeURIComponent(originalName)}/${encodeURIComponent(userId)}/${encodeURIComponent(uniqueFileName)}`
      );
      
      expect(req.request.method).toBe('DELETE');
  
      req.flush(expectedResult);
  
      const result = await promise;
      
      expect(result).toEqual(expectedResult);
    });
  
    it('should properly encode special characters in URL', async () => {
      const originalName = 'test file.txt';
      const userId = 'user@123';
      const uniqueFileName = 'unique test.txt';
  
      const promise = service.deleteFileVersion(originalName, userId, uniqueFileName);
  
      const req = httpMock.expectOne(
        `${mappingBase}/test%20file.txt/user%40123/unique%20test.txt`
      );
      
      req.flush({ success: true, deletedVersion: uniqueFileName, remainingVersions: 0 });
  
      await promise;
    });
  
    it('should propagate http errors', async () => {
      const promise = service.deleteFileVersion('test.txt', 'user1', 'unique.txt');
  
      const req = httpMock.expectOne(req => 
        req.url.includes(mappingBase)
      );
      
      req.flush({ message: 'Version not found' }, { status: 404, statusText: 'Not Found' });
  
      await expectAsync(promise).toBeRejected();
    });
  });

  describe('deleteSpecificFileVersion', () => {
    it('should successfully delete file version', async () => {
      const uniqueFileName = 'timestamp_test.txt';
      const userId = 'user123';
  
      spyOn(service, 'deleteFiles').and.returnValue(Promise.resolve());
      spyOn(service, 'deleteFileVersion').and.returnValue(Promise.resolve({
        success: true,
        deletedVersion: uniqueFileName,
        remainingVersions: 1
      }));
  
      const result = await service.deleteSpecificFileVersion(uniqueFileName, userId);
  
      expect(result).toBeTrue();
      expect(service.deleteFiles).toHaveBeenCalledWith([uniqueFileName]);
      expect(service.deleteFileVersion).toHaveBeenCalledWith('test.txt', userId, uniqueFileName);
    });
  
    it('should return false when uniqueFileName has invalid format', async () => {
      const uniqueFileName = 'nounderscorefile.txt';
      const userId = 'user123';
  
      spyOn(service, 'deleteFiles').and.returnValue(Promise.resolve());
  
      const result = await service.deleteSpecificFileVersion(uniqueFileName, userId);
  
      expect(result).toBeFalse();
    });
  
    it('should return true even when deleteFileVersion fails', async () => {
      const uniqueFileName = 'timestamp_test.txt';
      const userId = 'user123';
  
      spyOn(service, 'deleteFiles').and.returnValue(Promise.resolve());
      spyOn(service, 'deleteFileVersion').and.returnValue(
        Promise.reject(new Error('Delete version failed'))
      );
  
      const result = await service.deleteSpecificFileVersion(uniqueFileName, userId);
  
      expect(result).toBeTrue();
    });
  
    it('should return false when deleteFiles throws error', async () => {
      const uniqueFileName = 'timestamp_test.txt';
      const userId = 'user123';
  
      spyOn(service, 'deleteFiles').and.returnValue(
        Promise.reject(new Error('Delete files failed'))
      );
  
      const result = await service.deleteSpecificFileVersion(uniqueFileName, userId);
  
      expect(result).toBeFalse();
    });
  });
  
  describe('deleteFileByOriginalName', () => {
    function mockFileVersion(uniqueFileName: string): FileVersion {
      return {
        id: 'id_' + uniqueFileName,
        originalName: 'test.txt',
        uniqueFileName,
        uploadedAt: '2024-01-01T00:00:00Z',
        version: 1,
        userId: 'user1',
        createdAt: '2024-01-01T00:00:00Z'
      };
    }
  
    it('should successfully delete all versions of file', async () => {
      const originalName = 'test.txt';
      const userId = 'user123';
      const versions = [
        mockFileVersion('unique1.txt'),
        mockFileVersion('unique2.txt')
      ];
  
      spyOn(service, 'getFileVersionsByUser').and.returnValue(Promise.resolve(versions));
      spyOn(service, 'deleteFiles').and.returnValue(Promise.resolve());
      spyOn(service, 'deleteFileVersion').and.returnValue(Promise.resolve({
        success: true,
        deletedVersion: 'unique1.txt',
        remainingVersions: 0
      }));
  
      const result = await service.deleteFileByOriginalName(originalName, userId);
  
      expect(result).toBeTrue();
      expect(service.deleteFiles).toHaveBeenCalledTimes(2);
      expect(service.deleteFileVersion).toHaveBeenCalledTimes(2);
    });
  
    it('should return false when no versions found', async () => {
      const originalName = 'test.txt';
      const userId = 'user123';
  
      spyOn(service, 'getFileVersionsByUser').and.returnValue(Promise.resolve([]));
  
      const result = await service.deleteFileByOriginalName(originalName, userId);
  
      expect(result).toBeFalse();
    });
  
    it('should return false when getFileVersionsByUser returns null', async () => {
      const originalName = 'test.txt';
      const userId = 'user123';
  
      spyOn(service, 'getFileVersionsByUser').and.returnValue(Promise.resolve(null as any));
  
      const result = await service.deleteFileByOriginalName(originalName, userId);
  
      expect(result).toBeFalse();
    });
  
    it('should continue deleting other versions if one fails', async () => {
      const originalName = 'test.txt';
      const userId = 'user123';
      const versions = [
        mockFileVersion('unique1.txt'),
        mockFileVersion('unique2.txt')
      ];
  
      spyOn(service, 'getFileVersionsByUser').and.returnValue(Promise.resolve(versions));
      spyOn(service, 'deleteFiles').and.callFake((fileNames: string[]) => {
        if (fileNames[0] === 'unique1.txt') {
          return Promise.reject(new Error('Delete failed'));
        }
        return Promise.resolve();
      });
      spyOn(service, 'deleteFileVersion').and.returnValue(Promise.resolve({
        success: true,
        deletedVersion: 'unique2.txt',
        remainingVersions: 0
      }));
      spyOn(console, 'error');
  
      const result = await service.deleteFileByOriginalName(originalName, userId);
  
      expect(result).toBeTrue();
      expect(console.error).toHaveBeenCalled();
      expect(service.deleteFiles).toHaveBeenCalledTimes(2);
    });
  
    it('should return false and log error when getFileVersionsByUser fails', async () => {
      const originalName = 'test.txt';
      const userId = 'user123';
  
      spyOn(service, 'getFileVersionsByUser').and.returnValue(
        Promise.reject(new Error('Get versions failed'))
      );
      spyOn(console, 'error');
  
      const result = await service.deleteFileByOriginalName(originalName, userId);
  
      expect(result).toBeFalse();
      expect(console.error).toHaveBeenCalledWith('❌ Error in deleteFileByOriginalName:', jasmine.any(Error));
    });
  });

  describe('deleteFilesByOriginalNames', () => {
    it('should successfully delete all files', async () => {
      const originalNames = ['file1.txt', 'file2.txt'];
      const userId = 'user123';
  
      spyOn(service, 'deleteFileByOriginalName').and.returnValue(Promise.resolve(true));
  
      const result = await service.deleteFilesByOriginalNames(originalNames, userId);
  
      expect(result.success).toEqual(['file1.txt', 'file2.txt']);
      expect(result.failed).toEqual([]);
      expect(service.deleteFileByOriginalName).toHaveBeenCalledTimes(2);
    });
  
    it('should mark files as failed when deletion returns false', async () => {
      const originalNames = ['file1.txt', 'file2.txt'];
      const userId = 'user123';
  
      spyOn(service, 'deleteFileByOriginalName').and.callFake((name: string) => {
        if (name === 'file2.txt') {
          return Promise.resolve(false);
        }
        return Promise.resolve(true);
      });
  
      const result = await service.deleteFilesByOriginalNames(originalNames, userId);
  
      expect(result.success).toEqual(['file1.txt']);
      expect(result.failed).toEqual(['file2.txt']);
    });
  
    it('should mark files as failed when deletion throws error', async () => {
      const originalNames = ['file1.txt', 'file2.txt'];
      const userId = 'user123';
  
      spyOn(service, 'deleteFileByOriginalName').and.callFake((name: string) => {
        if (name === 'file2.txt') {
          return Promise.reject(new Error('Delete failed'));
        }
        return Promise.resolve(true);
      });
  
      const result = await service.deleteFilesByOriginalNames(originalNames, userId);
  
      expect(result.success).toEqual(['file1.txt']);
      expect(result.failed).toEqual(['file2.txt']);
    });
  
    it('should handle empty array', async () => {
      const result = await service.deleteFilesByOriginalNames([], 'user123');
  
      expect(result.success).toEqual([]);
      expect(result.failed).toEqual([]);
    });
  
    it('should propagate errors from outer try-catch', async () => {
      const originalNames = null as any; 
      const userId = 'user123';
    
      await expectAsync(service.deleteFilesByOriginalNames(originalNames, userId))
        .toBeRejectedWithError();
    });
  });
  
  describe('createFileMapping', () => {
    it('should successfully create file mapping', async () => {
      const mappingData: CreateFileMappingRequest = {
        originalName: 'test.txt',
        uniqueFileName: 'unique_test.txt',
        uploadedAt: '2024-01-01T00:00:00Z',
        userId: 'user123'
      };
  
      const expectedMapping: FileMapping = {
        id: 'mapping123',
        ...mappingData,
        version: 1,
        createdAt: '2024-01-01T00:00:00Z'
      };
  
      const promise = service.createFileMapping(mappingData);
  
      const req = httpMock.expectOne(`${mappingBase}`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mappingData);
  
      req.flush(expectedMapping);
  
      const result = await promise;
  
      expect(result).toEqual(expectedMapping);
    });
  
    it('should propagate http errors', async () => {
      const mappingData: CreateFileMappingRequest = {
        originalName: 'test.txt',
        uniqueFileName: 'unique_test.txt',
        uploadedAt: '2024-01-01T00:00:00Z',
        userId: 'user123'
      };
  
      const promise = service.createFileMapping(mappingData);
  
      const req = httpMock.expectOne(`${mappingBase}`);
      req.flush({ message: 'Mapping creation failed' }, { status: 500, statusText: 'Error' });
  
      await expectAsync(promise).toBeRejected();
    });
  });
  
  describe('getFileVersions', () => {
    function mockFileVersion(version: number): FileVersion {
      return {
        id: 'id_' + version,
        originalName: 'test.txt',
        uniqueFileName: 'unique_v' + version + '.txt',
        uploadedAt: '2024-01-01T00:00:00Z',
        version,
        userId: 'user1',
        createdAt: '2024-01-01T00:00:00Z'
      };
    }
  
    it('should successfully get file versions', async () => {
      const originalName = 'test.txt';
      const versions = [mockFileVersion(1), mockFileVersion(2)];
  
      const promise = service.getFileVersions(originalName);
  
      const req = httpMock.expectOne(`${mappingBase}/${encodeURIComponent(originalName)}`);
      expect(req.request.method).toBe('GET');
  
      req.flush(versions);
  
      const result = await promise;
  
      expect(result).toEqual(versions);
      expect(result.length).toBe(2);
    });
  
    it('should properly encode special characters in URL', async () => {
      const originalName = 'test file.txt';
  
      const promise = service.getFileVersions(originalName);
  
      const req = httpMock.expectOne(`${mappingBase}/test%20file.txt`);
      
      req.flush([]);
  
      await promise;
    });
  
    it('should return empty array when no versions found', async () => {
      const originalName = 'test.txt';
  
      const promise = service.getFileVersions(originalName);
  
      const req = httpMock.expectOne(`${mappingBase}/${encodeURIComponent(originalName)}`);
      
      req.flush([]);
  
      const result = await promise;
  
      expect(result).toEqual([]);
    });
  
    it('should propagate http errors', async () => {
      const originalName = 'test.txt';
  
      const promise = service.getFileVersions(originalName);
  
      const req = httpMock.expectOne(`${mappingBase}/${encodeURIComponent(originalName)}`);
      req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });
  
      await expectAsync(promise).toBeRejected();
    });
  });

  describe('getFileVersionsByUser', () => {
    function mockFileVersion(version: number): FileVersion {
      return {
        id: 'id_' + version,
        originalName: 'test.txt',
        uniqueFileName: 'unique_v' + version + '.txt',
        uploadedAt: '2024-01-01T00:00:00Z',
        version,
        userId: 'user123',
        createdAt: '2024-01-01T00:00:00Z'
      };
    }
  
    it('should successfully get file versions by user', async () => {
      const originalName = 'test.txt';
      const userId = 'user123';
      const versions = [mockFileVersion(1), mockFileVersion(2)];
  
      const promise = service.getFileVersionsByUser(originalName, userId);
  
      const req = httpMock.expectOne(
        `${mappingBase}/${encodeURIComponent(originalName)}/${encodeURIComponent(userId)}`
      );
      expect(req.request.method).toBe('GET');
  
      req.flush(versions);
  
      const result = await promise;
  
      expect(result).toEqual(versions);
      expect(result.length).toBe(2);
    });
  
    it('should properly encode special characters in URL', async () => {
      const originalName = 'test file.txt';
      const userId = 'user@123';
  
      const promise = service.getFileVersionsByUser(originalName, userId);
  
      const req = httpMock.expectOne(
        `${mappingBase}/test%20file.txt/user%40123`
      );
      
      req.flush([]);
  
      await promise;
    });
  
    it('should return empty array when no versions found', async () => {
      const originalName = 'test.txt';
      const userId = 'user123';
  
      const promise = service.getFileVersionsByUser(originalName, userId);
  
      const req = httpMock.expectOne(
        `${mappingBase}/${encodeURIComponent(originalName)}/${encodeURIComponent(userId)}`
      );
      
      req.flush([]);
  
      const result = await promise;
  
      expect(result).toEqual([]);
    });
  
    it('should propagate http errors', async () => {
      const originalName = 'test.txt';
      const userId = 'user123';
  
      const promise = service.getFileVersionsByUser(originalName, userId);
  
      const req = httpMock.expectOne(
        `${mappingBase}/${encodeURIComponent(originalName)}/${encodeURIComponent(userId)}`
      );
      req.flush({ message: 'Not found' }, { status: 404, statusText: 'Not Found' });
  
      await expectAsync(promise).toBeRejected();
    });
  });
  
  describe('getBatchFileMappings', () => {
    function mockFileVersion(originalName: string, version: number): FileVersion {
      return {
        id: 'id_' + version,
        originalName,
        uniqueFileName: 'unique_' + originalName,
        uploadedAt: '2024-01-01T00:00:00Z',
        version,
        userId: 'user123',
        createdAt: '2024-01-01T00:00:00Z'
      };
    }
  
    it('should successfully get batch file mappings without userId', async () => {
      const fileNames = ['file1.txt', 'file2.txt'];
      const expectedResult: BatchMappingResult = {
        mappings: [mockFileVersion('file1.txt', 1), mockFileVersion('file2.txt', 1)],
        errors: [],
        totalProcessed: 2,
        successful: 2
      };
  
      const promise = service.getBatchFileMappings(fileNames);
  
      const req = httpMock.expectOne(`${mappingBase}/batch`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ fileNames });
  
      req.flush(expectedResult);
  
      const result = await promise;
  
      expect(result).toEqual(expectedResult);
    });
  
    it('should successfully get batch file mappings with userId', async () => {
      const fileNames = ['file1.txt', 'file2.txt'];
      const userId = 'user123';
      const expectedResult: BatchMappingResult = {
        mappings: [mockFileVersion('file1.txt', 1), mockFileVersion('file2.txt', 1)],
        errors: [],
        totalProcessed: 2,
        successful: 2
      };
  
      const promise = service.getBatchFileMappings(fileNames, userId);
  
      const req = httpMock.expectOne(`${mappingBase}/batch`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ fileNames, userId });
  
      req.flush(expectedResult);
  
      const result = await promise;
  
      expect(result).toEqual(expectedResult);
    });
  
    it('should propagate http errors', async () => {
      const fileNames = ['file1.txt'];
  
      const promise = service.getBatchFileMappings(fileNames);
  
      const req = httpMock.expectOne(`${mappingBase}/batch`);
      req.flush({ message: 'Batch failed' }, { status: 500, statusText: 'Error' });
  
      await expectAsync(promise).toBeRejected();
    });
  
    it('should log error and rethrow when error occurs', async () => {
      const fileNames = ['file1.txt'];
      
      spyOn(console, 'error');
  
      const promise = service.getBatchFileMappings(fileNames);
  
      const req = httpMock.expectOne(`${mappingBase}/batch`);
      req.flush({ message: 'Server error' }, { status: 500, statusText: 'Error' });
  
      await expectAsync(promise).toBeRejected();
  
      expect(console.error).toHaveBeenCalledWith('❌ Error in getBatchFileMappings:', jasmine.any(Error));
    });
  });
  
  describe('getAllFiles', () => {
    it('should successfully get all files', async () => {
      const expectedResult: FilesGroupedResult = {
        files: {
          'file1.txt': [
            {
              id: 'id1',
              originalName: 'file1.txt',
              uniqueFileName: 'unique1.txt',
              uploadedAt: '2024-01-01T00:00:00Z',
              version: 1,
              userId: 'user1',
              createdAt: '2024-01-01T00:00:00Z'
            }
          ]
        },
        total: 1,
        stats: {
          totalKeys: 1,
          processedKeys: 1,
          errorKeys: 0,
          uniqueFiles: 1,
          totalVersions: 1
        }
      };
  
      const promise = service.getAllFiles();
  
      const req = httpMock.expectOne(`${mappingBase}/files/all`);
      expect(req.request.method).toBe('GET');
  
      req.flush(expectedResult);
  
      const result = await promise;
  
      expect(result).toEqual(expectedResult);
    });
  
    it('should return empty result when no files exist', async () => {
      const expectedResult: FilesGroupedResult = {
        files: {},
        total: 0,
        stats: {
          totalKeys: 0,
          processedKeys: 0,
          errorKeys: 0,
          uniqueFiles: 0,
          totalVersions: 0
        }
      };
  
      const promise = service.getAllFiles();
  
      const req = httpMock.expectOne(`${mappingBase}/files/all`);
      
      req.flush(expectedResult);
  
      const result = await promise;
  
      expect(result).toEqual(expectedResult);
    });
  
    it('should propagate http errors', async () => {
      const promise = service.getAllFiles();
  
      const req = httpMock.expectOne(`${mappingBase}/files/all`);
      req.flush({ message: 'Server error' }, { status: 500, statusText: 'Error' });
  
      await expectAsync(promise).toBeRejected();
    });
  });

  describe('getUserFiles', () => {
    it('should successfully get user files', async () => {
      const userId = 'user123';
      const expectedResult: FilesGroupedResult = {
        files: {
          'file1.txt': [
            {
              id: 'id1',
              originalName: 'file1.txt',
              uniqueFileName: 'unique1.txt',
              uploadedAt: '2024-01-01T00:00:00Z',
              version: 1,
              userId: 'user123',
              createdAt: '2024-01-01T00:00:00Z'
            }
          ]
        },
        total: 1,
        stats: {
          totalKeys: 1,
          processedKeys: 1,
          errorKeys: 0,
          uniqueFiles: 1,
          totalVersions: 1
        }
      };
  
      const promise = service.getUserFiles(userId);
  
      const req = httpMock.expectOne(`${mappingBase}/user/${encodeURIComponent(userId)}`);
      expect(req.request.method).toBe('GET');
  
      req.flush(expectedResult);
  
      const result = await promise;
  
      expect(result).toEqual(expectedResult);
    });
  
    it('should properly encode special characters in userId', async () => {
      const userId = 'user@123';
  
      const promise = service.getUserFiles(userId);
  
      const req = httpMock.expectOne(`${mappingBase}/user/user%40123`);
      
      req.flush({
        files: {},
        total: 0,
        stats: { totalKeys: 0, processedKeys: 0, errorKeys: 0, uniqueFiles: 0, totalVersions: 0 }
      });
  
      await promise;
    });
  
    it('should return empty result when user has no files', async () => {
      const userId = 'user123';
      const expectedResult: FilesGroupedResult = {
        files: {},
        total: 0,
        stats: {
          totalKeys: 0,
          processedKeys: 0,
          errorKeys: 0,
          uniqueFiles: 0,
          totalVersions: 0
        }
      };
  
      const promise = service.getUserFiles(userId);
  
      const req = httpMock.expectOne(`${mappingBase}/user/${encodeURIComponent(userId)}`);
      
      req.flush(expectedResult);
  
      const result = await promise;
  
      expect(result).toEqual(expectedResult);
    });
  
    it('should propagate http errors', async () => {
      const userId = 'user123';
  
      const promise = service.getUserFiles(userId);
  
      const req = httpMock.expectOne(`${mappingBase}/user/${encodeURIComponent(userId)}`);
      req.flush({ message: 'Server error' }, { status: 500, statusText: 'Error' });
  
      await expectAsync(promise).toBeRejected();
    });
  });
  
  describe('getDatabaseStats', () => {
    it('should successfully get database stats', async () => {
      const expectedStats: DatabaseStats = {
        totalKeys: 100,
        uniqueUsers: 10,
        uniqueFiles: 50,
        totalVersions: 150,
        errors: 0,
        timestamp: '2024-01-01T00:00:00Z'
      };
  
      const promise = service.getDatabaseStats();
  
      const req = httpMock.expectOne(`${mappingBase}/stats`);
      expect(req.request.method).toBe('GET');
  
      req.flush(expectedStats);
  
      const result = await promise;
  
      expect(result).toEqual(expectedStats);
    });
  
    it('should propagate http errors', async () => {
      const promise = service.getDatabaseStats();
  
      const req = httpMock.expectOne(`${mappingBase}/stats`);
      req.flush({ message: 'Stats unavailable' }, { status: 500, statusText: 'Error' });
  
      await expectAsync(promise).toBeRejected();
    });
  });
  
  describe('clearDatabase', () => {
    it('should successfully clear database', async () => {
      const expectedResult = {
        success: true,
        deletedKeys: 100,
        message: 'Database cleared successfully'
      };
  
      const promise = service.clearDatabase();
  
      const req = httpMock.expectOne(`${mappingBase}/admin/clear`);
      expect(req.request.method).toBe('DELETE');
  
      req.flush(expectedResult);
  
      const result = await promise;
  
      expect(result).toEqual(expectedResult);
      expect(result.success).toBeTrue();
      expect(result.deletedKeys).toBe(100);
    });
  
    it('should handle unsuccessful clear operation', async () => {
      const expectedResult = {
        success: false,
        deletedKeys: 0,
        message: 'Clear operation failed'
      };
  
      const promise = service.clearDatabase();
  
      const req = httpMock.expectOne(`${mappingBase}/admin/clear`);
      
      req.flush(expectedResult);
  
      const result = await promise;
  
      expect(result.success).toBeFalse();
      expect(result.deletedKeys).toBe(0);
    });
  
    it('should propagate http errors', async () => {
      const promise = service.clearDatabase();
  
      const req = httpMock.expectOne(`${mappingBase}/admin/clear`);
      req.flush({ message: 'Unauthorized' }, { status: 403, statusText: 'Forbidden' });
  
      await expectAsync(promise).toBeRejected();
    });
  });
  
  describe('getLatestFileVersion', () => {
    function mockFileVersion(version: number): FileVersion {
      return {
        id: 'id_' + version,
        originalName: 'test.txt',
        uniqueFileName: 'unique_v' + version + '.txt',
        uploadedAt: '2024-01-01T00:00:00Z',
        version,
        userId: 'user123',
        createdAt: '2024-01-01T00:00:00Z'
      };
    }
  
    it('should return latest version with userId', async () => {
      const originalName = 'test.txt';
      const userId = 'user123';
      const versions = [mockFileVersion(1), mockFileVersion(3), mockFileVersion(2)];
  
      spyOn(service, 'getFileVersionsByUser').and.returnValue(Promise.resolve(versions));
  
      const result = await service.getLatestFileVersion(originalName, userId);
  
      expect(result).toEqual(mockFileVersion(3));
      expect(service.getFileVersionsByUser).toHaveBeenCalledWith(originalName, userId);
    });
  
    it('should return latest version without userId', async () => {
      const originalName = 'test.txt';
      const versions = [mockFileVersion(1), mockFileVersion(2), mockFileVersion(3)];
  
      spyOn(service, 'getFileVersions').and.returnValue(Promise.resolve(versions));
  
      const result = await service.getLatestFileVersion(originalName);
  
      expect(result).toEqual(mockFileVersion(3));
      expect(service.getFileVersions).toHaveBeenCalledWith(originalName);
    });
  
    it('should return null when no versions exist', async () => {
      const originalName = 'test.txt';
  
      spyOn(service, 'getFileVersions').and.returnValue(Promise.resolve([]));
  
      const result = await service.getLatestFileVersion(originalName);
  
      expect(result).toBeNull();
    });
  
    it('should return null when versions is null', async () => {
      const originalName = 'test.txt';
  
      spyOn(service, 'getFileVersions').and.returnValue(Promise.resolve(null as any));
  
      const result = await service.getLatestFileVersion(originalName);
  
      expect(result).toBeNull();
    });
  
    it('should return null and log error when getFileVersions throws error', async () => {
      const originalName = 'test.txt';
  
      spyOn(service, 'getFileVersions').and.returnValue(
        Promise.reject(new Error('Get versions failed'))
      );
      spyOn(console, 'error');
  
      const result = await service.getLatestFileVersion(originalName);
  
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('❌ Error getting latest file version:', jasmine.any(Error));
    });
  
    it('should return null and log error when getFileVersionsByUser throws error', async () => {
      const originalName = 'test.txt';
      const userId = 'user123';
  
      spyOn(service, 'getFileVersionsByUser').and.returnValue(
        Promise.reject(new Error('Get versions failed'))
      );
      spyOn(console, 'error');
  
      const result = await service.getLatestFileVersion(originalName, userId);
  
      expect(result).toBeNull();
      expect(console.error).toHaveBeenCalledWith('❌ Error getting latest file version:', jasmine.any(Error));
    });
  });

  describe('getFileHistory', () => {
    function mockFileVersion(version: number): FileVersion {
      return {
        id: 'id_' + version,
        originalName: 'test.txt',
        uniqueFileName: 'unique_v' + version + '.txt',
        uploadedAt: '2024-01-01T00:00:00Z',
        version,
        userId: 'user123',
        createdAt: '2024-01-01T00:00:00Z'
      };
    }
  
    it('should return file history with userId', async () => {
      const originalName = 'test.txt';
      const userId = 'user123';
      const versions = [mockFileVersion(1), mockFileVersion(2)];
  
      spyOn(service, 'getFileVersionsByUser').and.returnValue(Promise.resolve(versions));
  
      const result = await service.getFileHistory(originalName, userId);
  
      expect(result).toEqual(versions);
      expect(service.getFileVersionsByUser).toHaveBeenCalledWith(originalName, userId);
    });
  
    it('should return file history without userId', async () => {
      const originalName = 'test.txt';
      const versions = [mockFileVersion(1), mockFileVersion(2)];
  
      spyOn(service, 'getFileVersions').and.returnValue(Promise.resolve(versions));
  
      const result = await service.getFileHistory(originalName);
  
      expect(result).toEqual(versions);
      expect(service.getFileVersions).toHaveBeenCalledWith(originalName);
    });
  
    it('should return empty array when no versions exist', async () => {
      const originalName = 'test.txt';
  
      spyOn(service, 'getFileVersions').and.returnValue(Promise.resolve([]));
  
      const result = await service.getFileHistory(originalName);
  
      expect(result).toEqual([]);
    });
  
    it('should return empty array and log error when getFileVersions throws error', async () => {
      const originalName = 'test.txt';
  
      spyOn(service, 'getFileVersions').and.returnValue(
        Promise.reject(new Error('Get versions failed'))
      );
      spyOn(console, 'error');
  
      const result = await service.getFileHistory(originalName);
  
      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('❌ Error getting file history:', jasmine.any(Error));
    });
  
    it('should return empty array and log error when getFileVersionsByUser throws error', async () => {
      const originalName = 'test.txt';
      const userId = 'user123';
  
      spyOn(service, 'getFileVersionsByUser').and.returnValue(
        Promise.reject(new Error('Get versions failed'))
      );
      spyOn(console, 'error');
  
      const result = await service.getFileHistory(originalName, userId);
  
      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('❌ Error getting file history:', jasmine.any(Error));
    });
  });
  
  describe('createMappingAfterUpload', () => {
    it('should successfully create mapping using extracted unique filename from URL', async () => {
      const file = new File(['content'], 'test.txt');
      const uploadUrl = 'https://s3.amazonaws.com/bucket/unique_test.txt?signature=xyz';
      const userId = 'user123';
  
      const expectedMapping: FileMapping = {
        id: 'mapping123',
        originalName: 'test.txt',
        uniqueFileName: 'unique_test.txt',
        uploadedAt: '2024-01-01T00:00:00Z',
        userId: 'user123',
        version: 1,
        createdAt: '2024-01-01T00:00:00Z'
      };
  
      spyOn(service, 'createFileMapping').and.returnValue(Promise.resolve(expectedMapping));
  
      const result = await (service as any).createMappingAfterUpload(file, uploadUrl, userId);
  
      expect(result.fileName).toBe('test.txt');
      expect(result.uniqueFileName).toBe('unique_test.txt');
      expect(result.url).toBe(uploadUrl);
      expect(service.createFileMapping).toHaveBeenCalled();
    });
  
    it('should log error and rethrow when createFileMapping fails', async () => {
      const file = new File(['content'], 'test.txt');
      const uploadUrl = 'https://s3.amazonaws.com/bucket/unique_test.txt';
      const userId = 'user123';
  
      spyOn(service, 'createFileMapping').and.returnValue(
        Promise.reject(new Error('Mapping creation failed'))
      );
      spyOn(console, 'error');
  
      await expectAsync((service as any).createMappingAfterUpload(file, uploadUrl, userId))
        .toBeRejectedWithError('Mapping creation failed');
  
      expect(console.error).toHaveBeenCalledWith('❌ Failed to create file mapping for:', 'test.txt', jasmine.any(Error));
    });
  });
  
  describe('extractUniqueFileNameFromUrl', () => {
    it('should extract filename from URL without query parameters', () => {
      const url = 'https://s3.amazonaws.com/bucket/unique_test.txt';
  
      const result = (service as any).extractUniqueFileNameFromUrl(url);
  
      expect(result).toBe('unique_test.txt');
    });
  
    it('should extract filename from URL with query parameters', () => {
      const url = 'https://s3.amazonaws.com/bucket/unique_test.txt?signature=xyz&expires=123';
  
      const result = (service as any).extractUniqueFileNameFromUrl(url);
  
      expect(result).toBe('unique_test.txt');
    });
  
    it('should decode URL-encoded filename', () => {
      const url = 'https://s3.amazonaws.com/bucket/test%20file%20name.txt';
  
      const result = (service as any).extractUniqueFileNameFromUrl(url);
  
      expect(result).toBe('test file name.txt');
    });
  
    it('should return cleanFileName when decoding fails', () => {
      const url = 'https://s3.amazonaws.com/bucket/test%E0%A4%A.txt';
  
      const result = (service as any).extractUniqueFileNameFromUrl(url);
  
      expect(result).toBe('test%E0%A4%A.txt');
    });
  
    it('should return empty string when URL is empty', () => {
      const url = '';
  
      const result = (service as any).extractUniqueFileNameFromUrl(url);
  
      expect(result).toBe('');
    });
  
    it('should return null when URL parsing throws error', () => {
      spyOn(String.prototype, 'split').and.throwError('Parse error');
  
      const result = (service as any).extractUniqueFileNameFromUrl('some-url');
  
      expect(result).toBeNull();
    });

    it('should generate unique filename when extractUniqueFileNameFromUrl returns null', async () => {
      const file = new File(['content'], 'test.txt');
      const uploadUrl = 'https://s3.amazonaws.com/bucket/file.txt';
      const userId = 'user123';
    
      spyOn<any>(service, 'extractUniqueFileNameFromUrl').and.returnValue(null);
      spyOn<any>(service, 'generateUniqueFileName').and.returnValue('generated_12345_test.txt');
    
      const createFileMappingSpy = spyOn(service, 'createFileMapping').and.callFake((mappingData: CreateFileMappingRequest) => {
        const mapping: FileMapping = {
          id: 'mapping123',
          originalName: mappingData.originalName,
          uniqueFileName: mappingData.uniqueFileName,
          uploadedAt: mappingData.uploadedAt,
          userId: mappingData.userId,
          version: 1,
          createdAt: '2024-01-01T00:00:00Z'
        };
        return Promise.resolve(mapping);
      });
    
      const result = await (service as any).createMappingAfterUpload(file, uploadUrl, userId);
    
      expect((service as any).extractUniqueFileNameFromUrl).toHaveBeenCalledWith(uploadUrl);
      expect((service as any).generateUniqueFileName).toHaveBeenCalledWith('test.txt');
      expect(result.fileName).toBe('test.txt');
      expect(result.uniqueFileName).toBe('generated_12345_test.txt');
      expect(result.url).toBe(uploadUrl);
      
      const callArgs = createFileMappingSpy.calls.mostRecent().args[0];
      expect(callArgs.uniqueFileName).toBe('generated_12345_test.txt');
    });
  });

  describe('Private methods coverage', () => {

    it('generateUniqueFileName should create a unique filename with timestamp_random_originalName', () => {
      const result = (service as any).generateUniqueFileName('test-file.png');
  
      expect(result).toContain('_');
      expect(result).toContain('test-file.png');
  
      const parts = result.split('_');
  
      expect(parts.length).toBeGreaterThanOrEqual(3);
  
      const timestamp = Number(parts[0]);
      expect(isNaN(timestamp)).toBeFalse();
  
      const randomPart = parts[1];
      expect(randomPart.length).toBeGreaterThanOrEqual(5); 
    });
  
    it('handleError should return observable with error when ErrorEvent provided', (done) => {
      const mockError = new ErrorEvent('TestError', { message: 'Client error happened' });
  
      const httpError = new HttpErrorResponse({
        error: mockError,
        status: 0
      });
  
      (service as any).handleError(httpError).subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Client error happened');
          done();
        }
      });
    });
  
  
    it('handleError should return server error message when error.error.message exists', (done) => {
      const httpError = new HttpErrorResponse({
        error: { message: 'Server says no' },
        status: 500
      });
  
      (service as any).handleError(httpError).subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Server says no');
          done();
        }
      });
    });
  
  
    it('handleError should fallback to error.message when no error.error.message', (done) => {
      const httpError = new HttpErrorResponse({
        error: {},
        status: 400,
        statusText: 'Bad Request',
      });
  
      (service as any).handleError(httpError).subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('Http failure response');
          done();
        }
      });
    });
  
  
    it('handleError should fallback to status when there is no error.error.message', (done) => {
      const httpError = new HttpErrorResponse({
        error: null as any,
        status: 404,
        statusText: 'Not Found',
        url: '/test-url'
      });
    
      (service as any).handleError(httpError).subscribe({
        error: (err: Error) => {
          expect(err.message).toContain('404'); 
          expect(err.message).toContain('Http failure response'); 
          done();
        }
      });
    });

    it('handleError should fallback to Error Code when message fields are empty', (done) => {
      const httpError = new HttpErrorResponse({
        error: null as any,
        status: 404
      });
      (httpError as any).message = '';
    
      (service as any).handleError(httpError).subscribe({
        error: (err: Error) => {
          expect(err.message).toBe('Error Code: 404');
          done();
        }
      });
    });
  });  
});