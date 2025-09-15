import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingKey } from '../../../shared/setting-key';
import { SwitcherComponent } from '../../../shared/ui-elements';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, SwitcherComponent],
  templateUrl: './settings-page-component.html',
})
export class SettingsPageComponent {
  settings: Record<SettingKey, any> = {
    messageNotifications: true,
    soundNotifications: true,
    theme: '',
    language: 'en',
  };

  themeDropdownOpen = false;
  languageDropdownOpen = false;

  readonly notificationSettings: {
    key: SettingKey;
    title: string;
    desc: string;
  }[] = [
    {
      key: 'messageNotifications',
      title: 'Message Notifications',
      desc: 'Receive notifications for new messages',
    },
    {
      key: 'soundNotifications',
      title: 'Sound Notifications',
      desc: 'Play sound when receiving messages',
    },
  ];

  readonly appearanceSettings: {
    key: SettingKey;
    title: string;
    desc: string;
  }[] = [
    {
      key: 'theme',
      title: 'Theme',
      desc: 'Use your theme for the interface',
    }
  ];

  readonly languageSettings: {
    key: SettingKey;
    title: string;
    desc: string;
  }[] = [
    {
      key: 'language',
      title: 'Language',
      desc: 'Select your preferred language',
    }
  ];

  readonly themeOptions = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' }
  ];

  readonly languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'uk', label: 'Українська' },
    { value: 'de', label: 'Deutsch' },
    { value: 'fr', label: 'Français' }
  ];

  constructor() {
    this.loadSettings();
  }

  toggle(key: SettingKey, value: boolean) {
    this.settings[key] = value;
    localStorage.setItem('settings', JSON.stringify(this.settings));
  }

  selectTheme(theme: string) {
    this.settings['theme'] = theme;
    this.themeDropdownOpen = false;
    localStorage.setItem('settings', JSON.stringify(this.settings));
  }

  selectLanguage(language: string) {
    this.settings['language'] = language;
    this.languageDropdownOpen = false;
    localStorage.setItem('settings', JSON.stringify(this.settings));
  }

  toggleThemeDropdown() {
    this.themeDropdownOpen = !this.themeDropdownOpen;
    this.languageDropdownOpen = false;
  }

  toggleLanguageDropdown() {
    this.languageDropdownOpen = !this.languageDropdownOpen;
    this.themeDropdownOpen = false;
  }

  getSelectedTheme() {
    return this.themeOptions.find(option => option.value === this.settings['theme']) || this.themeOptions[0];
  }

  getSelectedLanguage() {
    return this.languageOptions.find(option => option.value === this.settings['language']) || this.languageOptions[0];
  }

  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-dropdown')) {
      this.themeDropdownOpen = false;
      this.languageDropdownOpen = false;
    }
  }

  private loadSettings() {
    const saved = localStorage.getItem('settings');
    if (saved) {
      this.settings = { ...this.settings, ...JSON.parse(saved) };
    }
  }
}