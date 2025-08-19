import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { NavigationSideBarComponent } from './navigation.side.bar';
import { AuthService, ProfileApiResult } from '../../../entities/session';

describe('NavigationSideBarComponent', () => {
  let component: NavigationSideBarComponent;
  let fixture: ComponentFixture<NavigationSideBarComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockCdr: jasmine.SpyObj<ChangeDetectorRef>;
  let userProfile$: BehaviorSubject<ProfileApiResult | null>;
  let isLoggedIn$: BehaviorSubject<boolean>;

  const mockProfile: ProfileApiResult = {
    statusCode: '200',
    firstName: 'John',
    lastName: 'Doe',
    login: 'johndoe',
    email: 'test@gmail.com',
    nickName: 'johndoe',
    image: 'http://example.com/avatar.jpg'
  };

  beforeEach(async () => {
    userProfile$ = new BehaviorSubject<ProfileApiResult | null>(null);
    isLoggedIn$ = new BehaviorSubject<boolean>(false);

    mockAuthService = jasmine.createSpyObj('AuthService', ['logout'], {
      userProfile$: userProfile$.asObservable(),
      isLoggedIn$: isLoggedIn$.asObservable()
    });

    mockCdr = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges']);

    await TestBed.configureTestingModule({
      imports: [NavigationSideBarComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ChangeDetectorRef, useValue: mockCdr },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { params: {}, queryParams: {} },
            params: of({}),
            queryParams: of({})
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NavigationSideBarComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize with default values', () => {
      expect(component.userInitials).toBe('U');
      expect(component.isLoggedIn).toBeFalse();
      expect(component.userAvatarUrl).toBeUndefined();
      expect(component.showContextMenu).toBeFalse();
    });

    it('should subscribe to userProfile$ and update user data when profile exists', () => {
      component.ngOnInit();
      
      userProfile$.next(mockProfile);
      
      expect(component.userAvatarUrl).toBe('http://example.com/avatar.jpg');
      expect(component.userInitials).toBe('JD');
    });

    it('should reset user data when profile is null', () => {
      component.userAvatarUrl = 'some-url';
      component.userInitials = 'AB';
      component.ngOnInit();
      
      userProfile$.next(null);
      
      expect(component.userAvatarUrl).toBeUndefined();
      expect(component.userInitials).toBe('U');
    });

    it('should subscribe to isLoggedIn$ and update login status', () => {
      component.ngOnInit();
      
      isLoggedIn$.next(true);
      expect(component.isLoggedIn).toBeTrue();
      
      isLoggedIn$.next(false);
      expect(component.isLoggedIn).toBeFalse();
    });

    it('should reset user data when user logs out', () => {
      component.userAvatarUrl = 'some-url';
      component.userInitials = 'AB';
      component.ngOnInit();
      
      isLoggedIn$.next(false);
      
      expect(component.userAvatarUrl).toBeUndefined();
      expect(component.userInitials).toBe('U');
    });
  });

  describe('ngOnDestroy', () => {
    it('should unsubscribe from all subscriptions', () => {
      component.ngOnInit();
      const subscription1 = component['subscriptions'][0];
      const subscription2 = component['subscriptions'][1];
      
      spyOn(subscription1, 'unsubscribe');
      spyOn(subscription2, 'unsubscribe');
      
      component.ngOnDestroy();
      
      expect(subscription1.unsubscribe).toHaveBeenCalled();
      expect(subscription2.unsubscribe).toHaveBeenCalled();
    });
  });

  describe('getInitials', () => {
    it('should return initials from firstName and lastName', () => {
      const profile = { firstName: 'John', lastName: 'Doe' } as ProfileApiResult;
      const result = component['getInitials'](profile);
      expect(result).toBe('JD');
    });

    it('should return first letter of nickName when no firstName or lastName', () => {
      const profile = { nickName: 'johndoe' } as ProfileApiResult;
      const result = component['getInitials'](profile);
      expect(result).toBe('J');
    });

    it('should return only firstName initial when lastName is empty', () => {
      const profile = { firstName: 'John', lastName: '' } as ProfileApiResult;
      const result = component['getInitials'](profile);
      expect(result).toBe('J');
    });

    it('should return only lastName initial when firstName is empty', () => {
      const profile = { firstName: '', lastName: 'Doe' } as ProfileApiResult;
      const result = component['getInitials'](profile);
      expect(result).toBe('D');
    });

    it('should return U when all name fields are empty', () => {
      const profile = { firstName: '', lastName: '', nickName: '' } as ProfileApiResult;
      const result = component['getInitials'](profile);
      expect(result).toBe('U');
    });

    it('should handle undefined name fields', () => {
      const profile = {} as ProfileApiResult;
      const result = component['getInitials'](profile);
      expect(result).toBe('U');
    });

    it('should convert initials to uppercase', () => {
      const profile = { firstName: 'john', lastName: 'doe' } as ProfileApiResult;
      const result = component['getInitials'](profile);
      expect(result).toBe('JD');
    });
  });

  describe('onAvatarLeftClick', () => {
    it('should close context menu if it is open', () => {
      component.showContextMenu = true;
      const event = new MouseEvent('click');
      
      component.onAvatarLeftClick(event);
      
      expect(component.showContextMenu).toBeFalse();
    });

    it('should do nothing if context menu is already closed', () => {
      component.showContextMenu = false;
      const event = new MouseEvent('click');
      
      component.onAvatarLeftClick(event);
      
      expect(component.showContextMenu).toBeFalse();
    });
  });

  describe('onAvatarRightClick', () => {
    let event: jasmine.SpyObj<MouseEvent>;

    beforeEach(() => {
      event = jasmine.createSpyObj('MouseEvent', ['preventDefault', 'stopPropagation']);
    });

    it('should prevent default and stop propagation', () => {
      component.isLoggedIn = true;
      
      component.onAvatarRightClick(event);
      
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('should toggle context menu when user is logged in', () => {
      component.isLoggedIn = true;
      component.showContextMenu = false;
      
      component.onAvatarRightClick(event);
      expect(component.showContextMenu).toBeTrue();
      
      component.onAvatarRightClick(event);
      expect(component.showContextMenu).toBeFalse();
    });

    it('should not show context menu when user is not logged in', () => {
      component.isLoggedIn = false;
      component.showContextMenu = false;
      
      component.onAvatarRightClick(event);
      
      expect(component.showContextMenu).toBeFalse();
    });
  });

  describe('closeContextMenu', () => {
    it('should set showContextMenu to false', () => {
      component.showContextMenu = true;
      
      component.closeContextMenu();
      
      expect(component.showContextMenu).toBeFalse();
    });
  });

  describe('logout', () => {
    beforeEach(() => {
      mockAuthService.logout.and.returnValue(of(true));
    });

    it('should call authService.logout and close context menu on success', () => {
      component.showContextMenu = true;
      
      component.logout();
      
      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(component.showContextMenu).toBeFalse();
    });

    it('should close context menu and log error on logout failure', () => {
      const error = new Error('Logout failed');
      mockAuthService.logout.and.returnValue(throwError(() => error));
      spyOn(console, 'error');
      component.showContextMenu = true;
      
      component.logout();
      
      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith('Logout error:', error);
      expect(component.showContextMenu).toBeFalse();
    });
  });

  describe('HostListeners', () => {
    describe('onDocumentClick', () => {
      let mockElement: jasmine.SpyObj<HTMLElement>;
      let mockEvent: jasmine.SpyObj<Event>;

      beforeEach(() => {
        mockElement = jasmine.createSpyObj('HTMLElement', ['closest']);
        mockEvent = jasmine.createSpyObj('Event', [], { target: mockElement });
      });

      it('should not close context menu if context menu is not shown', () => {
        component.showContextMenu = false;
        spyOn(component, 'closeContextMenu');
        
        component.onDocumentClick(mockEvent);
        
        expect(component.closeContextMenu).not.toHaveBeenCalled();
      });

      it('should close context menu when clicking outside avatar and context menu', () => {
        component.showContextMenu = true;
        mockElement.closest.and.returnValue(null);
        spyOn(component, 'closeContextMenu');
        
        component.onDocumentClick(mockEvent);
        
        expect(mockElement.closest).toHaveBeenCalledWith('.context-menu');
        expect(mockElement.closest).toHaveBeenCalledWith('.avatar-container');
        expect(component.closeContextMenu).toHaveBeenCalled();
      });

      it('should not close context menu when clicking on context menu', () => {
        component.showContextMenu = true;
        mockElement.closest.and.callFake((selector: string) => {
          return selector === '.context-menu' ? mockElement : null;
        });
        spyOn(component, 'closeContextMenu');
        
        component.onDocumentClick(mockEvent);
        
        expect(component.closeContextMenu).not.toHaveBeenCalled();
      });

      it('should not close context menu when clicking on avatar container', () => {
        component.showContextMenu = true;
        mockElement.closest.and.callFake((selector: string) => {
          return selector === '.avatar-container' ? mockElement : null;
        });
        spyOn(component, 'closeContextMenu');
        
        component.onDocumentClick(mockEvent);
        
        expect(component.closeContextMenu).not.toHaveBeenCalled();
      });
    });

    describe('onDocumentContextMenu', () => {
      let mockElement: jasmine.SpyObj<HTMLElement>;
      let mockEvent: jasmine.SpyObj<MouseEvent>;

      beforeEach(() => {
        mockElement = jasmine.createSpyObj('HTMLElement', ['closest']);
        mockEvent = jasmine.createSpyObj('MouseEvent', [], { target: mockElement });
      });

      it('should close context menu when right-clicking outside avatar container', () => {
        mockElement.closest.and.returnValue(null);
        spyOn(component, 'closeContextMenu');
        
        component.onDocumentContextMenu(mockEvent);
        
        expect(mockElement.closest).toHaveBeenCalledWith('.avatar-container');
        expect(component.closeContextMenu).toHaveBeenCalled();
      });

      it('should not close context menu when right-clicking on avatar container', () => {
        mockElement.closest.and.returnValue(mockElement);
        spyOn(component, 'closeContextMenu');
        
        component.onDocumentContextMenu(mockEvent);
        
        expect(component.closeContextMenu).not.toHaveBeenCalled();
      });
    });
  });

  describe('Integration tests', () => {
    it('should handle complete user login flow', () => {
      component.ngOnInit();
      
      isLoggedIn$.next(true);
      expect(component.isLoggedIn).toBeTrue();
      
      userProfile$.next(mockProfile);
      expect(component.userAvatarUrl).toBe('http://example.com/avatar.jpg');
      expect(component.userInitials).toBe('JD');
      
      const rightClickEvent = jasmine.createSpyObj('MouseEvent', ['preventDefault', 'stopPropagation']);
      component.onAvatarRightClick(rightClickEvent);
      expect(component.showContextMenu).toBeTrue();
    
      mockAuthService.logout.and.returnValue(of(true));
      component.logout();
      expect(component.showContextMenu).toBeFalse();
      
      isLoggedIn$.next(false);
      expect(component.isLoggedIn).toBeFalse();
      expect(component.userAvatarUrl).toBeUndefined();
      expect(component.userInitials).toBe('U');
    });
  });
});