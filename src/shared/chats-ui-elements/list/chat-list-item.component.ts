import { Component, Input, Output, EventEmitter, ContentChild, TemplateRef, AfterContentInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'shared-chat-list-item',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './chat-list-item.component.html',
  })
  export class ChatListItemComponent implements AfterContentInit {
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
  