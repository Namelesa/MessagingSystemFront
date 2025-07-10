import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-email-confirmation-page',
  imports : [CommonModule],
  templateUrl: './email-confirmation-page.html',
})
export class EmailConfirmedPageComponent {
  status = '';
  message = '';

  constructor(private route: ActivatedRoute) {
    this.route.queryParams.subscribe(params => {
      this.status = params['status'];
      this.message = params['message'] || '';
    });
  }
}
