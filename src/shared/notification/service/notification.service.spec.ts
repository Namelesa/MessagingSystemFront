import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  const originalNotification = Notification;

  afterEach(() => {
    (window as any).Notification = originalNotification;
  });

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  it('getPermission returns "unsupported" when Notification is missing', () => {
    delete (window as any).Notification;

    const result = service.getPermission();

    expect(result).toBe('unsupported');
  });

  it('getPermission returns Notification.permission when supported', () => {
    (window as any).Notification = { permission: 'granted' };

    const result = service.getPermission();

    expect(result).toBe('granted');
  });

  it('requestPermission logs warning and returns "unsupported" when Notification is missing', async () => {
    delete (window as any).Notification;

    const warnSpy = spyOn(console, 'warn');

    const result = await service.requestPermission();

    expect(warnSpy).toHaveBeenCalledWith('This browser does not support notifications.');
    expect(result).toBe('unsupported');
  });

  it('requestPermission calls Notification.requestPermission when supported', async () => {
    const requestSpy = jasmine.createSpy('requestPermission')
      .and.returnValue(Promise.resolve('granted'));

    (window as any).Notification = { requestPermission: requestSpy };

    const result = await service.requestPermission();

    expect(requestSpy).toHaveBeenCalled();
    expect(result).toBe('granted');
  });

  it('showNotification creates new Notification when permission is granted', () => {
    const newNotifSpy = jasmine.createSpy('NotificationMock');

    (window as any).Notification = function (title: string, options?: NotificationOptions) {
      newNotifSpy(title, options);
    } as any;
    (window as any).Notification.permission = 'granted';

    service.showNotification('Hello', { body: 'World' });

    expect(newNotifSpy).toHaveBeenCalledWith('Hello', { body: 'World' });
  });

  it('showNotification logs warning when permission is not granted', () => {
    const warnSpy = spyOn(console, 'warn');

    (window as any).Notification = { permission: 'denied' } as any;

    service.showNotification('Test');

    expect(warnSpy).toHaveBeenCalledWith(
      'Notifications are not permitted or supported.'
    );
  });

  it('showNotification logs warning when Notification is unsupported', () => {
    delete (window as any).Notification;

    const warnSpy = spyOn(console, 'warn');

    service.showNotification('Hello');

    expect(warnSpy).toHaveBeenCalledWith(
      'Notifications are not permitted or supported.'
    );
  });
});
