import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SettingKey } from '../../../shared/types/setting-key';
import { SwitcherComponent } from '../../../shared/ui-elements';

@Component({
  selector: 'widgets-settings-widget',
  standalone: true,
  imports: [CommonModule, SwitcherComponent],
  templateUrl: './settings.widget.html',
})
export class SettingsWidgetComponent {
  @Input() settings!: Record<SettingKey, boolean>;
  @Output() settingChanged = new EventEmitter<{ key: SettingKey; value: boolean }>();

  toggle(key: SettingKey, value: boolean) {
    this.settingChanged.emit({ key, value });
  }

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
}
