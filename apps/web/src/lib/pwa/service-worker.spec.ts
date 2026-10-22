import { renderHook, act, waitFor } from '@testing-library/react';
import { SERVICE_WORKER, SW_MESSAGES } from '@/constants/pwa';
import { applyUpdate, registerServiceWorker } from './service-worker';
import { useServiceWorker } from './use-service-worker';

class FakeWorker extends EventTarget {
  state: ServiceWorkerState = 'installing';
  postMessage = vi.fn();
  install() {
    this.state = 'installed';
    this.dispatchEvent(new Event('statechange'));
  }
}

class FakeRegistration extends EventTarget {
  waiting: FakeWorker | null = null;
  installing: FakeWorker | null = null;
  update = vi.fn(() => Promise.resolve());
  startUpdate(worker: FakeWorker) {
    this.installing = worker;
    this.dispatchEvent(new Event('updatefound'));
  }
}

class FakeContainer extends EventTarget {
  controller: object | null = null;
  registration = new FakeRegistration();
  register = vi.fn(() => Promise.resolve(this.registration));
}

const asContainer = (c: FakeContainer) =>
  c as unknown as ServiceWorkerContainer;

describe('registerServiceWorker', () => {
  it('registers the root-scoped worker without HTTP caching of the script', async () => {
    const container = new FakeContainer();
    await registerServiceWorker(asContainer(container), vi.fn());
    expect(container.register).toHaveBeenCalledWith(SERVICE_WORKER.url, {
      scope: '/',
      updateViaCache: 'none',
    });
  });

  it('does not report the first install as an update', async () => {
    const container = new FakeContainer();
    const onUpdate = vi.fn();
    await registerServiceWorker(asContainer(container), onUpdate);
    const worker = new FakeWorker();
    container.registration.startUpdate(worker);
    container.registration.waiting = worker;
    worker.install();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('reports an update that finishes installing while a worker controls the page', async () => {
    const container = new FakeContainer();
    container.controller = {};
    const onUpdate = vi.fn();
    await registerServiceWorker(asContainer(container), onUpdate);
    const worker = new FakeWorker();
    container.registration.startUpdate(worker);
    expect(onUpdate).not.toHaveBeenCalled();
    container.registration.waiting = worker;
    worker.install();
    expect(onUpdate).toHaveBeenCalledWith(worker);
  });

  it('reports a worker already waiting at registration time', async () => {
    const container = new FakeContainer();
    container.controller = {};
    container.registration.waiting = new FakeWorker();
    const onUpdate = vi.fn();
    await registerServiceWorker(asContainer(container), onUpdate);
    expect(onUpdate).toHaveBeenCalledWith(container.registration.waiting);
  });
});

describe('applyUpdate', () => {
  it('asks the waiting worker to activate and reloads once, on controller change', () => {
    const container = new FakeContainer();
    const worker = new FakeWorker();
    const reload = vi.fn();
    applyUpdate(
      asContainer(container),
      worker as unknown as ServiceWorker,
      reload,
    );
    expect(worker.postMessage).toHaveBeenCalledWith({
      type: SW_MESSAGES.skipWaiting,
    });
    expect(reload).not.toHaveBeenCalled();
    container.dispatchEvent(new Event('controllerchange'));
    container.dispatchEvent(new Event('controllerchange'));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('useServiceWorker', () => {
  const install = (container: FakeContainer) =>
    Object.defineProperty(navigator, 'serviceWorker', {
      value: container,
      configurable: true,
    });

  afterEach(() => {
    Reflect.deleteProperty(navigator, 'serviceWorker');
  });

  it('does not register when disabled (development builds)', () => {
    const container = new FakeContainer();
    install(container);
    const { result } = renderHook(() => useServiceWorker(false));
    expect(container.register).not.toHaveBeenCalled();
    expect(result.current.updateReady).toBe(false);
  });

  it('exposes a waiting update and activates it on reload', async () => {
    const container = new FakeContainer();
    container.controller = {};
    const worker = new FakeWorker();
    container.registration.waiting = worker;
    install(container);
    const { result } = renderHook(() => useServiceWorker(true));
    await waitFor(() => expect(result.current.updateReady).toBe(true));
    act(() => result.current.reload());
    expect(worker.postMessage).toHaveBeenCalledWith({
      type: SW_MESSAGES.skipWaiting,
    });
  });

  it('checks for an update when the page becomes visible again', async () => {
    const container = new FakeContainer();
    install(container);
    renderHook(() => useServiceWorker(true));
    await waitFor(() => expect(container.register).toHaveBeenCalled());
    await act(async () => {
      await Promise.resolve();
    });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(container.registration.update).toHaveBeenCalledTimes(1);
  });
});
