import { TestBed } from '@angular/core/testing';
import { UserSearchService, UserSearchState } from '../user-search.service';
import { FindUserStore } from '../../../../features/search-user';
import { of } from 'rxjs';

describe('UserSearchService', () => {
  let service: UserSearchService;
  let findUserStoreSpy: jasmine.SpyObj<FindUserStore>;

  beforeEach(() => {
    findUserStoreSpy = jasmine.createSpyObj('FindUserStore', ['findUser', 'clearUser'], {
      user$: of(null)
    });

    TestBed.configureTestingModule({
      providers: [
        UserSearchService,
        { provide: FindUserStore, useValue: findUserStoreSpy }
      ]
    });

    service = TestBed.inject(UserSearchService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return current search state', () => {
    const state: UserSearchState = service.getCurrentSearchState();
    expect(state.isSearchFocused).toBeFalse();
    expect(state.searchQuery).toBe('');
    expect(state.searchResults).toEqual([]);
    expect(state.foundUser).toBeUndefined();
  });

  describe('onSearchQueryChange', () => {
    it('should trim query and call findUser if not empty', () => {
      service.onSearchQueryChange('  nick  ');
      expect(service.getCurrentSearchState().searchQuery).toBe('  nick  ');
      expect(findUserStoreSpy.findUser).toHaveBeenCalledWith('nick');
    });

    it('should clear search if query is empty', () => {
      service.onSearchQueryChange('   ');
      expect(service.getCurrentSearchState().searchQuery).toBe('');
      expect(findUserStoreSpy.clearUser).toHaveBeenCalled();
    });
  });

  describe('onSearchFocus', () => {
    it('should set search focus true and clear store user', () => {
      service.onSearchFocus();
      expect(service.getCurrentSearchState().isSearchFocused).toBeTrue();
      expect(findUserStoreSpy.clearUser).toHaveBeenCalled();
    });
  });

  describe('onSearchActiveChange', () => {
    it('should set focus state', () => {
      service.onSearchActiveChange(true);
      expect(service.getCurrentSearchState().isSearchFocused).toBeTrue();
    });

    it('should clear search if deactivated', () => {
      service.onSearchActiveChange(false);
      const state = service.getCurrentSearchState();
      expect(state.isSearchFocused).toBeFalse();
      expect(state.searchQuery).toBe('');
      expect(state.searchResults).toEqual([]);
      expect(state.foundUser).toBeUndefined();
      expect(findUserStoreSpy.clearUser).toHaveBeenCalled();
    });
  });

  describe('clearSearch', () => {
    it('should reset all search state and clear store user', () => {
      service.clearSearch();
      const state = service.getCurrentSearchState();
      expect(state.isSearchFocused).toBeFalse();
      expect(state.searchQuery).toBe('');
      expect(state.searchResults).toEqual([]);
      expect(state.foundUser).toBeUndefined();
      expect(findUserStoreSpy.clearUser).toHaveBeenCalled();
    });
  });

  describe('onSearchResult', () => {
    it('should update search results', () => {
      service.onSearchResult(['user1', 'user2']);
      expect(service.getCurrentSearchState().searchResults).toEqual(['user1', 'user2']);
    });
  });

  describe('onFoundUser', () => {
    it('should set foundUser and clear search', () => {
      const userData = { nick: 'nick1', image: 'img1' };
      service.onFoundUser(userData);
      const state = service.getCurrentSearchState();
      expect(state.isSearchFocused).toBeFalse();
      expect(state.searchQuery).toBe('');
      expect(state.searchResults).toEqual([]);
      expect(findUserStoreSpy.clearUser).toHaveBeenCalled();
    });
  });

  describe('startChatWithUser', () => {
    it('should delegate to onFoundUser', () => {
      const spy = spyOn(service, 'onFoundUser');
      const userData = { nick: 'nick2', image: 'img2' };
      service.startChatWithUser(userData);
      expect(spy).toHaveBeenCalledWith(userData);
    });
  });
});
