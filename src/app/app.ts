import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeSwitcherComponent } from '../shared/ui-elements';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ThemeSwitcherComponent],
  template: `
    <app-theme-switcher class="fixed top-3 right-4 z-50" />
    <router-outlet />
  `
})
export class App {
  constructor(private translate: TranslateService) {
    this.translate.addLangs(['en', 'de', 'uk', 'es']);
    this.translate.setFallbackLang('en');
  
    const savedSettings = localStorage.getItem('settings');
    let lang = 'en';
  
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        if (parsed.language) {
          lang = parsed.language;
        }
      } catch (e) {
        console.error('Failed to parse settings from localStorage', e);
      }
    } else {
      lang = this.translate.getBrowserLang() || 'en';
    }
  
    this.translate.use(lang);
  }  
}
