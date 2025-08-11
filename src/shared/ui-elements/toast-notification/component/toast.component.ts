import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastData } from '../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
})
export class ToastComponent implements OnInit {
  message = '';
  type: 'success' | 'error' = 'success';
  visible = false;
  private timeoutId?: any;

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.toastService.toast$.subscribe(({ message, type }: ToastData) => {
      this.message = message;
      this.type = type;
      this.visible = true;

      if (this.timeoutId) clearTimeout(this.timeoutId);
      this.timeoutId = setTimeout(() => (this.visible = false), 3000);
    });
  }
}