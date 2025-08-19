import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatLayoutComponent } from './chat.page.component';
import { Component } from '@angular/core';

@Component({
  standalone: true,
  imports: [ChatLayoutComponent],
  template: `
    <app-chat-layout
      [selectedChat]="selectedChat"
      [selectedChatImage]="selectedChatImage"
      [groupId]="groupId"
      (headerClick)="onHeaderClick()"
    ></app-chat-layout>
  `
})
class TestHostComponent {
  selectedChat = 'Chat #1';
  selectedChatImage = '/assets/chat.png';
  groupId = 'group-123';
  headerClicked = false;

  onHeaderClick() {
    this.headerClicked = true;
  }
}

describe('ChatLayoutComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should receive @Input values', () => {
    const comp = fixture.debugElement.children[0].componentInstance as ChatLayoutComponent;

    expect(comp.selectedChat).toBe('Chat #1');
    expect(comp.selectedChatImage).toBe('/assets/chat.png');
    expect(comp.groupId).toBe('group-123');
  });

  it('should update @Input values when host changes', () => {
    const host = fixture.componentInstance;
    host.selectedChat = 'Chat #2';
    host.selectedChatImage = '/assets/chat2.png';
    host.groupId = 'group-456';
    fixture.detectChanges();

    const comp = fixture.debugElement.children[0].componentInstance as ChatLayoutComponent;
    expect(comp.selectedChat).toBe('Chat #2');
    expect(comp.selectedChatImage).toBe('/assets/chat2.png');
    expect(comp.groupId).toBe('group-456');
  });

  it('should emit headerClick when triggered', () => {
    const comp = fixture.debugElement.children[0].componentInstance as ChatLayoutComponent;

    spyOn(comp.headerClick, 'emit');
    comp.headerClick.emit();
    expect(comp.headerClick.emit).toHaveBeenCalled();
  });

  it('should call host handler when headerClick emitted', () => {
    const host = fixture.componentInstance;
    const comp = fixture.debugElement.children[0].componentInstance as ChatLayoutComponent;

    comp.headerClick.emit();
    expect(host.headerClicked).toBeTrue();
  });
});
