import { Component, Input, Output, EventEmitter, ContentChild, TemplateRef, AfterContentInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'shared-list-item',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './list-item.component.html',
  })
  export class ListItemComponent implements AfterContentInit {
    @Input() name = '';
    @Input() image = '';
    @Input() active = false;
    @Output() click = new EventEmitter<void>();
    @ContentChild('icon', { static: false, read: TemplateRef }) iconContent?: TemplateRef<any>;

    ngAfterContentInit() {}

    hasIconContent(): boolean {
      return !!this.iconContent;
    }
  }
  