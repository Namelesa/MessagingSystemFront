import { Component, OnInit, Inject } from '@angular/core';
import { NgIf } from '@angular/common';
import { SettingsService } from '../../../setting-key';

@Component({
  selector: 'app-theme-switcher',
  standalone: true,
  imports: [NgIf],
  templateUrl: './theme-switcher.component.html',
})
export class ThemeSwitcherComponent{
  isDark = false;

  constructor(@Inject(SettingsService) private settings: SettingsService) {
    this.settings.settings$.subscribe(settings => {
      this.isDark = settings.theme === 'dark';
    });
  }

  toggleTheme() {
    const newTheme = this.isDark ? 'light' : 'dark';
    this.settings.set('theme', newTheme);
  }  
}
