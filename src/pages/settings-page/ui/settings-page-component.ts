import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingsWidgetComponent } from '../../../widgets/settings-widget';
import { SettingKey } from '../../../shared/types/setting-key';


@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, SettingsWidgetComponent],
  templateUrl : './settings-page-component.html',
})
export class SettingsPageComponent {
  settings: Record<SettingKey, boolean> = {
    messageNotifications: true,
    soundNotifications: true,
    theme: false,
  };

  constructor() {
    this.loadSettings();
  }

  onToggle(key: SettingKey, value: boolean) {
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