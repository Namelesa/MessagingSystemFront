import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfilePageStore } from '../model/user-profile.store';
import { InputComponent, ToastComponent } from '../../../shared/ui-elements';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule, InputComponent, ToastComponent],
  providers: [ProfilePageStore],
  templateUrl: './user-profile-page.html',
})
export class ProfilePageComponent implements OnDestroy {
  
  constructor(public store: ProfilePageStore) {}

  ngOnDestroy(): void {
    this.store.dispose();
  }
}