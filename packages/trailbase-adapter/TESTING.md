# Testing Guide

TrailBase Adapter 패키지의 포괄적인 테스트 가이드입니다.

## 🚀 빠른 시작

```bash
# 테스트 의존성 설치
bun install

# 모든 테스트 실행
bun test

# 커버리지와 함께 테스트 실행
bun test:coverage

# 워치 모드로 테스트 실행
bun test:watch

# UI 모드로 테스트 실행
bun test:ui
```

## 📁 테스트 구조

```
tests/
├── core/                   # 핵심 BaseAdapter 테스트
│   └── BaseAdapter.test.ts
├── adapters/               # 어댑터별 구현 테스트
│   └── TrailBaseAdapter.test.ts
├── svelte/                 # Svelte composables 테스트
│   └── composables.test.ts
├── e2e/                    # 통합 테스트
│   └── integration.test.ts
├── performance/            # 성능 벤치마크
│   └── benchmark.test.ts
├── mocks/                  # 테스트용 Mock 구현
│   └── MockAdapter.ts
└── utils/                  # 테스트 헬퍼 유틸리티
    └── test-helpers.ts
```

## 🧪 테스트 카테고리

### 1. 단위 테스트 (Unit Tests)

**BaseAdapter 테스트 (`tests/core/BaseAdapter.test.ts`)**

- ✅ 연결 관리 (연결/해제/재연결)
- ✅ 연결 상태 구독
- ✅ 캐시 관리
- ✅ 에러 처리
- ✅ 재시도 로직
- ✅ 리소스 정리

```bash
# BaseAdapter만 테스트
bun test tests/core/BaseAdapter.test.ts
```

### 2. 통합 테스트 (Integration Tests)

**TrailBaseAdapter 테스트 (`tests/adapters/TrailBaseAdapter.test.ts`)**

- ✅ TrailBase 클라이언트 초기화
- ✅ CRUD 작업 (Create, Read, Update, Delete)
- ✅ 실시간 구독 관리
- ✅ 연결 상태 관리
- ✅ 캐싱 로직
- ✅ 에러 시나리오

```bash
# TrailBaseAdapter만 테스트
bun test tests/adapters/TrailBaseAdapter.test.ts
```

### 3. Svelte 통합 테스트

**Composables 테스트 (`tests/svelte/composables.test.ts`)**

- ✅ `useRealtimeData` - 실시간 데이터 관리
- ✅ `useConnectionStatus` - 연결 상태 모니터링
- ✅ `useRealtimeSubscription` - 순수 구독 관리
- ✅ `useCachedData` - 캐시된 데이터 관리

```bash
# Svelte composables만 테스트
bun test tests/svelte/composables.test.ts
```

### 4. E2E 테스트 (End-to-End)

**통합 테스트 (`tests/e2e/integration.test.ts`)**

- ✅ 완전한 CRUD 플로우
- ✅ 실시간 업데이트와 composables 통합
- ✅ 연결 실패 및 복구
- ✅ 에러 처리 시나리오
- ✅ 성능 시나리오
- ✅ 데이터 일관성

```bash
# E2E 테스트만 실행
bun test tests/e2e/integration.test.ts
```

### 5. 성능 테스트

**벤치마크 테스트 (`tests/performance/benchmark.test.ts`)**

- ✅ 대용량 데이터셋 처리
- ✅ 동시 작업 성능
- ✅ 구독 성능
- ✅ 메모리 사용량
- ✅ 캐시 효율성
- ✅ 에러 복구 성능

```bash
# 성능 테스트만 실행
bun test tests/performance/benchmark.test.ts
```

## 🛠️ 테스트 도구

### MockAdapter

실제 TrailBase 없이 테스트할 수 있는 완전한 mock 구현:

```typescript
import { MockAdapter } from '../tests/mocks/MockAdapter.js';

const adapter = new MockAdapter({
  autoConnect: true,
  connectionDelay: 10,
  simulateNetworkLatency: 5,
  mockData: {
    my_table: [
      { id: 1, name: 'Test', value: 42 }
    ]
  }
});
```

### 테스트 헬퍼

편리한 테스트 유틸리티들:

```typescript
import { 
  createTestAdapter,
  waitFor,
  generateTestData,
  PerformanceTracker 
} from '../tests/utils/test-helpers.js';

// 테스트용 어댑터 생성
const adapter = createTestAdapter();

// 조건 대기
await waitFor(() => adapter.isConnected());

// 테스트 데이터 생성
const data = generateTestData(100, (i) => ({ name: `Item ${i}` }));

// 성능 측정
const tracker = new PerformanceTracker();
const end = tracker.start('operation');
await someOperation();
end();
```

## 📊 테스트 커버리지

현재 커버리지 목표:

- **전체**: 80%+
- **Functions**: 80%+
- **Lines**: 80%+
- **Branches**: 80%+

```bash
# 커버리지 리포트 생성
bun test:coverage

# HTML 리포트 확인
open coverage/index.html
```

## 🐛 테스트 시나리오

### 연결 시나리오

```typescript
// 성공적인 연결
await adapter.connect();
expect(adapter.isConnected()).toBe(true);

// 연결 실패 처리
const failingAdapter = new MockAdapter({ shouldFailConnection: true });
await expect(failingAdapter.connect()).rejects.toThrow();

// 재연결
await adapter.disconnect();
await adapter.reconnect();
```

### 데이터 작업 시나리오

```typescript
// CRUD 작업
const record = await adapter.create('table', { name: 'Test' });
const found = await adapter.findOne('table', record.id);
const updated = await adapter.update('table', record.id, { name: 'Updated' });
await adapter.delete('table', record.id);

// 404 처리
const notFound = await adapter.findOne('table', 999);
expect(notFound).toBeNull();
```

### 실시간 업데이트 시나리오

```typescript
const updates = [];
const unsubscribe = adapter.subscribe(
  { table: 'test_table' },
  (data) => updates.push(data)
);

await adapter.simulateUpdate('test_table', { id: 1, name: 'Updated' });
expect(updates).toHaveLength(1);

unsubscribe();
```

## 🔧 테스트 설정

### Vitest 설정

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    coverage: {
      provider: 'v8',
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
});
```

### Mock 설정

```typescript
// TrailBase 모킹
vi.mock('trailbase', () => ({
  initClient: vi.fn(() => ({
    records: vi.fn(() => ({
      subscribe: vi.fn(),
      read: vi.fn(),
      list: vi.fn(),
    })),
  })),
}));

// Svelte 모킹
vi.mock('svelte', () => ({
  untrack: vi.fn((fn) => fn()),
}));
```

## 📈 성능 벤치마크

### 성능 목표

- **단일 조회**: < 10ms (mock 기준)
- **대량 조회**: < 50ms (1000개 레코드)
- **구독 생성**: < 5ms
- **업데이트 전파**: < 20ms (50개 구독자)

### 벤치마크 실행

```bash
# 성능 테스트만 실행
bun test tests/performance/benchmark.test.ts

# 상세한 성능 리포트와 함께
bun test tests/performance/benchmark.test.ts --reporter=verbose
```

## 🚨 트러블슈팅

### 일반적인 문제들

1. **타이밍 이슈**
   ```typescript
   // ❌ 잘못됨
   adapter.connect();
   expect(adapter.isConnected()).toBe(true);
   
   // ✅ 올바름
   await adapter.connect();
   expect(adapter.isConnected()).toBe(true);
   ```

2. **Mock 정리**
   ```typescript
   afterEach(async () => {
     await adapter.destroy();
     vi.clearAllMocks();
   });
   ```

3. **비동기 대기**
   ```typescript
   // 상태 변화 대기
   await waitFor(() => connectionStatus.connected());
   
   // 또는 고정 시간 대기
   await waitForAsync(50);
   ```

### 디버깅

```bash
# 단일 테스트 파일 실행
bun test tests/core/BaseAdapter.test.ts

# 특정 테스트만 실행
bun test tests/core/BaseAdapter.test.ts -t "should connect successfully"

# 상세한 출력과 함께
bun test --reporter=verbose

# 실패 시에만 출력
bun test --reporter=basic
```

## 🎯 테스트 작성 가이드

### 좋은 테스트 작성

1. **명확한 테스트 이름**
   ```typescript
   it('should handle 404 errors gracefully when record not found', async () => {
     // 테스트 내용
   });
   ```

2. **AAA 패턴** (Arrange, Act, Assert)
   ```typescript
   it('should update record successfully', async () => {
     // Arrange
     const adapter = createTestAdapter();
     await adapter.connect();
     
     // Act
     const result = await adapter.update('table', 1, { name: 'Updated' });
     
     // Assert
     expect(result.name).toBe('Updated');
   });
   ```

3. **적절한 정리**
   ```typescript
   afterEach(async () => {
     await adapter.destroy();
   });
   ```

이 테스트 슈트는 TrailBase Adapter의 모든 핵심 기능이 올바르게 작동하는지 확인하고, 향후 변경 사항이 기존 기능을 깨뜨리지 않도록 보장합니다.