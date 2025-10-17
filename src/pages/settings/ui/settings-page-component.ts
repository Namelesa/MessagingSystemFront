import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateService, TranslateModule } from '@ngx-translate/core'; 
import { SettingKey, Theme, SettingsService } from '../../../shared/setting-key';
import { SwitcherComponent } from '../../../shared/ui-elements';
import { NotificationService } from '../../../shared/notification';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, SwitcherComponent, TranslateModule],
  templateUrl: './settings-page-component.html',
})
export class SettingsPageComponent implements OnInit {
  settings: Record<SettingKey, any> = {
    messageNotifications: true,
    soundNotifications: true,
    theme: 'light',
    language: 'en',
  };

  languageDropdownOpen = false;
  notificationSupported = false;
  notificationStatus: string = '';

  readonly themeOptions: { value: Theme; label: string; color: string }[] = [
    { value: 'light', label: 'Light', color: 'linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)' },
    { value: 'dark', label: 'Dark', color: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' },
    { value: 'ocean', label: 'Ocean', color: 'linear-gradient(135deg, #0c4a6e 0%, #075985 100%)' },
    { value: 'forest', label: 'Forest', color: 'linear-gradient(135deg, #14532d 0%, #166534 100%)' },
    { value: 'sunset', label: 'Sunset', color: 'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)' },
    { value: 'purple', label: 'Purple', color: 'linear-gradient(135deg, #581c87 0%, #7e22ce 100%)' },
    { value: 'rose', label: 'Rose', color: 'linear-gradient(135deg, #881337 0%, #be123c 100%)' },
    { value: 'amber', label: 'Amber', color: 'linear-gradient(135deg, #78350f 0%, #b45309 100%)' },
  ];

  readonly languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'uk', label: 'Українська' },
    { value: 'de', label: 'Deutsch' },
    { value: 'es', label: 'Español' }
  ];

  constructor(
    private translate: TranslateService, 
    private settingsService: SettingsService,
    private notificationService: NotificationService
  ) {
    this.loadSettings();
    this.settingsService.settings$.subscribe(settings => {
      this.settings = settings;
      this.translate.use(settings.language);
    });
  }

  ngOnInit() {
    this.checkNotificationSupport();
    this.syncNotificationPermission();
  }

  checkNotificationSupport() {
    const permission = this.notificationService.getPermission();
    this.notificationSupported = permission !== 'unsupported';
    
    if (!this.notificationSupported) {
      this.notificationStatus = 'Notifications not supported in this browser';
    } else {
      this.updateNotificationStatus();
    }
  }

  updateNotificationStatus() {
    const permission = this.notificationService.getPermission();
    switch(permission) {
      case 'granted':
        this.notificationStatus = 'Notifications enabled ✓';
        break;
      case 'denied':
        this.notificationStatus = 'Notifications blocked - check browser settings';
        break;
      case 'default':
        this.notificationStatus = 'Click to enable notifications';
        break;
      default:
        this.notificationStatus = 'Notifications not available';
    }
  }

  async toggle(key: SettingKey, value: boolean) {
    this.settingsService.set(key, value);
  
    if (key === 'messageNotifications') {
      if (value) {
        const permission = await this.notificationService.requestPermission();
        if (permission === 'granted') {
          this.settings.messageNotifications = true;
          this.updateNotificationStatus();
        } else {
          this.settings.messageNotifications = false;
          alert('Please enable notifications in your browser settings.');
        }
      } else {
        alert('To fully disable notifications, please block them in browser settings.');
      }
    }
  
    if (key === 'soundNotifications') {
      this.settings.soundNotifications = value;
    }
  }

  syncNotificationPermission() {
    const permission = this.notificationService.getPermission();
    if (permission === 'granted') {
      this.settings.messageNotifications = true;
    } else {
      this.settings.messageNotifications = false;
    }
  }

  selectTheme(theme: Theme) {
    this.settingsService.set('theme', theme);
  }  

  selectLanguage(language: string) {
    this.settingsService.set('language', language);
    this.languageDropdownOpen = false;
    this.translate.use(language);
  }

  toggleLanguageDropdown() {
    this.languageDropdownOpen = !this.languageDropdownOpen;
  }

  getSelectedLanguage() {
    return this.languageOptions.find(option => option.value === this.settings['language']) || this.languageOptions[0];
  }

  onMouseEnter(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target) {
      target.style.backgroundColor = 'var(--bg-tertiary)';
    }
  }

  onMouseLeave(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target) {
      target.style.backgroundColor = 'transparent';
    }
  }

  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-dropdown')) {
      this.languageDropdownOpen = false;
    }
  }

  private loadSettings() {
    const saved = localStorage.getItem('settings');
    if (saved) {
      this.settings = { ...this.settings, ...JSON.parse(saved) };
    }
  }

  async enableNotifications() {
    const permission = await this.notificationService.requestPermission();
    if (permission === 'granted') {
      this.settings.messageNotifications = true;
      this.settingsService.set('messageNotifications', true);
      this.updateNotificationStatus();
    } else {
      this.updateNotificationStatus();
    }
  }

  async testNotification() {
    if (!this.notificationSupported) return; 

    const currentPermission = this.notificationService.getPermission();
    if (currentPermission !== 'granted') {
      const permission = await this.notificationService.requestPermission();
      
      if (permission !== 'granted') {
        this.updateNotificationStatus();
        return;
      }
      this.updateNotificationStatus();
    }

    try {
      this.notificationService.showNotification('Test Notification', {
        body: 'This is a test notification! 🎉',
        icon: '/assets/icon.png', 
        badge: '/assets/badge.png',
        tag: 'test-notification',
        requireInteraction: false,
        silent: false
      });

    } catch (error) {
      console.error('❌ Error showing notification:', error);
    }
  }
}