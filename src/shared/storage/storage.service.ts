import { Injectable } from '@angular/core';
import localForage from 'localforage';

@Injectable({ providedIn: 'root' })
export class StorageService {
  constructor() {
    localForage.config({ name: 'MyAppStorage' });
  }

  set(key: string, value: string): Promise<string> {
    return localForage.setItem(key, value);
  }

  get(key: string): Promise<string | null> {
    return localForage.getItem(key);
  }

  remove(key: string): Promise<void> {
    return localForage.removeItem(key);
  }

  navigateToOtoChat(userData: { nickName: string, image: string }): void {
    localStorage.setItem('openChatWithUser', JSON.stringify(userData));
    window.location.href = '/otoChats';
  }

  getOpenChatUserData(): { nickName: string, image: string } | null {
    const data = localStorage.getItem('openChatWithUser');
    if (data) {
      localStorage.removeItem('openChatWithUser'); 
      return JSON.parse(data);
    }
    return null;
  }
}
