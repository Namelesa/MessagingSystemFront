import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'shared-switch-toggle',
  standalone: true,
  templateUrl: './switcher.html',
})
export class SwitcherComponent {
  @Input() checked = false;
  @Output() toggled = new EventEmitter<boolean>();

  onChange(event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.toggled.emit(isChecked);
  }
}
