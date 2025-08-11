import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'shared-search-input',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl:'./search-input.component.html',
  })
  export class SearchInputComponent {
    @Input() query = '';
    @Input() placeholder = '';
    @Output() queryChange = new EventEmitter<string>();
    @Output() search = new EventEmitter<void>();
    @Output() clear = new EventEmitter<void>();
    @Output() focus = new EventEmitter<void>();
  }
  