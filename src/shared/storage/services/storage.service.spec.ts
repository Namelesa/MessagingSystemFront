import { TestBed } from '@angular/core/testing';
import { StorageService } from './storage.service';
import localForage from 'localforage';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    spyOn(localForage, 'config').and.stub();
    spyOn(localForage, 'setItem').and.returnValue(Promise.resolve('stored-value'));
    spyOn(localForage, 'getItem').and.returnValue(Promise.resolve('fetched-value'));
    spyOn(localForage, 'removeItem').and.returnValue(Promise.resolve());

    TestBed.configureTestingModule({
      providers: [StorageService]
    });

    service = TestBed.inject(StorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(localForage.config).toHaveBeenCalled();
  });

  it('should call setItem with correct arguments', async () => {
    const result = await service.set('key1', 'value1');
    expect(localForage.setItem).toHaveBeenCalledWith('key1', 'value1');
    expect(result).toBe('stored-value');
  });

  it('should call getItem with correct key', async () => {
    const result = await service.get('key2');
    expect(localForage.getItem).toHaveBeenCalledWith('key2');
    expect(result).toBe('fetched-value');
  });

  it('should call removeItem with correct key', async () => {
    await service.remove('key3');
    expect(localForage.removeItem).toHaveBeenCalledWith('key3');
  });
});
