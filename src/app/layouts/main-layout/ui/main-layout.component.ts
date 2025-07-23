import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { NavigationSideBarComponent } from '../../../../widgets/navigation-side-bar';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, NavigationSideBarComponent, NgIf],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  isSidebarOpen = false;
  private routerSub?: Subscription;

  constructor(private router: Router) {}

  ngOnInit() {
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.isSidebarOpen = false;
      }
    });
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
  }

  openSidebar() {
    this.isSidebarOpen = true;
  }

  closeSidebar() {
    this.isSidebarOpen = false;
  }
}
