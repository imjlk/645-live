/**
 * Service Worker registration and management utilities
 * Provides seamless offline support integration
 */

import { browser } from '$app/environment';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  registration: ServiceWorkerRegistration | null;
  updateAvailable: boolean;
  error: string | null;
}

interface ServiceWorkerEvents {
  'sw-registered': ServiceWorkerRegistration;
  'sw-updated': ServiceWorkerRegistration;
  'sw-offline': void;
  'sw-online': void;
  'sw-error': Error;
  'sw-installing': ServiceWorkerRegistration;
  'sw-waiting': ServiceWorkerRegistration;
}

class ServiceWorkerManager extends EventTarget {
  private state: ServiceWorkerState = {
    isSupported: false,
    isRegistered: false,
    isOnline: true,
    registration: null,
    updateAvailable: false,
    error: null,
  };

  private updateCheckInterval: number | null = null;
  private readonly SW_PATH = '/service-worker.js';
  private readonly UPDATE_CHECK_INTERVAL = 60000; // 1 minute

  constructor() {
    super();
    
    if (browser) {
      this.initialize();
    }
  }

  private initialize(): void {
    this.state.isSupported = 'serviceWorker' in navigator;
    this.state.isOnline = navigator.onLine;

    if (!this.state.isSupported) {
      console.warn('Service Worker not supported');
      return;
    }

    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Listen for page visibility changes to check for updates
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));

    this.register();
  }

  private async register(): Promise<void> {
    if (!this.state.isSupported) return;

    try {
      console.log('🔧 Registering Service Worker');
      
      const registration = await navigator.serviceWorker.register(this.SW_PATH, {
        scope: '/',
        updateViaCache: 'none', // Always check for updates
      });

      this.state.registration = registration;
      this.state.isRegistered = true;

      console.log('✅ Service Worker registered:', registration.scope);
      
      // Setup event listeners
      this.setupRegistrationListeners(registration);
      
      // Dispatch registration event
      this.dispatchEvent(new CustomEvent('sw-registered', { detail: registration }));

      // Check for updates immediately and then periodically
      await this.checkForUpdates();
      this.startUpdateChecking();

    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
      this.state.error = error instanceof Error ? error.message : 'Registration failed';
      this.dispatchEvent(new CustomEvent('sw-error', { detail: error }));
    }
  }

  private setupRegistrationListeners(registration: ServiceWorkerRegistration): void {
    // Listen for service worker state changes
    if (registration.installing) {
      this.trackServiceWorker(registration.installing, 'installing');
    }

    if (registration.waiting) {
      this.state.updateAvailable = true;
      this.dispatchEvent(new CustomEvent('sw-waiting', { detail: registration }));
    }

    if (registration.active) {
      console.log('🚀 Service Worker active');
    }

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      console.log('🔄 Service Worker update found');
      const newWorker = registration.installing;
      
      if (newWorker) {
        this.trackServiceWorker(newWorker, 'installing');
        this.dispatchEvent(new CustomEvent('sw-installing', { detail: registration }));
      }
    });
  }

  private trackServiceWorker(worker: ServiceWorker, initialState: string): void {
    console.log(`📡 Tracking Service Worker state: ${initialState}`);

    worker.addEventListener('statechange', () => {
      console.log(`📡 Service Worker state changed: ${worker.state}`);

      if (worker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // New update available
          this.state.updateAvailable = true;
          console.log('🆕 New Service Worker installed, update available');
          this.dispatchEvent(new CustomEvent('sw-updated', { detail: this.state.registration! }));
        } else {
          // First install
          console.log('✅ Service Worker installed for the first time');
        }
      }

      if (worker.state === 'activated') {
        console.log('🎯 Service Worker activated');
      }
    });
  }

  private handleOnline(): void {
    this.state.isOnline = true;
    console.log('🌐 Back online');
    this.dispatchEvent(new CustomEvent('sw-online'));
    
    // Trigger cache cleanup when coming back online
    this.cleanupCaches();
  }

  private handleOffline(): void {
    this.state.isOnline = false;
    console.log('📡 Gone offline');
    this.dispatchEvent(new CustomEvent('sw-offline'));
  }

  private handleVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      this.checkForUpdates();
    }
  }

  private startUpdateChecking(): void {
    if (this.updateCheckInterval) return;

    this.updateCheckInterval = window.setInterval(() => {
      this.checkForUpdates();
    }, this.UPDATE_CHECK_INTERVAL);

    console.log('⏰ Started periodic update checking');
  }

  private stopUpdateChecking(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
      console.log('⏹️ Stopped periodic update checking');
    }
  }

  public async checkForUpdates(): Promise<void> {
    if (!this.state.registration) return;

    try {
      console.log('🔍 Checking for Service Worker updates');
      await this.state.registration.update();
    } catch (error) {
      console.warn('⚠️ Update check failed:', error);
    }
  }

  public async activateUpdate(): Promise<void> {
    if (!this.state.registration?.waiting) {
      console.warn('⚠️ No waiting Service Worker to activate');
      return;
    }

    try {
      console.log('🔄 Activating Service Worker update');
      
      // Tell the waiting service worker to skip waiting
      this.state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Wait for the new service worker to take control
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('✅ New Service Worker took control');
          this.state.updateAvailable = false;
          resolve();
        }, { once: true });
      });

      // Reload the page to use the new service worker
      window.location.reload();
      
    } catch (error) {
      console.error('❌ Failed to activate update:', error);
      throw error;
    }
  }

  public async unregister(): Promise<boolean> {
    if (!this.state.registration) return false;

    try {
      console.log('🗑️ Unregistering Service Worker');
      const success = await this.state.registration.unregister();
      
      if (success) {
        this.state.isRegistered = false;
        this.state.registration = null;
        this.stopUpdateChecking();
        console.log('✅ Service Worker unregistered');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Failed to unregister Service Worker:', error);
      return false;
    }
  }

  public async cleanupCaches(): Promise<void> {
    if (!this.state.registration?.active) return;

    try {
      console.log('🧹 Triggering cache cleanup');
      this.state.registration.active.postMessage({ type: 'CLEANUP_CACHES' });
    } catch (error) {
      console.warn('⚠️ Failed to trigger cache cleanup:', error);
    }
  }

  public getState(): ServiceWorkerState {
    return { ...this.state };
  }

  public isOnline(): boolean {
    return this.state.isOnline;
  }

  public hasUpdateAvailable(): boolean {
    return this.state.updateAvailable;
  }

  public addEventListener<K extends keyof ServiceWorkerEvents>(
    type: K,
    listener: (event: CustomEvent<ServiceWorkerEvents[K]>) => void,
    options?: boolean | AddEventListenerOptions
  ): void {
    super.addEventListener(type, listener as EventListener, options);
  }

  public removeEventListener<K extends keyof ServiceWorkerEvents>(
    type: K,
    listener: (event: CustomEvent<ServiceWorkerEvents[K]>) => void,
    options?: boolean | EventListenerOptions
  ): void {
    super.removeEventListener(type, listener as EventListener, options);
  }

  public destroy(): void {
    this.stopUpdateChecking();
    
    if (browser) {
      window.removeEventListener('online', this.handleOnline.bind(this));
      window.removeEventListener('offline', this.handleOffline.bind(this));
      document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    }
  }
}

// Singleton instance
let serviceWorkerManager: ServiceWorkerManager | null = null;

export function getServiceWorkerManager(): ServiceWorkerManager {
  if (!serviceWorkerManager && browser) {
    serviceWorkerManager = new ServiceWorkerManager();
  }
  return serviceWorkerManager!;
}

// Utility functions for common use cases
export function isServiceWorkerSupported(): boolean {
  return browser && 'serviceWorker' in navigator;
}

export function isOnline(): boolean {
  return browser ? navigator.onLine : true;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  const manager = getServiceWorkerManager();
  const state = manager.getState();
  
  if (state.isRegistered && state.registration) {
    return state.registration;
  }
  
  // Wait for registration
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Service Worker registration timeout'));
    }, 10000);

    manager.addEventListener('sw-registered', (event) => {
      clearTimeout(timeout);
      resolve(event.detail);
    }, { once: true });

    manager.addEventListener('sw-error', (event) => {
      clearTimeout(timeout);
      reject(event.detail);
    }, { once: true });
  });
}

// Composable for Svelte components
export function useServiceWorker() {
  const manager = getServiceWorkerManager();
  
  let state = $state(manager.getState());
  let isOnlineState = $state(isOnline());

  // Update state when it changes
  const updateState = () => {
    state = manager.getState();
  };

  const updateOnlineState = () => {
    isOnlineState = isOnline();
  };

  // Setup event listeners
  manager.addEventListener('sw-registered', updateState);
  manager.addEventListener('sw-updated', updateState);
  manager.addEventListener('sw-online', updateOnlineState);
  manager.addEventListener('sw-offline', updateOnlineState);
  manager.addEventListener('sw-error', updateState);

  // Cleanup function
  const cleanup = () => {
    manager.removeEventListener('sw-registered', updateState);
    manager.removeEventListener('sw-updated', updateState);
    manager.removeEventListener('sw-online', updateOnlineState);
    manager.removeEventListener('sw-offline', updateOnlineState);
    manager.removeEventListener('sw-error', updateState);
  };

  return {
    // Reactive state
    get isSupported() { return state.isSupported; },
    get isRegistered() { return state.isRegistered; },
    get isOnline() { return isOnlineState; },
    get updateAvailable() { return state.updateAvailable; },
    get error() { return state.error; },
    
    // Actions
    checkForUpdates: () => manager.checkForUpdates(),
    activateUpdate: () => manager.activateUpdate(),
    cleanupCaches: () => manager.cleanupCaches(),
    
    // Cleanup
    destroy: cleanup,
  };
}

export type { ServiceWorkerState, ServiceWorkerEvents };