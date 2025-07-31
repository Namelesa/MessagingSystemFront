import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'shared-send-message-area',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl:'./send-message-area.component.html',
  })
  export class SendAreaComponent {
  }
  