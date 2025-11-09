import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { GroupNavigationService } from './group-navigation.service';
import { GroupUserStateService } from './group-user-state.service';
import { GroupMessageStateService } from './group-message-state.service';
import { GroupMessagesApiService } from '../api/group-message/group-messages.api';
import { GroupChat } from './group.chat';

describe('GroupNavigationService', () => {
  let service: GroupNavigationService;
  let userStateSpy: jasmine.SpyObj<GroupUserStateService>;
  let messageStateSpy: jasmine.SpyObj<GroupMessageStateService>;
  let messagesApiSpy: jasmine.SpyObj<GroupMessagesApiService>;

  beforeEach(() => {
    userStateSpy = jasmine.createSpyObj('GroupUserStateService', ['setSelectedGroup', 'clearSelection']);
    messageStateSpy = jasmine.createSpyObj('GroupMessageStateService', ['resetAll', 'forceMessageComponentReload']);
    messagesApiSpy = jasmine.createSpyObj('GroupMessagesApiService', ['loadChatHistory']);

    messagesApiSpy.loadChatHistory.and.returnValue(of([]));

    TestBed.configureTestingModule({
      providers: [
        GroupNavigationService,
        { provide: GroupUserStateService, useValue: userStateSpy },
        { provide: GroupMessageStateService, useValue: messageStateSpy },
        { provide: GroupMessagesApiService, useValue: messagesApiSpy },
      ]
    });

    service = TestBed.inject(GroupNavigationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should reset selected group', () => {
    service.resetSelectedGroup();

    expect(userStateSpy.clearSelection).toHaveBeenCalled();
    expect(messageStateSpy.resetAll).toHaveBeenCalled();
  });

  it('should select group and load history if groupId exists', () => {
    const chat: GroupChat = {
        groupId: '123', groupName: 'Test Group', image: 'img.png',
        description: '',
        admin: '',
        users: [],
        members: []
    };

    service.selectGroup(chat);

    expect(userStateSpy.setSelectedGroup).toHaveBeenCalledWith('123', 'Test Group', 'img.png');
    expect(messageStateSpy.resetAll).toHaveBeenCalled();
    expect(messageStateSpy.forceMessageComponentReload).toHaveBeenCalled();
    expect(messagesApiSpy.loadChatHistory).toHaveBeenCalledWith('123', 20, 0);
  });

  it('should not load history if groupId is empty', () => {
    const chat: GroupChat = {
        groupId: '', groupName: 'Empty', image: '',
        description: '',
        admin: '',
        users: [],
        members: []
    };

    service.selectGroup(chat);

    expect(messagesApiSpy.loadChatHistory).not.toHaveBeenCalled();
  });

  it('should select group by ids and load history', () => {
    service.selectGroupByIds('456', 'Another Group', 'img2.png');

    expect(userStateSpy.setSelectedGroup).toHaveBeenCalledWith('456', 'Another Group', 'img2.png');
    expect(messageStateSpy.resetAll).toHaveBeenCalled();
    expect(messageStateSpy.forceMessageComponentReload).toHaveBeenCalled();
    expect(messagesApiSpy.loadChatHistory).toHaveBeenCalledWith('456', 20, 0);
  });
});
