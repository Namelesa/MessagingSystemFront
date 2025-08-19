import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastComponent } from '../toast-notification';
import { ToastService, ToastData } from '../toast-notification';
import { Subject } from 'rxjs';

describe('ToastComponent', () => {
  let component: ToastComponent;
  let fixture: ComponentFixture<ToastComponent>;
  let toastService: ToastService;
  let toastSubject: Subject<ToastData>;

  beforeEach(async () => {
    toastSubject = new Subject<ToastData>();

    await TestBed.configureTestingModule({
      imports: [ToastComponent],
      providers: [
        { 
          provide: ToastService, 
          useValue: { toast$: toastSubject.asObservable() } 
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ToastComponent);
    component = fixture.componentInstance;
    toastService = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display toast message and type', () => {
    const testToast: ToastData = { message: 'Test success', type: 'success' };
    toastSubject.next(testToast);

    expect(component.message).toBe('Test success');
    expect(component.type).toBe('success');
    expect(component.visible).toBeTrue();
  });

  it('should hide toast after 3 seconds', fakeAsync(() => {
    const testToast: ToastData = { message: 'Test hide', type: 'error' };
    toastSubject.next(testToast);

    expect(component.visible).toBeTrue();

    tick(3000);
    expect(component.visible).toBeFalse();
  }));

  it('should clear previous timeout when new toast arrives', fakeAsync(() => {
    const firstToast: ToastData = { message: 'First', type: 'success' };
    toastSubject.next(firstToast);
    tick(1500);

    const secondToast: ToastData = { message: 'Second', type: 'error' };
    toastSubject.next(secondToast);

    tick(1500);
    expect(component.visible).toBeTrue();
    expect(component.message).toBe('Second');

    tick(1500);
    expect(component.visible).toBeFalse();
  }));
});
