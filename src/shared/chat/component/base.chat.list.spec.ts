import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { BaseChatListComponent } from './base.chat.list';

interface Chat {
  nickname: string;
  image: string;
  groupId?: string;
}

@Component({
  template: '',
  standalone: true
})
class TestChatComponent extends BaseChatListComponent<Chat> {
  public apiService = {
    connected: jasmine.createSpy('connected'),
    disconnect: jasmine.createSpy('disconnect'),
    chats$: of([{ nickname: 'John', image: 'john.png', groupId: '1' }]),
    loading$: of(true),
    error$: of(null)
  };
}

describe('BaseChatListComponent', () => {
  let component: TestChatComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestChatComponent]
    }).compileComponents();

    const fixture = TestBed.createComponent(TestChatComponent);
    component = fixture.componentInstance;
  });

  it('should call apiService.connected on init', () => {
    component.ngOnInit();
    expect(component.apiService.connected).toHaveBeenCalled();
  });

  it('should assign chats$, loading$, and error$ on init', () => {
    component.ngOnInit();
    component.chats$.subscribe(chats => expect(chats).toEqual([{ nickname: 'John', image: 'john.png', groupId: '1' }]));
    component.loading$.subscribe(loading => expect(loading).toBeTrue());
    component.error$.subscribe(error => expect(error).toBeNull());
  });

  it('should call apiService.disconnect on destroy', () => {
    component.ngOnDestroy();
    expect(component.apiService.disconnect).toHaveBeenCalled();
  });

  it('should select chat correctly', () => {
    spyOn(component.selectChat, 'emit');
    component.onSelectChat('Alice', 'alice.png', '2');
    expect(component.selectedNickname).toBe('Alice');
    expect(component.selectedNicknameImage).toBe('alice.png');
    expect(component.selectChat.emit).toHaveBeenCalledWith({ nickname: 'Alice', image: 'alice.png', groupId: '2' });
  });

  it('should clear search when query is empty', () => {
    component.searchQuery = '';
    component.searchResults = ['test'];
    component.onSearchChange();
    expect(component.searchResults).toEqual([]);
  });

  it('should clear search', () => {
    component.searchQuery = 'test';
    component.searchResults = ['result'];
    component.clearSearch();
    expect(component.searchQuery).toBe('');
    expect(component.searchResults).toEqual([]);
  });

  it('should start chat and clear search', () => {
    spyOn(component, 'onSelectChat');
    component.searchQuery = 'test';
    component.searchResults = ['result'];
    component.startChat('Bob', 'bob.png', '3');
    expect(component.searchQuery).toBe('');
    expect(component.searchResults).toEqual([]);
    expect(component.onSelectChat).toHaveBeenCalledWith('Bob', 'bob.png', '3');
  });

  it('should keep searchResults unchanged when query is non-empty', () => {
    component.searchQuery = 'hello';
    component.searchResults = ['existing'];
    component.onSearchChange();
    expect(component.searchResults).toEqual(['existing']);
  });  
});
