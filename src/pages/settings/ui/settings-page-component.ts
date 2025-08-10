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
  settings: Record<SettingKey, boolean> = {
    messageNotifications: true,
    soundNotifications: true,
    theme: false,
  };

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

  constructor() {
    this.loadSettings();
  }

  toggle(key: SettingKey, value: boolean) {
    this.settings[key] = value;
    localStorage.setItem('settings', JSON.stringify(this.settings));
  }

  private loadSettings() {
    const saved = localStorage.getItem('settings');
    if (saved) {
      this.settings = { ...this.settings, ...JSON.parse(saved) };
    }
  }
}