import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarNavItemComponent } from '../../../shared/ui-elements/side-bar-buttons';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../entities/user/api/auht.service';
import { ProfileApiResult } from '../../../shared/api-result';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sidebar-widget',
  standalone: true,
  imports: [SidebarNavItemComponent, CommonModule, RouterModule, LucideAngularModule],
  providers: [],
  templateUrl: './navigation.side.bar.html',
})
export class NavigationSideBarComponent implements OnInit, OnDestroy {
  userAvatarUrl?: string;
  userInitials = 'U';
  isLoggedIn = false;
  showContextMenu = false;
  contextMenuPosition = { x: 0, y: 0 };
  
  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (this.showContextMenu) {
      const target = event.target as HTMLElement;
      if (!target.closest('.context-menu') && !target.closest('.avatar-container')) {
        this.closeContextMenu();
      }
    }
  }

  @HostListener('document:contextmenu', ['$event'])
  onDocumentContextMenu(event: MouseEvent) {
    // Закрываем контекстное меню, если правый клик не по аватару
    const target = event.target as HTMLElement;
    if (!target.closest('.avatar-container')) {
      this.closeContextMenu();
    }
  }

  ngOnInit() {
    const profileSub = this.authService.userProfile$.subscribe((profile: ProfileApiResult | null) => {
      if (profile) {
        this.userAvatarUrl = profile.image;
        this.userInitials = this.getInitials(profile);
      } else {
        this.userAvatarUrl = undefined;
        this.userInitials = 'U';
      }
    });

    const authSub = this.authService.isLoggedIn$.subscribe((isLoggedIn: boolean) => {
      this.isLoggedIn = isLoggedIn;
      if (!isLoggedIn) {
        this.userAvatarUrl = undefined;
        this.userInitials = 'U';
      }
    });

    this.subscriptions.push(profileSub, authSub);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  onAvatarLeftClick(event: MouseEvent) {
    if (this.showContextMenu) {
      this.closeContextMenu();
    }
  }

  onAvatarRightClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    if (this.isLoggedIn) {
      this.showContextMenu = !this.showContextMenu;
    }
  }

  closeContextMenu() {
    this.showContextMenu = false;
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => {
        this.closeContextMenu();
      },
      error: (error) => {
        console.error('Logout error:', error);
        this.closeContextMenu();
      }
    });
  }

  private getInitials(profile: ProfileApiResult): string {
    const firstInitial = profile.firstName?.charAt(0)?.toUpperCase() || '';
    const lastInitial = profile.lastName?.charAt(0)?.toUpperCase() || '';
    return firstInitial + lastInitial || profile.nickName?.charAt(0)?.toUpperCase() || 'U';
  }
}