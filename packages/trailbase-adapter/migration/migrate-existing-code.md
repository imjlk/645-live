# 기존 코드 마이그레이션 가이드

## 1. 기존 코드 → 새 패키지 구조

### 기존 클라이언트 교체

**Before (기존):**
```typescript
import { trailbaseClient } from '$lib/trailbase/client';
```

**After (새 패키지):**
```typescript
import { createAdapter } from '@645live/trailbase-adapter';

const adapter = createAdapter('trailbase', {
  url: env.PUBLIC_TRAILBASE_URL || 'http://localhost:4000'
});
```

### 기존 Composables 교체

**Before:**
```typescript
import { useBallValues, useConnectionStatus } from '$lib/trailbase/composables.svelte';
```

**After:**
```typescript
import { useRealtimeData, useConnectionStatus } from '@645live/trailbase-adapter/svelte';
```

## 2. 타입 마이그레이션

### LottoDrawScanCount 타입 확장

```typescript
import type { BaseRecord } from '@645live/trailbase-adapter';

interface LottoDrawScanCount extends BaseRecord {
  round: number;
  scan_count_1: number;
  scan_count_2: number;
  // ... 기존 필드들
  total_scans: number;
  updated_at: string;
}
```

## 3. 컴포넌트 마이그레이션

### ConnectionStatus.svelte

**Before:**
```svelte
import { useConnectionStatus } from "$lib/trailbase/composables.svelte";
const connectionStatus = useConnectionStatus();
```

**After:**
```svelte
import { useConnectionStatus } from '@645live/trailbase-adapter/svelte';
import { getAdapter } from '@645live/trailbase-adapter';

const adapter = getAdapter();
const connectionStatus = useConnectionStatus(adapter);
```

### ScanStatusGrid.svelte

**Before:**
```svelte
import { useBallValues } from "$lib/trailbase/composables.svelte";
const ballData = useBallValues({ initialRound: 1234 });
```

**After:**
```svelte
import { useRealtimeData } from '@645live/trailbase-adapter/svelte';
import { getAdapter } from '@645live/trailbase-adapter';

const adapter = getAdapter();
const ballData = useRealtimeData(adapter, {
  table: 'lotto_draw_scan_counts',
  id: 1234,
  autoLoad: true
});
```

## 4. 설정 마이그레이션

### 앱 전체 설정

```typescript
// src/app.ts 또는 main entry point
import { getAdapter } from '@645live/trailbase-adapter';
import { env } from '$env/dynamic/public';

// 앱 시작 시 어댑터 초기화
const adapter = getAdapter({
  url: env.PUBLIC_TRAILBASE_URL || 'http://localhost:4000',
  reconnect: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000
  },
  cache: {
    enabled: true,
    ttl: 30000
  }
});
```

## 5. 점진적 마이그레이션 전략

1. **Phase 1**: 새 패키지 설치 및 기본 설정
2. **Phase 2**: ConnectionStatus 컴포넌트 마이그레이션
3. **Phase 3**: 간단한 데이터 조회 컴포넌트 마이그레이션  
4. **Phase 4**: 복잡한 실시간 구독 컴포넌트 마이그레이션
5. **Phase 5**: 기존 코드 제거 및 정리