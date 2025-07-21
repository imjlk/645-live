/**
 * Svelte 5 runes-based composables for TrailBase client
 * Provides reactive state management with proper lifecycle handling
 */

import { untrack } from 'svelte';
import { trailbaseClient } from './client.js';
import type { 
  LottoDrawScanCount,
  ConnectionState,
  TrailbaseError 
} from './types.js';

interface UseScanDataOptions {
  round?: number;
  autoLoad?: boolean;
  onError?: (error: TrailbaseError) => void;
}

interface UseScanDataReturn {
  data: LottoDrawScanCount | null;
  loading: boolean;
  error: TrailbaseError | null;
  refetch: () => Promise<void>;
}

/**
 * Composable for managing scan data with reactive state
 */
export function useScanData(options: UseScanDataOptions = {}): UseScanDataReturn {
  let data = $state<LottoDrawScanCount | null>(null);
  let loading = $state(false);
  let error = $state<TrailbaseError | null>(null);
  
  const { round, autoLoad = true, onError } = options;
  
  const refetch = async () => {
    if (loading) return;
    
    loading = true;
    error = null;
    
    try {
      if (round) {
        data = await trailbaseClient.getScanDataSafely(round);
      } else {
        data = await trailbaseClient.getLatestScanData();
      }
    } catch (err) {
      const trailbaseError: TrailbaseError = err instanceof Error 
        ? Object.assign(err, { status: (err as { status?: number }).status || 500 })
        : new Error('Failed to fetch scan data');
      
      error = trailbaseError;
      if (onError) {
        onError(trailbaseError);
      }
    } finally {
      loading = false;
    }
  };
  
  // Auto-load data if requested
  if (autoLoad) {
    refetch();
  }
  
  return {
    get data() { return data; },
    get loading() { return loading; },
    get error() { return error; },
    refetch
  };
}

interface UseRealtimeScanUpdatesOptions {
  onUpdate?: (data: LottoDrawScanCount) => void;
  onConnectionChange?: (state: ConnectionState) => void;
  targetRound?: number;
}

interface UseRealtimeScanUpdatesReturn {
  latestUpdate: LottoDrawScanCount | null;
  connectionState: {
    connected: boolean;
    connecting: boolean;
    error: TrailbaseError | null;
    lastConnected: Date | null;
    retryCount: number;
  };
  subscribe: () => () => void;
  reconnect: () => Promise<void>;
}

/**
 * Composable for real-time scan updates with connection state
 */
export function useRealtimeScanUpdates(options: UseRealtimeScanUpdatesOptions = {}): UseRealtimeScanUpdatesReturn {
  let latestUpdate = $state<LottoDrawScanCount | null>(null);
  const connectionState = $state({
    connected: false,
    connecting: false,
    error: null as TrailbaseError | null,
    lastConnected: null as Date | null,
    retryCount: 0
  });
  
  const { onUpdate, onConnectionChange, targetRound } = options;
  
  const subscribe = (): (() => void) => {
    const subscriberId = `composable-${Date.now()}-${Math.random()}`;
    
    // Subscribe to scan updates
    const unsubscribeUpdates = trailbaseClient.subscribe(subscriberId, (data) => {
      // Filter by target round if specified
      if (targetRound && data.round !== targetRound) {
        return;
      }
      
      latestUpdate = data;
      
      if (onUpdate) {
        onUpdate(data);
      }
    });
    
    // Subscribe to connection state changes
    const unsubscribeConnection = trailbaseClient.subscribeToConnectionState(
      `${subscriberId}-connection`, 
      (state) => {
        connectionState.connected = state.connected;
        connectionState.connecting = state.connecting;
        connectionState.error = state.error;
        connectionState.lastConnected = state.lastConnected;
        connectionState.retryCount = state.retryCount;
        
        if (onConnectionChange) {
          onConnectionChange(state);
        }
      }
    );
    
    return () => {
      unsubscribeUpdates();
      unsubscribeConnection();
    };
  };
  
  const reconnect = async () => {
    await trailbaseClient.reconnect();
  };
  
  return {
    get latestUpdate() { return latestUpdate; },
    get connectionState() { return connectionState; },
    subscribe,
    reconnect
  };
}

interface UseBallValuesOptions {
  initialRound?: number;
  targetRound?: number; // Specific round to subscribe to (for filtering)
  onValuesChange?: (values: Record<number, number>, totalScans: number) => void;
  onBallUpdate?: (ballNumber: number, newValue: number, oldValue: number) => void;
}

interface UseBallValuesReturn {
  ballValues: Record<number, number>;
  totalScans: number;
  currentRound: number | null;
  recentlyUpdated: Record<number, boolean>;
  loading: boolean;
  error: TrailbaseError | null;
  loadInitialData: (round?: number) => Promise<void>;
  subscribe: () => () => void;
  setTargetRound: (round: number | null) => void; // Allow updating target round
}

/**
 * Composable specifically for managing lotto ball values and animations
 */
export function useBallValues(options: UseBallValuesOptions = {}): UseBallValuesReturn {
  let ballValues = $state<Record<number, number>>({});
  let totalScans = $state(0);
  let currentRound = $state<number | null>(null);
  let recentlyUpdated = $state<Record<number, boolean>>({});
  let loading = $state(false);
  let error = $state<TrailbaseError | null>(null);
  
  const { initialRound, onValuesChange, onBallUpdate } = options;
  let targetRound = $state<number | null>(options.targetRound || null);
  
  // Initialize ball values with zeros
  const initializeBallValues = () => {
    const values: Record<number, number> = {};
    for (let i = 1; i <= 45; i++) {
      values[i] = 0;
    }
    return values;
  };
  
  // Extract ball values from scan data
  const extractBallValues = (scanData: LottoDrawScanCount) => {
    const values: Record<number, number> = {};
    for (let i = 1; i <= 45; i++) {
      const scanCountField = `scan_count_${i}` as keyof LottoDrawScanCount;
      values[i] = Number(scanData[scanCountField]) || 0;
    }
    return values;
  };
  
  const loadInitialData = async (round?: number) => {
    if (loading) return;
    
    loading = true;
    error = null;
    
    try {
      const targetRound = round || initialRound;
      
      let scanData: LottoDrawScanCount | null = null;
      
      if (targetRound) {
        scanData = await trailbaseClient.getScanDataSafely(targetRound);
      } else {
        scanData = await trailbaseClient.getLatestScanData();
      }
      
      if (scanData) {
        currentRound = scanData.round;
        totalScans = Number(scanData.total_scans) || 0;
        ballValues = extractBallValues(scanData);
      } else {
        // Initialize with zeros if no data found
        currentRound = targetRound || null;
        totalScans = 0;
        ballValues = initializeBallValues();
      }
      
      if (onValuesChange) {
        onValuesChange(ballValues, totalScans);
      }
    } catch (err) {
      const trailbaseError: TrailbaseError = err instanceof Error 
        ? Object.assign(err, { status: (err as { status?: number }).status || 500 })
        : new Error('Failed to load initial data');
      
      error = trailbaseError;
      
      // Initialize with zeros on error
      ballValues = initializeBallValues();
      totalScans = 0;
    } finally {
      loading = false;
    }
  };
  
  const subscribe = (): (() => void) => {
    const subscriberId = `ball-values-${Date.now()}-${Math.random()}`;
    
    return trailbaseClient.subscribe(subscriberId, (scanData) => {
      // **KEY FIX**: Filter by targetRound if specified (for main page latest round only)
      const filterRound = targetRound || currentRound;
      if (filterRound && scanData.round !== filterRound) {
        // Ignore updates for different rounds
        return;
      }
      
      // Update current round only if no targetRound specified or if it matches
      if (!targetRound && scanData.round !== currentRound) {
        currentRound = scanData.round;
      }
      
      // Extract new values
      const newValues = extractBallValues(scanData);
      const newTotalScans = Number(scanData.total_scans) || 0;
      
      // Check for changes and trigger animations
      const updatedBalls: Record<number, boolean> = {};
      let hasChanges = false;
      
      for (let i = 1; i <= 45; i++) {
        const newValue = newValues[i];
        const currentValue = ballValues[i] || 0;
        
        if (newValue !== currentValue) {
          hasChanges = true;
          updatedBalls[i] = true;
          
          if (onBallUpdate) {
            onBallUpdate(i, newValue, currentValue);
          }
          
          // Clear animation after delay (match animation duration)
          setTimeout(() => {
            recentlyUpdated = {
              ...untrack(() => recentlyUpdated),
              [i]: false
            };
          }, 1200); // 600ms animation + 600ms visibility
        }
      }
      
      if (hasChanges) {
        ballValues = newValues;
        recentlyUpdated = { ...recentlyUpdated, ...updatedBalls };
      }
      
      if (newTotalScans !== totalScans) {
        totalScans = newTotalScans;
      }
      
      if (hasChanges || newTotalScans !== totalScans) {
        if (onValuesChange) {
          onValuesChange(ballValues, totalScans);
        }
      }
    });
  };
  
  // Function to update target round (useful for dynamic filtering)
  const setTargetRound = (round: number | null) => {
    targetRound = round;
  };
  
  // Auto-load initial data if round provided
  if (initialRound) {
    loadInitialData();
  }
  
  return {
    get ballValues() { return ballValues; },
    get totalScans() { return totalScans; },
    get currentRound() { return currentRound; },
    get recentlyUpdated() { return recentlyUpdated; },
    get loading() { return loading; },
    get error() { return error; },
    loadInitialData,
    subscribe,
    setTargetRound
  };
}

/**
 * Simple composable for connection status display
 */
export function useConnectionStatus() {
  let connected = $state(false);
  let connecting = $state(false);
  let error = $state<TrailbaseError | null>(null);
  let retryCount = $state(0);
  
  const subscribe = (): (() => void) => {
    return trailbaseClient.subscribeToConnectionState(
      `connection-status-${Date.now()}`,
      (state) => {
        connected = state.connected;
        connecting = state.connecting;
        error = state.error;
        retryCount = state.retryCount;
      }
    );
  };
  
  return {
    get connected() { return connected; },
    get connecting() { return connecting; },
    get error() { return error; },
    get retryCount() { return retryCount; },
    subscribe
  };
}