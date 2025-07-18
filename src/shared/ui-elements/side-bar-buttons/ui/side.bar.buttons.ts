import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'ui-sidebar-button',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterModule,
    LucideAngularModule,
  ],
  templateUrl: './side.bar.buttons.html',
})
export class SidebarNavItemComponent {
  @Input() icon?: string;
  @Input() route!: string;
  @Input() iconClass?: string;
  @Input() isAvatar = false;
  @Input() avatarText = 'W';
  @Input() avatarUrl?: string;
}