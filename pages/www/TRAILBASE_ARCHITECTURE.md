# TrailBase Client Architecture Documentation

> Status: 레거시 참고 문서. 현재 실행/설정 기준은 `pages/www/README.md`와 실제 소스 코드를 우선합니다.
> Svelte 예제 문법은 작성 시점 기준이므로, 신규 구현에서는 Svelte 5 runes 규칙을 우선 적용하세요.

## Overview

This document describes the refactored TrailBase client architecture for the 645.live project, optimized for Svelte 5 with improved error handling, type safety, and SSR compatibility.

## Architecture Overview

```
/src/lib/trailbase/
├── types.ts              # Type definitions only (SSR-safe)
├── client.ts             # Singleton client with plain TypeScript
├── composables.svelte.ts # Svelte 5 runes-based reactive state management
└── /src/lib/stores/streamStore.ts  # Backward compatibility wrapper
```

## Core Components

### 1. Types (`/lib/trailbase/types.ts`)

**Purpose**: Centralized type definitions for all TrailBase-related functionality.

**Key Types**:

```typescript
interface LottoDrawScanCount {
  round: number;
  scan_count_1 through scan_count_45: number;
  total_scans: number;
  updated_at: string;
}

interface TrailbaseError extends Error {
  status?: number;
  code?: string;
}

interface ConnectionState {
  connected: boolean;
  connecting: boolean;
  error: TrailbaseError | null;
  lastConnected: Date | null;
  retryCount: number;
}
```

### 2. Client (`/lib/trailbase/client.ts`)

**Purpose**: Singleton TrailBase client with connection management and error handling.

**Key Features**:

- ✅ **SSR-Safe**: Uses plain TypeScript objects instead of Svelte runes
- ✅ **Singleton Pattern**: Single instance across application
- ✅ **Auto-Reconnection**: Exponential backoff with jitter (max 5 attempts)
- ✅ **Error Handling**: Comprehensive error types and recovery
- ✅ **Subscriber Management**: Efficient subscription lifecycle

**Core Methods**:

```typescript
class TrailBaseClient {
  // Subscription management
  subscribe(id: string, callback: SubscriberCallback): () => void
  subscribeToConnectionState(id: string, callback: ConnectionStateCallback): () => void
  
  // Data fetching
  getScanDataSafely(round: number): Promise<LottoDrawScanCount | null>
  getLatestScanData(): Promise<LottoDrawScanCount | null>
  
  // Connection management
  reconnect(): Promise<void>
  getConnectionState(): ConnectionState
}
```

**Usage**:

```typescript
import { trailbaseClient } from '$lib/trailbase/client';

// Subscribe to real-time updates
const unsubscribe = trailbaseClient.subscribe('my-component', (data) => {
  console.log('New scan data:', data);
});

// Fetch data safely (handles 404s)
const scanData = await trailbaseClient.getScanDataSafely(1234);
```

### 3. Composables (`/lib/trailbase/composables.svelte.ts`)

**Purpose**: Svelte 5 runes-based reactive state management for components.

**Key Composables**:

#### `useBallValues(options)`

Manages lotto ball values with real-time updates and animations.

```typescript
interface UseBallValuesOptions {
  initialRound?: number;
  onValuesChange?: (values: Record<number, number>, totalScans: number) => void;
  onBallUpdate?: (ballNumber: number, newValue: number, oldValue: number) => void;
}

const ballValues = useBallValues({
  initialRound: 1234,
  onBallUpdate: (ball, newVal, oldVal) => {
    console.log(`Ball ${ball} updated: ${oldVal} → ${newVal}`);
  }
});

// Reactive properties
ballValues.ballValues      // Record<number, number>
ballValues.totalScans      // number
ballValues.currentRound    // number | null
ballValues.recentlyUpdated // Record<number, boolean> (for animations)
ballValues.loading         // boolean
ballValues.error           // TrailbaseError | null

// Methods
ballValues.loadInitialData(round?: number): Promise<void>
ballValues.subscribe(): () => void
```

#### `useConnectionStatus()`

Monitors real-time connection status.

```typescript
const connectionStatus = useConnectionStatus();

// Reactive properties
connectionStatus.connected    // boolean
connectionStatus.connecting   // boolean
connectionStatus.error       // TrailbaseError | null
connectionStatus.retryCount  // number

// Methods
connectionStatus.subscribe(): () => void
```

#### `useScanData(options)`

General-purpose scan data fetching with loading states.

```typescript
const scanData = useScanData({
  round: 1234,
  autoLoad: true,
  onError: (error) => console.error(error)
});

// Reactive properties
scanData.data     // LottoDrawScanCount | null
scanData.loading  // boolean
scanData.error    // TrailbaseError | null

// Methods
scanData.refetch(): Promise<void>
```

### 4. UI Components

#### `ErrorBoundary.svelte`

Global error handling component with retry functionality.

```svelte
<script lang="ts">
import ErrorBoundary from '$lib/ui/ErrorBoundary.svelte';

let errorBoundary: ErrorBoundary;

function handleError(error: Error) {
  errorBoundary.handleError(error);
}
</script>

<ErrorBoundary bind:this={errorBoundary} onError={(err) => console.log(err)}>
  <MyComponent />
</ErrorBoundary>
```

#### `LoadingSpinner.svelte`

Consistent loading states across the application.

```svelte
<LoadingSpinner 
  size="large" 
  message="로딩 중..." 
  fullPage={false}
  color="primary" 
/>
```

#### `ConnectionStatus.svelte`

Real-time connection status indicator.

```svelte
<ConnectionStatus 
  showDetails={true}
  position="top"
  size="medium"
/>
```

## Migration Guide

### From Old StreamStore to New Client

**Before:**

```typescript
import { 
  subscribeToScanCountUpdates,
  getScanDataSafely,
  getLatestScanData 
} from '$lib/stores/streamStore';

// Manual subscription management
const unsubscribe = subscribeToScanCountUpdates('id', callback);
onDestroy(() => unsubscribe());

// Manual data fetching
const data = await getScanDataSafely(round);
```

**After (Recommended):**

```typescript
import { useBallValues } from '$lib/trailbase/composables.svelte';

// Declarative, reactive approach
const ballValues = useBallValues({ initialRound: round });

onMount(() => {
  const unsubscribe = ballValues.subscribe();
  return unsubscribe; // Svelte 5 auto-cleanup
});

// Reactive data access
$: console.log('Current data:', ballValues.ballValues);
```

### Component Usage Pattern

**Standard Pattern for Svelte 5 Components:**

```svelte
<script lang="ts">
import { useBallValues, useConnectionStatus } from '$lib/trailbase/composables.svelte';
import { onMount, onDestroy } from 'svelte';

interface Props {
  initialRound?: number;
}

let { initialRound }: Props = $props();

// Initialize composables
const ballValues = useBallValues({ 
  initialRound,
  onBallUpdate: (ball, newVal, oldVal) => {
    // Handle ball updates (animations, etc.)
  }
});

const connectionStatus = useConnectionStatus();

// Subscription management
let unsubscribeBalls: (() => void) | null = null;
let unsubscribeConnection: (() => void) | null = null;

onMount(async () => {
  // Load initial data
  if (initialRound) {
    await ballValues.loadInitialData(initialRound);
  }
  
  // Set up subscriptions
  unsubscribeBalls = ballValues.subscribe();
  unsubscribeConnection = connectionStatus.subscribe();
});

onDestroy(() => {
  unsubscribeBalls?.();
  unsubscribeConnection?.();
});

// Reactive derived values
let numbers = $derived(
  Array.from({ length: 45 }, (_, i) => ({
    id: i + 1,
    value: ballValues.ballValues[i + 1] || 0
  }))
);
</script>

<!-- Template with reactive data -->
{#if ballValues.error}
  <div class="error">Error: {ballValues.error.message}</div>
{:else if ballValues.loading}
  <LoadingSpinner message="Loading..." />
{:else}
  <div class="connection-status">
    Status: {connectionStatus.connected ? '연결됨' : '연결 끊김'}
  </div>
  
  {#each numbers as ball}
    <BallComponent 
      {ball} 
      animated={ballValues.recentlyUpdated[ball.id] || false}
    />
  {/each}
{/if}
```

## Error Handling Strategy

### Connection Errors

- **Automatic Retry**: Exponential backoff (1s, 2s, 4s, 8s, 16s max)
- **Jitter**: Random delay to prevent thundering herd
- **Max Attempts**: 5 retry attempts before giving up
- **Recovery**: Automatic reconnection when subscribers exist

### Data Fetching Errors

- **404 Handling**: Returns `null` instead of throwing
- **Network Errors**: Logged and reported through error state
- **Timeout**: Configurable timeout with proper cleanup

### Error Propagation

```typescript
try {
  const data = await trailbaseClient.getScanDataSafely(round);
} catch (error) {
  // Error is typed as TrailbaseError
  console.error(`Status: ${error.status}, Code: ${error.code}`);
  console.error(`Message: ${error.message}`);
}
```

## Performance Considerations

### Memory Management

- **Automatic Cleanup**: Subscriptions cleaned up after 100ms delay when no subscribers
- **Subscription Deduplication**: Multiple subscribers share single connection
- **State Immutability**: State objects are copied to prevent mutations

### Caching Strategy

- **Connection Reuse**: Single WebSocket connection shared across components
- **Data Caching**: Fetched data cached at client level
- **Smart Reconnection**: Only reconnects when active subscribers exist

### Bundle Size

- **Tree Shaking**: Individual composables can be imported separately
- **Type-only Imports**: Types don't affect bundle size
- **Lazy Loading**: TrailBase client only loaded in browser environment

## Testing Strategy

### Unit Testing Composables

```typescript
import { render } from '@testing-library/svelte';
import { useBallValues } from '$lib/trailbase/composables.svelte';

test('useBallValues loads initial data', async () => {
  const ballValues = useBallValues({ initialRound: 1234 });
  
  await ballValues.loadInitialData();
  
  expect(ballValues.currentRound).toBe(1234);
  expect(ballValues.loading).toBe(false);
});
```

### Integration Testing

```typescript
test('real-time updates trigger animations', async () => {
  const ballValues = useBallValues();
  const unsubscribe = ballValues.subscribe();
  
  // Simulate TrailBase update
  mockTrailbaseUpdate({
    round: 1234,
    scan_count_1: 100,
    total_scans: 1000
  });
  
  // Check animation state
  expect(ballValues.recentlyUpdated[1]).toBe(true);
  
  unsubscribe();
});
```

## Configuration

### Environment Variables

```bash
# TrailBase connection URL
PUBLIC_TRAILBASE_URL=http://localhost:4000

# Optional: Connection timeout (ms)
TRAILBASE_TIMEOUT=30000

# Optional: Retry configuration
TRAILBASE_MAX_RETRIES=5
TRAILBASE_RETRY_DELAY=1000
```

### Build Configuration

```typescript
// vite.config.ts
export default defineConfig({
  define: {
    // Ensure browser-only code is properly handled
    'import.meta.env.SSR': 'false'
  }
});
```

## Future Enhancements

### Planned Features

1. **Offline Support**: Cache data for offline usage
2. **Real-time Indicators**: Visual indicators for live updates
3. **Performance Monitoring**: Track connection health and latency
4. **Advanced Caching**: Smart cache invalidation strategies
5. **WebRTC Fallback**: Alternative connection methods

### Migration Path

1. **Phase 1** ✅: Core client and composables (Current)
2. **Phase 2**: Migrate all components to new composables
3. **Phase 3**: Remove old streamStore.ts wrapper
4. **Phase 4**: Add advanced features (offline, monitoring)

## Troubleshooting

### Common Issues

#### SSR Rune Errors

**Error**: `rune_outside_svelte`
**Solution**: Use composables in `.svelte` files, not `.ts` files

#### Connection Drops

**Error**: WebSocket disconnections
**Solution**: Client automatically reconnects with exponential backoff

#### Memory Leaks

**Error**: Accumulating subscriptions
**Solution**: Always call returned unsubscribe function in `onDestroy`

#### Type Errors

**Error**: Missing type definitions
**Solution**: Import types from `$lib/trailbase/types`

### Debug Mode

```typescript
// Enable detailed logging
localStorage.setItem('trailbase_debug', 'true');

// Check connection state
console.log(trailbaseClient.getConnectionState());
```

## Best Practices

### Component Patterns

1. **Use Composables**: Prefer `useBallValues()` over direct client access
2. **Handle Loading**: Always show loading states for better UX
3. **Error Boundaries**: Wrap components in ErrorBoundary
4. **Cleanup**: Always unsubscribe in `onDestroy`

### Performance Tips

1. **Batch Updates**: Group related state changes
2. **Debounce**: Limit frequency of reactive updates
3. **Lazy Loading**: Load data only when needed
4. **Connection Status**: Show connection indicators for real-time features

### Security Considerations

1. **Input Validation**: Validate all data from TrailBase
2. **Error Sanitization**: Don't expose internal errors to users
3. **Rate Limiting**: Respect TrailBase rate limits
4. **Connection Security**: Use WSS in production

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Compatibility**: Svelte 5, TrailBase latest
