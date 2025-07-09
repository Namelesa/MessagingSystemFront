import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeSwitcherComponent } from '../shared/ui-elements';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ThemeSwitcherComponent],
  template: `
    <app-theme-switcher class="fixed top-4 right-4 z-50" />
    <router-outlet />
  `
})
export class App {}
