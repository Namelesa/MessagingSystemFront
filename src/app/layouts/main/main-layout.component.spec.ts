import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, NavigationEnd, NavigationStart } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { MainLayoutComponent } from './main-layout.component';
import { AuthService } from '../../../entities/session';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@Component({
  selector: 'app-navigation-side-bar',
  template: '<div>Mock Navigation Sidebar</div>',
  standalone: true
})
class MockNavigationSideBarComponent {}

@Component({
  selector: 'app-sidebar-widget',
  template: '<div>Mock Sidebar Widget</div>',
  standalone: true
})
class MockSidebarWidgetComponent {}

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;
  let routerMock: jasmine.SpyObj<Router>;
  let authServiceMock: jasmine.SpyObj<AuthService>;
  let routerEventsSubject: Subject<any>;
  let isLoggedInSubject: BehaviorSubject<boolean>;

  beforeEach(async () => {
    routerEventsSubject = new Subject();
    isLoggedInSubject = new BehaviorSubject<boolean>(true);

    const routerSpy = jasmine.createSpyObj('Router', ['navigate'], {
      events: routerEventsSubject.asObservable()
    });
    
    const authServiceSpy = jasmine.createSpyObj('AuthService', [], {
      isLoggedIn$: isLoggedInSubject.asObservable()
    });

    await TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA] 
    })
    .overrideComponent(MainLayoutComponent, {
      set: {
        imports: [CommonModule, RouterModule, MockNavigationSideBarComponent, MockSidebarWidgetComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
    routerMock = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    authServiceMock = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  afterEach(() => {
    if (!routerEventsSubject.closed) {
      routerEventsSubject.complete();
    }
    if (!isLoggedInSubject.closed) {
      isLoggedInSubject.complete();
    }
  });

  describe('Component Creation', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with sidebar closed', () => {
      expect(component.isSidebarOpen).toBe(false);
    });

    it('should inject Router and AuthService', () => {
      expect(routerMock).toBeTruthy();
      expect(authServiceMock).toBeTruthy();
    });
  });

  describe('ngOnInit', () => {
    it('should subscribe to router events', () => {
      spyOn(component['router'].events, 'subscribe').and.callThrough();
      component.ngOnInit();
      expect(component['router'].events.subscribe).toHaveBeenCalled();
      expect(component['routerSub']).toBeDefined();
      expect(component['routerSub']?.closed).toBe(false);
    });

    it('should subscribe to auth service isLoggedIn$', () => {
      spyOn(component['authService'].isLoggedIn$, 'subscribe').and.callThrough();
      component.ngOnInit();
      expect(component['authService'].isLoggedIn$.subscribe).toHaveBeenCalled();
      expect(component['authSub']).toBeDefined();
      expect(component['authSub']?.closed).toBe(false);
    });

    it('should close sidebar on NavigationEnd event', () => {
      component.isSidebarOpen = true;
      component.ngOnInit();

      routerEventsSubject.next(new NavigationEnd(1, '/test', '/test'));

      expect(component.isSidebarOpen).toBe(false);
    });

    it('should not close sidebar on NavigationStart event', () => {
      component.isSidebarOpen = true;
      component.ngOnInit();

      routerEventsSubject.next(new NavigationStart(1, '/test'));

      expect(component.isSidebarOpen).toBe(true);
    });

    it('should navigate to login when user is not logged in', () => {
      component.ngOnInit();

      isLoggedInSubject.next(false);

      expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should not navigate when user is logged in', () => {
      routerMock.navigate.calls.reset();
      component.ngOnInit();

      isLoggedInSubject.next(true);

      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('should handle multiple navigation events correctly', () => {
      component.isSidebarOpen = true;
      component.ngOnInit();

      routerEventsSubject.next(new NavigationEnd(1, '/test1', '/test1'));
      expect(component.isSidebarOpen).toBe(false);

      component.isSidebarOpen = true;
      routerEventsSubject.next(new NavigationEnd(2, '/test2', '/test2'));

      expect(component.isSidebarOpen).toBe(false);
    });
  });

  describe('ngOnDestroy', () => {
    beforeEach(() => {
      component.ngOnInit();
    });

    it('should unsubscribe from router events', () => {
      const routerSub = component['routerSub'];
      expect(routerSub?.closed).toBe(false);

      component.ngOnDestroy();

      expect(routerSub?.closed).toBe(true);
    });

    it('should unsubscribe from auth service', () => {
      const authSub = component['authSub'];
      expect(authSub?.closed).toBe(false);

      component.ngOnDestroy();

      expect(authSub?.closed).toBe(true);
    });

    it('should handle destruction when subscriptions are undefined', () => {
      component['routerSub'] = undefined;
      component['authSub'] = undefined;

      expect(() => component.ngOnDestroy()).not.toThrow();
    });

    it('should handle destruction when already unsubscribed', () => {
      component['routerSub']?.unsubscribe();
      component['authSub']?.unsubscribe();

      expect(() => component.ngOnDestroy()).not.toThrow();
    });
  });

  describe('Sidebar Methods', () => {
    it('should open sidebar', () => {
      component.isSidebarOpen = false;

      component.openSidebar();

      expect(component.isSidebarOpen).toBe(true);
    });

    it('should close sidebar', () => {
      component.isSidebarOpen = true;

      component.closeSidebar();

      expect(component.isSidebarOpen).toBe(false);
    });

    it('should toggle sidebar state correctly', () => {
      expect(component.isSidebarOpen).toBe(false);
      component.openSidebar();
      expect(component.isSidebarOpen).toBe(true);

      component.closeSidebar();
      expect(component.isSidebarOpen).toBe(false);

      component.openSidebar();
      expect(component.isSidebarOpen).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete authentication flow', () => {
      routerMock.navigate.calls.reset();
      component.ngOnInit();

      isLoggedInSubject.next(false);

      expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
      expect(routerMock.navigate).toHaveBeenCalledTimes(1);
    });

    it('should handle navigation and sidebar interaction', () => {
      component.ngOnInit();
      component.openSidebar();
      expect(component.isSidebarOpen).toBe(true);

      routerEventsSubject.next(new NavigationEnd(1, '/test', '/test'));

      expect(component.isSidebarOpen).toBe(false);
    });

    it('should handle multiple auth state changes', () => {
      routerMock.navigate.calls.reset();
      component.ngOnInit();
      
      isLoggedInSubject.next(true);
      expect(routerMock.navigate).not.toHaveBeenCalled();

      isLoggedInSubject.next(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
      expect(routerMock.navigate).toHaveBeenCalledTimes(1);

      isLoggedInSubject.next(false);
      expect(routerMock.navigate).toHaveBeenCalledTimes(2);

      isLoggedInSubject.next(true); 
      expect(routerMock.navigate).toHaveBeenCalledTimes(2);
    });
  });

  describe('Memory Leak Prevention', () => {
    it('should not create memory leaks with multiple init/destroy cycles', () => {
      for (let i = 0; i < 10; i++) {
        component.ngOnInit();
        expect(component['routerSub']?.closed).toBe(false);
        expect(component['authSub']?.closed).toBe(false);
        
        component.ngOnDestroy();
        expect(component['routerSub']?.closed).toBe(true);
        expect(component['authSub']?.closed).toBe(true);
      }
    });

    it('should properly clean up after component lifecycle', () => {
      component.ngOnInit();
      const routerSub = component['routerSub'];
      const authSub = component['authSub'];

      fixture.destroy();

      expect(routerSub?.closed).toBe(true);
      expect(authSub?.closed).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid sidebar open/close operations', () => {
      for (let i = 0; i < 10; i++) {
        component.openSidebar();
        expect(component.isSidebarOpen).toBe(true);
        
        component.closeSidebar();
        expect(component.isSidebarOpen).toBe(false);
      }
    });

    it('should maintain component state during multiple navigation events', () => {
      component.ngOnInit();
      
      component.openSidebar();
      expect(component.isSidebarOpen).toBe(true);
      
      routerEventsSubject.next(new NavigationEnd(1, '/page1', '/page1'));
      expect(component.isSidebarOpen).toBe(false);
      
      component.openSidebar();
      routerEventsSubject.next(new NavigationEnd(2, '/page2', '/page2'));
      expect(component.isSidebarOpen).toBe(false);
      
      component.openSidebar();
      routerEventsSubject.next(new NavigationStart(3, '/page3'));
      expect(component.isSidebarOpen).toBe(true); 
    });

    it('should handle authentication state changes during navigation', () => {
      routerMock.navigate.calls.reset();
      component.ngOnInit();
      
      isLoggedInSubject.next(true);
      expect(routerMock.navigate).not.toHaveBeenCalled();

      routerEventsSubject.next(new NavigationEnd(1, '/dashboard', '/dashboard'));
      
      isLoggedInSubject.next(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    });
  });

  describe('Template Integration', () => {
    it('should render template without errors', () => {
      fixture.detectChanges();
      expect(fixture.nativeElement).toBeTruthy();
    });

    it('should reflect sidebar state in component', () => {
      fixture.detectChanges();

      component.openSidebar();
      fixture.detectChanges();
      expect(component.isSidebarOpen).toBe(true);

      component.closeSidebar();
      fixture.detectChanges();
      expect(component.isSidebarOpen).toBe(false);
    });

    it('should handle component initialization with template', () => {
      component.ngOnInit();
      fixture.detectChanges();

      expect(component.isSidebarOpen).toBe(false);
      expect(component['routerSub']).toBeDefined();
      expect(component['authSub']).toBeDefined();
    });
  });

  describe('Component Dependencies', () => {
    it('should handle router service dependency correctly', () => {
      expect(component['router']).toBe(routerMock);
    });

    it('should handle auth service dependency correctly', () => {
      expect(component['authService']).toBe(authServiceMock);
    });

    it('should not have circular dependencies', () => {
      component.ngOnInit();
      expect(component['routerSub']).toBeDefined();
      expect(component['authSub']).toBeDefined();
      
      component.ngOnDestroy();
      expect(component['routerSub']?.closed).toBe(true);
      expect(component['authSub']?.closed).toBe(true);
    });
  });

  describe('Component State Management', () => {
    it('should maintain consistent state across lifecycle events', () => {
      expect(component.isSidebarOpen).toBe(false);
      
      component.ngOnInit();
      expect(component.isSidebarOpen).toBe(false);

      component.openSidebar();
      expect(component.isSidebarOpen).toBe(true);
      
      routerEventsSubject.next(new NavigationEnd(1, '/test', '/test'));
      expect(component.isSidebarOpen).toBe(false);
      
      component.ngOnDestroy();
      expect(component.isSidebarOpen).toBe(false);
    });

    it('should handle concurrent state changes', () => {
      component.ngOnInit();
      
      component.openSidebar();
      expect(component.isSidebarOpen).toBe(true);
      
      component.closeSidebar();
      expect(component.isSidebarOpen).toBe(false);
      
      component.openSidebar();
      expect(component.isSidebarOpen).toBe(true);
      
      routerEventsSubject.next(new NavigationEnd(1, '/test', '/test'));
      expect(component.isSidebarOpen).toBe(false);
    });
  });
});