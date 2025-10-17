import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  getPermission(): NotificationPermission | 'unsupported' {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  }

  requestPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications.');
      return Promise.resolve('unsupported');
    }
    return Notification.requestPermission();
  }

  showNotification(title: string, options?: NotificationOptions): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, options);
    } else {
      console.warn('Notifications are not permitted or supported.');
    }
  }
}