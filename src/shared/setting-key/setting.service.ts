import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'light' | 'dark' | 'ocean' | 'forest' | 'sunset' | 'purple' | 'rose' | 'amber';

export type SettingKey = keyof AppSettings;

export interface AppSettings {
  theme: Theme;
  language: string;
  messageNotifications: boolean;
  soundNotifications: boolean;
}

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private storageKey = 'settings';
  
  private settingsSubject = new BehaviorSubject<AppSettings>({
    theme: 'light',
    language: 'en',
    messageNotifications: true,
    soundNotifications: true,
    ...this.loadFromStorage()
  });

  settings$ = this.settingsSubject.asObservable();

  constructor() {
    this.applyTheme(this.settingsSubject.value.theme);
  }

  private loadFromStorage(): Partial<AppSettings> {
    const saved = localStorage.getItem(this.storageKey);
    return saved ? JSON.parse(saved) : {};
  }

  private saveToStorage(settings: AppSettings) {
    localStorage.setItem(this.storageKey, JSON.stringify(settings));
  }

  get settings(): AppSettings {
    return this.settingsSubject.value;
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    const updated = { ...this.settings, [key]: value };
    this.settingsSubject.next(updated);
    this.saveToStorage(updated);

    if (key === 'theme') {
      this.applyTheme(value as Theme);
    }
  }

  private applyTheme(theme: Theme) {
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', theme);
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }
}