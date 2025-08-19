import { TestBed } from '@angular/core/testing';
import { ToastService, ToastData } from '../toast-notification';
import { take } from 'rxjs/operators';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should emit toast data when show() is called', (done) => {
    const message = 'Test message';
    const type: 'success' = 'success';

    service.toast$.pipe(take(1)).subscribe((data: ToastData) => {
      expect(data.message).toBe(message);
      expect(data.type).toBe(type);
      done();
    });

    service.show(message, type);
  });

  it('should emit error type toast', (done) => {
    const message = 'Error message';
    const type: 'error' = 'error';

    service.toast$.pipe(take(1)).subscribe((data: ToastData) => {
      expect(data.message).toBe(message);
      expect(data.type).toBe(type);
      done();
    });

    service.show(message, type);
  });

  it('should default to success type if type not provided', (done) => {
    const message = 'Default success';

    service.toast$.pipe(take(1)).subscribe((data: ToastData) => {
      expect(data.message).toBe(message);
      expect(data.type).toBe('success');
      done();
    });

    service.show(message);
  });
});
