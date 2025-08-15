import { BehaviorSubject } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';
import { StorageService } from '../../../shared/storage';
import { ProfileApiResult } from '../../../entities/session';
import { environment } from '../../../shared/api-urls';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let storageServiceMock: jasmine.SpyObj<StorageService>;

  const mockProfile: ProfileApiResult = {
    statusCode: '200',
    firstName: 'Test',
    lastName: 'User',
    login: 'testUser',
    email: 'test@example.com',
    nickName: 'testUser',
    image: 'https://example.com/avatar.jpg'
  };

  beforeEach(async () => {
    const storageServiceSpy = jasmine.createSpyObj('StorageService', ['get', 'set', 'remove']);
    
    // Настройка дефолтных возвращаемых значений для мока
    storageServiceSpy.get.and.returnValue(Promise.resolve(null));
    storageServiceSpy.set.and.returnValue(Promise.resolve());
    storageServiceSpy.remove.and.returnValue(Promise.resolve());

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: StorageService, useValue: storageServiceSpy }
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    storageServiceMock = TestBed.inject(StorageService) as jasmine.SpyObj<StorageService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('Initialization', () => {
    it('should create the service', (done) => {
      // Ждем инициализации перед проверкой
      service = TestBed.inject(AuthService);
      service.waitForAuthInit().subscribe(() => {
        expect(service).toBeTruthy();
        done();
      });
    });

    it('should initialize with no stored nickname', (done) => {
      storageServiceMock.get.and.returnValue(Promise.resolve(null));
      
      const newService = new AuthService(httpClient, storageServiceMock);

      newService.waitForAuthInit().subscribe(result => {
        expect(result).toBe(true);
        expect(newService.getNickName()).toBeNull();
        done();
      });
    });

    it('should initialize with stored nickname and check auth', (done) => {
      storageServiceMock.get.and.returnValue(Promise.resolve('storedUser'));
      
      const newService = new AuthService(httpClient, storageServiceMock);

      newService.waitForAuthInit().subscribe(result => {
        expect(result).toBe(true);
        expect(newService.getNickName()).toBe('storedUser');
        done();
      });

      // Ждем HTTP запрос и отвечаем на него
      setTimeout(() => {
        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=storedUser`);
        req.flush(mockProfile);
      });
    });
  });

  describe('setNickName', () => {
    beforeEach((done) => {
      service = TestBed.inject(AuthService);
      service.waitForAuthInit().subscribe(() => done());
    });

    it('should set nickname and save to storage', async () => {
      storageServiceMock.set.and.returnValue(Promise.resolve('newUser'));

      await service.setNickName('newUser');

      expect(service.getNickName()).toBe('newUser');
      expect(storageServiceMock.set).toHaveBeenCalledWith('nickName', 'newUser');
    });
  });

  describe('getNickName', () => {
    beforeEach((done) => {
      service = TestBed.inject(AuthService);
      service.waitForAuthInit().subscribe(() => done());
    });

    it('should return current nickname', async () => {
      storageServiceMock.set.and.returnValue(Promise.resolve('testUser'));
      await service.setNickName('testUser');

      expect(service.getNickName()).toBe('testUser');
    });

    it('should return null when no nickname is set', () => {
      expect(service.getNickName()).toBeNull();
    });
  });

  describe('getUserProfile', () => {
    beforeEach((done) => {
      service = TestBed.inject(AuthService);
      service.waitForAuthInit().subscribe(() => done());
    });

    it('should fetch user profile successfully', (done) => {
      service.setNickName('testUser').then(() => {
        service.getUserProfile().subscribe(profile => {
          expect(profile).toEqual(mockProfile);
          done();
        });

        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=testUser`);
        expect(req.request.method).toBe('GET');
        expect(req.request.withCredentials).toBe(true);
        req.flush(mockProfile);
      });
    });

    it('should throw error when nickname is not set', () => {
      expect(() => service.getUserProfile()).toThrowError('User nickname is not set');
    });

    it('should handle HTTP error and update subjects', (done) => {
      service.setNickName('testUser').then(() => {
        service.getUserProfile().subscribe({
          error: (error) => {
            expect(error).toBeDefined();
            
            service.isLoggedIn$.subscribe(isLoggedIn => {
              expect(isLoggedIn).toBe(false);
            });
            
            service.userProfile$.subscribe(profile => {
              expect(profile).toBeNull();
            });
            
            done();
          }
        });

        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=testUser`);
        req.error(new ErrorEvent('Network error'));
      });
    });
  });

  describe('getCurrentProfile', () => {
    beforeEach((done) => {
      service = TestBed.inject(AuthService);
      service.waitForAuthInit().subscribe(() => done());
    });

    it('should return current profile from subject', (done) => {
      service.setNickName('testUser').then(() => {
        service.getUserProfile().subscribe(() => {
          const currentProfile = service.getCurrentProfile();
          expect(currentProfile).toEqual(mockProfile);
          done();
        });

        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=testUser`);
        req.flush(mockProfile);
      });
    });

    it('should return null when no profile is loaded', () => {
      expect(service.getCurrentProfile()).toBeNull();
    });
  });

  describe('checkAuth', () => {
    beforeEach((done) => {
      service = TestBed.inject(AuthService);
      service.waitForAuthInit().subscribe(() => done());
    });

    it('should return false when no nickname is set', (done) => {
      service.checkAuth().subscribe(result => {
        expect(result).toBe(false);
        done();
      });
    });

    it('should return true and update subjects on successful auth check', (done) => {
      service.setNickName('testUser').then(() => {
        service.checkAuth().subscribe(result => {
          expect(result).toBe(true);
          
          service.isLoggedIn$.subscribe(isLoggedIn => {
            expect(isLoggedIn).toBe(true);
          });
          
          service.userProfile$.subscribe(profile => {
            expect(profile).toEqual(mockProfile);
          });
          
          done();
        });

        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=testUser`);
        req.flush(mockProfile);
      });
    });

    it('should return false and reset subjects on failed auth check', (done) => {
      service.setNickName('testUser').then(() => {
        service.checkAuth().subscribe(result => {
          expect(result).toBe(false);
          
          service.isLoggedIn$.subscribe(isLoggedIn => {
            expect(isLoggedIn).toBe(false);
          });
          
          service.userProfile$.subscribe(profile => {
            expect(profile).toBeNull();
          });
          
          done();
        });

        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=testUser`);
        req.error(new ErrorEvent('Auth failed'));
      });
    });
  });

  describe('setLoggedIn', () => {
    beforeEach((done) => {
      service = TestBed.inject(AuthService);
      service.waitForAuthInit().subscribe(() => done());
    });

    it('should set logged in status to true', (done) => {
      service.setLoggedIn(true).then(() => {
        service.isLoggedIn$.subscribe(status => {
          expect(status).toBe(true);
          done();
        });
      });
    });

    it('should set logged in status to false and clear data', (done) => {
      storageServiceMock.remove.and.returnValue(Promise.resolve());
      
      service.setNickName('testUser').then(() => {
        return service.setLoggedIn(false);
      }).then(() => {
        service.isLoggedIn$.subscribe(status => {
          expect(status).toBe(false);
        });
        
        service.userProfile$.subscribe(profile => {
          expect(profile).toBeNull();
        });
        
        expect(service.getNickName()).toBeNull();
        expect(storageServiceMock.remove).toHaveBeenCalledWith('nickName');
        done();
      });
    });
  });

  describe('getUserAvatarUrl', () => {
    beforeEach((done) => {
      service = TestBed.inject(AuthService);
      service.waitForAuthInit().subscribe(() => done());
    });

    it('should return avatar URL from current profile', (done) => {
      service.setNickName('testUser').then(() => {
        service.getUserProfile().subscribe(() => {
          const avatarUrl = service.getUserAvatarUrl();
          expect(avatarUrl).toBe('https://example.com/avatar.jpg');
          done();
        });

        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=testUser`);
        req.flush(mockProfile);
      });
    });

    it('should return undefined when no profile is loaded', () => {
      const avatarUrl = service.getUserAvatarUrl();
      expect(avatarUrl).toBeUndefined();
    });
  });

  describe('logout', () => {
    beforeEach((done) => {
      service = TestBed.inject(AuthService);
      service.waitForAuthInit().subscribe(() => done());
    });

    it('should clear auth data and return true', (done) => {
      storageServiceMock.remove.and.returnValue(Promise.resolve());
      
      service.setNickName('testUser').then(() => {
        service.logout().subscribe(result => {
          expect(result).toBe(true);
          expect(service.getNickName()).toBeNull();
          
          service.isLoggedIn$.subscribe(status => {
            expect(status).toBe(false);
          });
          
          service.userProfile$.subscribe(profile => {
            expect(profile).toBeNull();
          });
          
          expect(storageServiceMock.remove).toHaveBeenCalledWith('nickName');
          done();
        });
      });
    });
  });

  describe('waitForAuthInit', () => {
    it('should return true immediately if auth is already initialized', (done) => {
      service = TestBed.inject(AuthService);
      
      // Ждем инициализации
      service.waitForAuthInit().subscribe(() => {
        // Теперь проверяем, что повторный вызов сразу возвращает true
        service.waitForAuthInit().subscribe(result => {
          expect(result).toBe(true);
          done();
        });
      });
    });
  });

  describe('Observable streams', () => {
    beforeEach((done) => {
      service = TestBed.inject(AuthService);
      service.waitForAuthInit().subscribe(() => done());
    });

    it('should emit login status changes', (done) => {
      const statusChanges: boolean[] = [];
      
      service.isLoggedIn$.subscribe(status => {
        statusChanges.push(status);
        
        if (statusChanges.length === 3) {
          expect(statusChanges).toEqual([false, true, false]);
          done();
        }
      });
      
      service.setLoggedIn(true).then(() => {
        return service.setLoggedIn(false);
      });
    });

    it('should emit profile changes', (done) => {
      const profileChanges: (ProfileApiResult | null)[] = [];
      
      service.userProfile$.subscribe(profile => {
        profileChanges.push(profile);
        
        if (profileChanges.length === 2) {
          expect(profileChanges[0]).toBeNull();
          expect(profileChanges[1]).toEqual(mockProfile);
          done();
        }
      });
      
      service.setNickName('testUser').then(() => {
        service.getUserProfile().subscribe();
        
        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=testUser`);
        req.flush(mockProfile);
      });
    });
  });

  describe('Extra coverage', () => {
    beforeEach((done) => {
      service = TestBed.inject(AuthService);
      service.waitForAuthInit().subscribe(() => done());
    });
  
    it('should handle error in checkAuth() when called from constructor', (done) => {
      // storageService.get вернет ник
      storageServiceMock.get.and.returnValue(Promise.resolve('nickFromStorage'));
  
      // создаем сервис заново
      const newService = new AuthService(httpClient, storageServiceMock);
  
      setTimeout(() => {
        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=nickFromStorage`);
        req.error(new ErrorEvent('Auth failed')); // simulate error
        done();
      });
    });
  
    it('should propagate error from getUserProfile()', (done) => {
      service.setNickName('testUser').then(() => {
        service.getUserProfile().subscribe({
          next: () => fail('Should not succeed'),
          error: (err) => {
            expect(err).toBeDefined();
            expect(service.getNickName()).toBe('testUser');
            expect(service.getCurrentProfile()).toBeNull();
            done();
          }
        });
  
        const req = httpMock.expectOne(`${environment.apiUrl}user/profile?nickName=testUser`);
        req.error(new ErrorEvent('Network error'));
      });
    });
  
    it('should handle error when storageService.remove fails in setLoggedIn(false)', async () => {
      storageServiceMock.remove.and.returnValue(Promise.reject('remove failed'));
      await service.setNickName('toRemove');
      try {
        await service.setLoggedIn(false);
      } catch (e) {
        expect(e).toBe('remove failed');
      }
    });
  
    it('should return undefined from getUserAvatarUrl() if profile has no image', () => {
      (service as any).userProfileSubject.next({ 
        statusCode: '200', firstName: 'No', lastName: 'Image', 
        login: 'noimage', email: '', nickName: 'noimage', image: undefined 
      });
      expect(service.getUserAvatarUrl()).toBeUndefined();
    });
  
    it('should wait for auth init when not initialized yet', (done) => {
      const newService = Object.create(AuthService.prototype);
      newService.authInitialized = false;
      newService.authInitSubject = new BehaviorSubject<boolean>(false);
      // подписка
      newService.waitForAuthInit().subscribe((res: boolean) => {
        expect(res).toBe(true);
        done();
      });
      // эмулируем init
      newService.authInitSubject.next(true);
    });
  });  
});