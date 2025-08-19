import { TestBed } from '@angular/core/testing';
import { SignalRConnectionRegistryService } from './signalr-connection-registry';
import * as signalR from '@microsoft/signalr';

describe('SignalRConnectionRegistryService', () => {
  let service: SignalRConnectionRegistryService;
  let mockConnection: signalR.HubConnection;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SignalRConnectionRegistryService);
    mockConnection = {} as signalR.HubConnection;
  });

  describe('setConnection', () => {
    it('should add connection to registry', () => {
      service.setConnection('test', mockConnection);
      expect(service.getConnection('test')).toBe(mockConnection);
    });

    it('should remove connection if undefined passed', () => {
      service.setConnection('test', mockConnection);
      service.setConnection('test', undefined);
      expect(service.getConnection('test')).toBeNull();
    });
  });

  describe('getConnection', () => {
    it('should return null if connection not found', () => {
      expect(service.getConnection('unknown')).toBeNull();
    });

    it('should return connection if exists', () => {
      service.setConnection('test', mockConnection);
      expect(service.getConnection('test')).toBe(mockConnection);
    });
  });

  describe('waitForConnection', () => {
    it('should immediately resolve if connection already exists', async () => {
      service.setConnection('test', mockConnection);
      const conn = await service.waitForConnection('test');
      expect(conn).toBe(mockConnection);
    });

    it('should reject after attempts exhausted', async () => {
      const promise = service.waitForConnection('missing', 1, 10);
      await expectAsync(promise).toBeRejectedWithError(`SignalR connection 'missing' not established`);
    });

    it('should resolve when connection is set later', async () => {
      const promise = service.waitForConnection('delayed', 3, 10);
      setTimeout(() => service.setConnection('delayed', mockConnection), 15);
      await expectAsync(promise).toBeResolvedTo(mockConnection);
    });
  });

  describe('SignalRConnectionRegistryService uncovered branches', () => {
  let service: SignalRConnectionRegistryService;
  let mockConnection: signalR.HubConnection;

  beforeEach(() => {
    service = new SignalRConnectionRegistryService();
    mockConnection = {} as signalR.HubConnection;
  });

  it('should not throw if waiters map contains empty array', () => {
    (service as any).waiters.set('test', []);
    service.setConnection('test', mockConnection);
    expect(service.getConnection('test')).toBe(mockConnection);
  });

  it('should resolve after multiple retries in waitForConnection', async () => {
    const promise = service.waitForConnection('multi', 3, 5);
    setTimeout(() => service.setConnection('multi', mockConnection), 8);
    await expectAsync(promise).toBeResolvedTo(mockConnection);
  });

  it('should delete connection even if no waiters exist', () => {
    service.setConnection('toDelete', mockConnection);
    service.setConnection('toDelete', undefined);
    expect(service.getConnection('toDelete')).toBeNull();
  });

  it('should reject when connection is never established after all retries', async () => {
    const promise = service.waitForConnection('never', 2, 5);
    await expectAsync(promise).toBeRejectedWithError("SignalR connection 'never' not established");
  });

  it('should handle case when waiters array exists but is empty', () => {
    (service as any).waiters.set('empty', []);
    service.setConnection('empty', mockConnection);
    expect(service.getConnection('empty')).toBe(mockConnection);
  });
  
  it('should call all waiters and clear them when connection is set', (done) => {
    const spy1 = jasmine.createSpy('waiter1');
    const spy2 = jasmine.createSpy('waiter2');
  
    (service as any).waiters.set('withWaiters', [spy1, spy2]);
  
    service.setConnection('withWaiters', mockConnection);
  
    expect(spy1).toHaveBeenCalledWith(mockConnection);
    expect(spy2).toHaveBeenCalledWith(mockConnection);
    expect((service as any).waiters.has('withWaiters')).toBeFalse();
    done();
  });
});
});
