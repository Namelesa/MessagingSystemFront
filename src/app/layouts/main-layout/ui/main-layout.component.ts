import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavigationSideBarComponent } from '../../../../widgets/navigation-side-bar';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, NavigationSideBarComponent],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent {}
