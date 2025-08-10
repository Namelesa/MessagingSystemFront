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
}
