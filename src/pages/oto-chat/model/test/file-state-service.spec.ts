import { TestBed } from '@angular/core/testing';
import { FileUploadStateService, UploadItem } from '../file-state-service';
import { Subscription } from 'rxjs';

describe('FileUploadStateService', () => {
  let service: FileUploadStateService;

  const createFile = (
    name = 'test.txt',
    size = 1024,
    type = 'text/plain'
  ): File => {
    const blob = new Blob(['a'.repeat(size)], { type });
    return new File([blob], name, { type });
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FileUploadStateService);
  });

  afterEach(() => {
    service.resetState();
  });

  it('should be created with initial state', () => {
    const state = service.getUploadState();

    expect(state.uploadItems.length).toBe(0);
    expect(state.isUploadModalOpen).toBeFalse();
    expect(state.isUploading).toBeFalse();
    expect(state.uploadCaption).toBe('');
    expect(state.fileValidationErrors.length).toBe(0);
    expect(state.showErrorNotification).toBeFalse();
  });
 
  it('should format file size correctly', () => {
    expect(service.formatFileSize(1024)).toBe('1.00 KB');
    expect(service.formatFileSize(1024 * 1024)).toBe('1.00 MB');
  });

  it('should detect image file', () => {
    expect(service.isImageFile(createFile('a.png', 10, 'image/png'))).toBeTrue();
    expect(service.isImageFile(createFile('a.txt', 10, 'text/plain'))).toBeFalse();
  });

  it('should set upload items', () => {
    const file = createFile();
    service.setUploadItems([file]);

    const state = service.getUploadState();
    expect(state.uploadItems.length).toBe(1);
    expect(state.uploadItems[0].name).toBe(file.name);
  });

  it('should add upload items', () => {
    service.addUploadItems([createFile('1'), createFile('2')]);
    expect(service.getUploadState().uploadItems.length).toBe(2);
  });

  it('should update upload item', () => {
    service.setUploadItems([createFile()]);
    service.updateUploadItem(0, { progress: 55 });

    expect(service.getUploadState().uploadItems[0].progress).toBe(55);
  });

  it('should ignore update for invalid index', () => {
    service.setUploadItems([createFile()]);
    service.updateUploadItem(999, { progress: 10 });

    expect(service.getUploadState().uploadItems[0].progress).toBe(0);
  });

  it('should remove upload item with abort and unsubscribe', () => {
    const abort = jasmine.createSpy('abort');
    const subscription = new Subscription();

    service.setUploadItems([createFile()]);
    service.updateUploadItem(0, { abort, subscription });

    spyOn(subscription, 'unsubscribe');

    service.removeUploadItem(0);

    expect(abort).toHaveBeenCalled();
    expect(subscription.unsubscribe).toHaveBeenCalled();
    expect(service.getUploadState().uploadItems.length).toBe(0);
    expect(service.getUploadState().isUploadModalOpen).toBeFalse();
  });

  it('should clear upload items', () => {
    const abort = jasmine.createSpy('abort');
    const subscription = new Subscription();
    spyOn(subscription, 'unsubscribe');

    service.setUploadItems([createFile()]);
    service.updateUploadItem(0, { abort, subscription });

    service.clearUploadItems();

    expect(abort).toHaveBeenCalled();
    expect(subscription.unsubscribe).toHaveBeenCalled();
    expect(service.getUploadState().uploadItems.length).toBe(0);
  });

  it('should open and close upload modal', () => {
    service.openUploadModal('caption');

    expect(service.getUploadState().isUploadModalOpen).toBeTrue();
    expect(service.getUploadState().uploadCaption).toBe('caption');

    service.closeUploadModal();
    expect(service.getUploadState().isUploadModalOpen).toBeFalse();
  });

  it('should calculate total upload size', () => {
    service.setUploadItems([
      createFile('a', 100),
      createFile('b', 200)
    ]);

    expect(service.getTotalUploadSize()).toBe(300);
  });

  it('should set validation errors and show notification', () => {
    const errors = service.setFileValidationErrors([
      {
        fileName: 'bad.txt',
        error: 'size',
        actualSize: 999
      }
    ]);

    expect(errors[0].message).toContain('too big');
    expect(service.getUploadState().showErrorNotification).toBeTrue();
  });

  it('should hide error notification', () => {
    service.hideErrorNotification();
    expect(service.getUploadState().showErrorNotification).toBeFalse();
  });

  it('should handle file upload and open modal', () => {
    const result = service.handleFileUpload([createFile()], 'hello');

    expect(result.validFiles.length).toBe(1);
    expect(result.shouldOpenModal).toBeTrue();
    expect(service.getUploadState().isUploadModalOpen).toBeTrue();
  });

  it('should not open modal when editing', () => {
    const result = service.handleFileUpload([createFile()], 'msg', true);

    expect(result.shouldOpenModal).toBeFalse();
  });

  it('should handle file drop', () => {
    const result = service.handleFileDrop([createFile()], 'draft');

    expect(result.validFiles.length).toBe(1);
    expect(service.getUploadState().isUploadModalOpen).toBeTrue();
  });

  it('should handle modal file input', () => {
    const result = service.handleModalFileInput([createFile()]);
    expect(result.validFiles.length).toBe(1);
    expect(service.getUploadState().uploadItems.length).toBe(1);
  });

  it('should reset state', () => {
    service.setUploadItems([createFile()]);
    service.openUploadModal();

    service.resetState();

    expect(service.getUploadState().uploadItems.length).toBe(0);
    expect(service.getUploadState().isUploadModalOpen).toBeFalse();
  });

  it('should return max file size', () => {
    const maxSize = service.getMaxFileSize();
  
    expect(typeof maxSize).toBe('number');
    expect(maxSize).toBe(1024 * 1024 * 1024);
  });
  
  it('should set isUploading flag', () => {
    service.setIsUploading(true);
    expect(service.getUploadState().isUploading).toBeTrue();
    service.setIsUploading(false);
    expect(service.getUploadState().isUploading).toBeFalse();
  });

  describe('checkUploadSizeLimit', () => {
    const createSizedItem = (size: number) => ({
      file: {} as File,
      name: 'file',
      size,
      progress: 0
    });
  
    it('should return no warnings when total size is under threshold', () => {
      const max = service.getMaxFileSize();
  
      service.setUploadItems([]);
      service.addUploadItems([
        Object.assign(createSizedItem(max * 0.5))
      ] as any);
  
      const result = service.checkUploadSizeLimit();
  
      expect(result.totalSize).toBe(max * 0.5);
      expect(result.isOverLimit).toBeFalse();
      expect(result.isNearLimit).toBeFalse();
    });
  
    it('should return near limit warning', () => {
      const max = service.getMaxFileSize();
  
      service.setUploadItems([]);
      service.addUploadItems([
        Object.assign(createSizedItem(max * 0.95))
      ] as any);
  
      const result = service.checkUploadSizeLimit();
  
      expect(result.isOverLimit).toBeFalse();
      expect(result.isNearLimit).toBeTrue();
    });
  
    it('should not be over limit when equal to max', () => {
      const max = service.getMaxFileSize();
  
      service.setUploadItems([]);
      service.addUploadItems([
        Object.assign(createSizedItem(max))
      ] as any);
  
      const result = service.checkUploadSizeLimit();
  
      expect(result.isOverLimit).toBeFalse();
      expect(result.isNearLimit).toBeTrue();
    });
  
    it('should be over limit when size exceeds max', () => {
      const max = service.getMaxFileSize();
  
      service.setUploadItems([]);
      service.addUploadItems([
        Object.assign(createSizedItem(max + 1))
      ] as any);
  
      const result = service.checkUploadSizeLimit();
  
      expect(result.isOverLimit).toBeTrue();
      expect(result.isNearLimit).toBeFalse();
    });

      it('should add file to validFiles when size is within limit', () => {
        const validFile = createFile('ok.txt', 1024);
      
        const result = service.validateFiles([validFile]);
      
        expect(result.errors.length).toBe(0);
        expect(result.validFiles.length).toBe(1);
        expect(result.validFiles[0].name).toBe('ok.txt');
      });

      it('should format validation error message for unsupported file type', () => {
        const result = service.setFileValidationErrors([
          {
            fileName: 'virus.exe',
            error: 'type'
          }
        ]);
      
        expect(result.length).toBe(1);
      
        expect(result[0]).toEqual(
          jasmine.objectContaining({
            fileName: 'virus.exe',
            error: 'type',
            message: 'File type "virus.exe" is not supported (unknown)'
          })
        );
      
        const state = service.getUploadState();
        expect(state.fileValidationErrors.length).toBe(1);
        expect(state.showErrorNotification).toBeTrue();
      });

const createMockFileWithSize = (
    name: string,
    size: number,
    type = 'text/plain'
  ): File => {
    const blob = new Blob([''], { type });
    const file = new File([blob], name, { type });
    
    Object.defineProperty(file, 'size', {
      value: size,
      writable: false
    });
    
    return file;
  };
  
  it('should add error and skip file when file size exceeds maxFileSize', () => {
    const max = service.getMaxFileSize();
    const oversizeFile = createMockFileWithSize('huge.txt', max + 1);
  
    const result = service.validateFiles([oversizeFile]);
  
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].fileName).toBe('huge.txt');
    expect(result.errors[0].error).toBe('size');
    expect(result.errors[0].actualSize).toBe(max + 1);
    expect(result.validFiles.length).toBe(0);
  });
  
  it('should be over limit when size exceeds max', () => {
    const max = service.getMaxFileSize();
  
    service.setUploadItems([]);
    service.addUploadItems([
      Object.assign(createSizedItem(max + 1))
    ] as any);
  
    const result = service.checkUploadSizeLimit();
  
    expect(result.isOverLimit).toBeTrue();
    expect(result.isNearLimit).toBeFalse();
  });

describe('handleFileUpload - additional coverage', () => {
  
    it('should call setFileValidationErrors when there are invalid files', () => {
      const max = service.getMaxFileSize();
      const validFile = createFile('ok.txt', 100);
      const invalidFile = createMockFileWithSize('huge.txt', max + 1);
      
      spyOn(service, 'setFileValidationErrors').and.callThrough();
      
      const result = service.handleFileUpload([validFile, invalidFile], 'test message');
      
      expect(service.setFileValidationErrors).toHaveBeenCalledWith([
        {
          fileName: 'huge.txt',
          error: 'size',
          actualSize: max + 1,
          actualType: 'text/plain'
        }
      ]);
      expect(result.errors.length).toBe(1);
      expect(result.validFiles.length).toBe(1);
    });
  
    it('should set empty caption when message is undefined', () => {
      const file = createFile('test.txt', 100);
      
      service.handleFileUpload([file]);
      
      const state = service.getUploadState();
      expect(state.uploadCaption).toBe('');
    });
  
    it('should set empty caption when message is empty string', () => {
      const file = createFile('test.txt', 100);
      
      service.handleFileUpload([file], '');
      
      const state = service.getUploadState();
      expect(state.uploadCaption).toBe('');
    });
  
    it('should not open modal when all files are invalid', () => {
      const max = service.getMaxFileSize();
      const invalidFile = createMockFileWithSize('huge.txt', max + 1);
      
      const result = service.handleFileUpload([invalidFile], 'test');
      
      expect(result.validFiles.length).toBe(0);
      expect(result.errors.length).toBe(1);
      expect(result.shouldOpenModal).toBeFalse();
      expect(service.getUploadState().isUploadModalOpen).toBeFalse();
    });
  
    it('should not open modal when isEditing is true even with valid files', () => {
      const file = createFile('test.txt', 100);
      
      const result = service.handleFileUpload([file], 'message', true);
      
      expect(result.validFiles.length).toBe(1);
      expect(result.shouldOpenModal).toBeFalse();
      expect(service.getUploadState().isUploadModalOpen).toBeFalse();
    });
  
    it('should return errors even when isEditing is true', () => {
      const max = service.getMaxFileSize();
      const invalidFile = createMockFileWithSize('huge.txt', max + 1);
      
      const result = service.handleFileUpload([invalidFile], 'message', true);
      
      expect(result.errors.length).toBe(1);
      expect(result.validFiles.length).toBe(0);
      expect(result.shouldOpenModal).toBeFalse();
    });
  });

describe('handleFileDrop - additional coverage', () => {
  
    it('should call setFileValidationErrors when there are invalid files', () => {
      const max = service.getMaxFileSize();
      const validFile = createFile('ok.txt', 100);
      const invalidFile = createMockFileWithSize('huge.txt', max + 1);
      
      spyOn(service, 'setFileValidationErrors').and.callThrough();
      
      const result = service.handleFileDrop([validFile, invalidFile], 'draft text');
      
      expect(service.setFileValidationErrors).toHaveBeenCalledWith([
        {
          fileName: 'huge.txt',
          error: 'size',
          actualSize: max + 1,
          actualType: 'text/plain'
        }
      ]);
      expect(result.errors.length).toBe(1);
      expect(result.validFiles.length).toBe(1);
      
      const state = service.getUploadState();
      expect(state.uploadItems.length).toBe(1);
      expect(state.uploadItems[0].name).toBe('ok.txt');
    });
  
    it('should not call setFileValidationErrors when all files are valid', () => {
      const validFile = createFile('ok.txt', 100);
      
      spyOn(service, 'setFileValidationErrors');
      
      const result = service.handleFileDrop([validFile], 'draft text');
      
      expect(service.setFileValidationErrors).not.toHaveBeenCalled();
      expect(result.errors.length).toBe(0);
      expect(result.validFiles.length).toBe(1);
    });
  
    it('should return errors when all files are invalid', () => {
      const max = service.getMaxFileSize();
      const invalidFile1 = createMockFileWithSize('huge1.txt', max + 1);
      const invalidFile2 = createMockFileWithSize('huge2.txt', max + 2);
      
      const result = service.handleFileDrop([invalidFile1, invalidFile2], 'draft');
      
      expect(result.errors.length).toBe(2);
      expect(result.validFiles.length).toBe(0);
    
      const state = service.getUploadState();
      expect(state.uploadItems.length).toBe(0);
      expect(state.isUploadModalOpen).toBeFalse();
    });
  
    it('should return errors even when isEditing is true', () => {
      const max = service.getMaxFileSize();
      const validFile = createFile('ok.txt', 100);
      const invalidFile = createMockFileWithSize('huge.txt', max + 1);
      
      const result = service.handleFileDrop([validFile, invalidFile], 'draft', true);
      
      expect(result.errors.length).toBe(1);
      expect(result.validFiles.length).toBe(1);
    
      const state = service.getUploadState();
      expect(state.uploadItems.length).toBe(0);
    });
  
    it('should not set caption when draftText is empty string', () => {
      const validFile = createFile('ok.txt', 100);
      
      const result = service.handleFileDrop([validFile], '   ');
      
      const state = service.getUploadState();
      expect(state.uploadCaption).toBe('');
    });
  
    it('should not open modal again if already open', () => {
      const validFile1 = createFile('file1.txt', 100);
      const validFile2 = createFile('file2.txt', 100);
      
      spyOn(service, 'openUploadModal').and.callThrough();

      service.handleFileDrop([validFile1], 'draft');
      expect(service.openUploadModal).toHaveBeenCalledTimes(1);

      (service.openUploadModal as jasmine.Spy).calls.reset();
      service.handleFileDrop([validFile2], 'draft');
      expect(service.openUploadModal).not.toHaveBeenCalled();
      
      const state = service.getUploadState();
      expect(state.uploadItems.length).toBe(2);
    });

    it('should call setFileValidationErrors when file exceeds size limit in handleModalFileInput', () => {
        const max = service.getMaxFileSize();
        const invalidFile = createMockFileWithSize('huge.txt', max + 1);
        
        const result = service.handleModalFileInput([invalidFile]);
        
        expect(result.errors.length).toBe(1);
        expect(result.errors[0].fileName).toBe('huge.txt');
        expect(result.errors[0].error).toBe('size');
        expect(result.validFiles.length).toBe(0);
      });
  });
  });
});
