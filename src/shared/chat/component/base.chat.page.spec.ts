import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { BaseChatPageComponent } from './base.chat.page';
import { BaseChatApiService } from '../service/base.chat.hub.api';

@Component({
  template: '<div>Test Component</div>',
  standalone: true
})
class TestChatPageComponent extends BaseChatPageComponent {
  protected apiService: BaseChatApiService<any>;

  constructor(apiService: BaseChatApiService<any>) {
    super();
    this.apiService = apiService;
  }
}

class MockBaseChatApiService {
  connect = jasmine.createSpy('connect');
  disconnect = jasmine.createSpy('disconnect');
  loadChatHistory = jasmine.createSpy('loadChatHistory');
}

describe('BaseChatPageComponent', () => {
  let component: TestChatPageComponent;
  let fixture: ComponentFixture<TestChatPageComponent>;
  let mockApiService: MockBaseChatApiService;

  beforeEach(async () => {
    mockApiService = new MockBaseChatApiService();

    await TestBed.configureTestingModule({
      imports: [TestChatPageComponent],
      providers: [
        { provide: BaseChatApiService, useValue: mockApiService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TestChatPageComponent);
    component = fixture.componentInstance;
    component['apiService'] = mockApiService as any;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Component initialization', () => {
    it('should initialize selectedChat$ as BehaviorSubject with null value', () => {
      expect(component.selectedChat$).toBeInstanceOf(BehaviorSubject);
      expect(component.selectedChat$.getValue()).toBeNull();
    });

    it('should have undefined accessToken initially', () => {
      expect(component.accessToken).toBeUndefined();
    });

    it('should have undefined selectedChat initially', () => {
      expect(component.selectedChat).toBeUndefined();
    });

    it('should have undefined selectedChatImage initially', () => {
      expect(component.selectedChatImage).toBeUndefined();
    });
  });

  describe('ngOnInit', () => {
    it('should call apiService.connect()', () => {
      component.ngOnInit();
      expect(mockApiService.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('ngOnDestroy', () => {
    it('should call apiService.disconnect()', () => {
      component.ngOnDestroy();
      expect(mockApiService.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('onChatSelected', () => {
    const testChat = 'test-chat-id';
    const testImage = 'test-image-url';

    beforeEach(() => {
      component.onChatSelected(testChat, testImage);
    });

    it('should update selectedChat$ with the provided chat value', () => {
      expect(component.selectedChat$.getValue()).toBe(testChat);
    });

    it('should update selectedChatImage with the provided image value', () => {
      expect(component.selectedChatImage).toBe(testImage);
    });

    it('should call apiService.loadChatHistory with correct parameters', () => {
      expect(mockApiService.loadChatHistory).toHaveBeenCalledWith(testChat, 20, 0);
    });

    it('should call apiService.loadChatHistory only once', () => {
      expect(mockApiService.loadChatHistory).toHaveBeenCalledTimes(1);
    });
  });

  describe('Multiple chat selections', () => {
    it('should update selectedChat$ value when different chats are selected', () => {
      const firstChat = 'first-chat';
      const secondChat = 'second-chat';
      const testImage = 'test-image';

      component.onChatSelected(firstChat, testImage);
      expect(component.selectedChat$.getValue()).toBe(firstChat);

      component.onChatSelected(secondChat, testImage);
      expect(component.selectedChat$.getValue()).toBe(secondChat);
    });

    it('should call loadChatHistory for each chat selection', () => {
      component.onChatSelected('chat1', 'image1');
      component.onChatSelected('chat2', 'image2');
      
      expect(mockApiService.loadChatHistory).toHaveBeenCalledTimes(2);
    });
  });

  describe('selectedChat$ BehaviorSubject behavior', () => {
    it('should emit new values when onChatSelected is called', (done) => {
      const testChat = 'observable-test-chat';
      const testImage = 'test-image';

      component.selectedChat$.subscribe(value => {
        if (value === testChat) {
          expect(value).toBe(testChat);
          done();
        }
      });

      component.onChatSelected(testChat, testImage);
    });

    it('should maintain the last emitted value', () => {
      const chat1 = 'chat-1';
      const chat2 = 'chat-2';
      
      component.onChatSelected(chat1, 'image1');
      expect(component.selectedChat$.getValue()).toBe(chat1);
      
      component.onChatSelected(chat2, 'image2');
      expect(component.selectedChat$.getValue()).toBe(chat2);
    });
  });

  describe('Error handling', () => {
    it('should handle empty string chat selection', () => {
      expect(() => component.onChatSelected('', 'image')).not.toThrow();
      expect(component.selectedChat$.getValue()).toBe('');
    });

    it('should handle empty string image selection', () => {
      expect(() => component.onChatSelected('chat', '')).not.toThrow();
      expect(component.selectedChatImage).toBe('');
    });

    it('should handle null values in onChatSelected', () => {
      expect(() => component.onChatSelected(null as any, null as any)).not.toThrow();
      expect(component.selectedChat$.getValue()).toBeNull();
      expect(component.selectedChatImage).toBeNull();
    });
  });
});