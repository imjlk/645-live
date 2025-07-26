# @645live/trailbase-adapter

재사용 가능한 TrailBase 클라이언트 어댑터 패키지

## 특징

- 🔌 어댑터 패턴으로 확장성 있는 구조
- 🔄 자동 재연결 및 에러 처리
- 📡 실시간 구독 관리
- 🎯 Svelte 5 runes 완벽 지원
- 💾 메모리 캐싱 및 최적화
- 🛡️ TypeScript 완전 지원

## 설치

```bash
bun add @645live/trailbase-adapter
```

## 사용법

### 기본 설정

```typescript
import { TrailbaseAdapter } from '@645live/trailbase-adapter';

const adapter = new TrailbaseAdapter({
  url: 'http://localhost:4000',
  reconnect: {
    maxAttempts: 5,
    baseDelay: 1000,
    maxDelay: 30000
  }
});
```

### Svelte 5 Composables

```svelte
<script lang="ts">
  import { useRealtimeData, useConnectionStatus } from '@645live/trailbase-adapter/svelte';
  
  const { data, loading, error, subscribe } = useRealtimeData({
    table: 'my_table',
    autoLoad: true
  });
  
  const connection = useConnectionStatus();
</script>
```

## 어댑터 패턴

다양한 백엔드를 지원하도록 확장 가능:

```typescript
import { createAdapter } from '@645live/trailbase-adapter';

// TrailBase 어댑터
const trailbaseAdapter = createAdapter('trailbase', config);

// 향후 다른 백엔드 지원
const supabaseAdapter = createAdapter('supabase', config);
const firebaseAdapter = createAdapter('firebase', config);
```