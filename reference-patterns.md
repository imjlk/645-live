# SvelteKit 개발 참고자료

## 목차

1. [SvelteKit 렌더링 전략](#sveltekit-렌더링-전략)
2. [TrailBase 클라이언트 쿼리 패턴](#trailbase-클라이언트-쿼리-패턴)
3. [페이지네이션 처리](#페이지네이션-처리)
4. [svelte-meta-tags 활용](#svelte-meta-tags-활용)
5. [JSON-LD 스키마 패턴](#json-ld-스키마-패턴)
6. [컴포넌트 재사용 패턴](#컴포넌트-재사용-패턴)
7. [에러 처리 및 디버깅](#에러-처리-및-디버깅)

---

## SvelteKit 렌더링 전략

### Prerender vs SSR 설정

**정적 페이지 (Prerender)**

```typescript
// +page.server.ts
export const prerender = true;
```

- 빌드 시 정적 HTML 생성
- 데이터베이스 연결 제한 (building 환경에서 스킵)
- 메인 통계 페이지 등 정적 콘텐츠에 적합

**동적 페이지 (SSR)**

```typescript
// +page.server.ts
export const prerender = false;
export const ssr = true;
```

- 요청 시 서버에서 렌더링
- 데이터베이스 연결 필요
- 파라미터 기반 동적 콘텐츠에 적합

### 데이터베이스 연결 처리

**hooks.server.ts 패턴**

```typescript
import { building } from "$app/environment";

export const handle: Handle = async ({ event, resolve }) => {
    // 빌드 중이거나 prerender 중에는 데이터베이스 연결 스킵
    if (building) {
        return resolve(event);
    }
    
    try {
        const databaseUrl = getDatabaseUrl(event);
        event.locals.db = createDrizzleClient(databaseUrl);
        // ... 인증 및 기타 로직
    } catch (error) {
        // 개발 환경에서는 에러를 던지지 않고 계속 진행
        if (process.env.NODE_ENV === 'development') {
            return resolve(event);
        }
        throw error;
    }
};
```

---

## TrailBase 클라이언트 쿼리 패턴

### 기본 쿼리 구조

```typescript
import { initClient } from "trailbase";

const client = initClient(env.TRAILBASE_URL || "http://localhost:4000");

// 기본 쿼리
const response = await client.records("table_name").list({
    order: ["-column_name"],
    pagination: { limit: 1024, offset: 0 }
});
```

### 페이지네이션 제한 처리

**주요 제약사항**

- TrailBase 페이지네이션 limit 최대값: 1024
- 9999 등 큰 값 요청 시 제한 적용

**대용량 데이터 배치 처리**

```typescript
async function fetchAllRecords(selectedRounds: number) {
    let allRecords: Array<RecordType> = [];
    const batchSize = 1024;
    let offset = 0;
    
    while (allRecords.length < selectedRounds) {
        const remainingRecords = selectedRounds - allRecords.length;
        const currentLimit = Math.min(batchSize, remainingRecords);
        
        const response = await client.records("table_name").list({
            order: ["-round"],
            pagination: { limit: currentLimit, offset }
        });
        
        const batchRecords = response.records as Array<RecordType>;
        
        if (batchRecords.length === 0) {
            break; // 더 이상 데이터가 없으면 중단
        }
        
        allRecords = allRecords.concat(batchRecords);
        offset += currentLimit;
    }
    
    return allRecords.slice(0, selectedRounds);
}
```

---

## 페이지네이션 처리

### 클라이언트 사이드 페이지네이션

**URL 파라미터 기반**

```typescript
// +page.svelte
$: currentPage = Number(page.url.searchParams.get("page") || "1");

const createPageUrl = (newPage: number) => {
    const url = new URL(page.url);
    url.searchParams.set("page", String(newPage));
    return url.toString();
};
```

**페이지네이션 UI 컴포넌트**

```svelte
{#if data.totalPages > 1}
<div class="flex justify-center">
    <div class="join">
        {#if currentPage > 1}
            <LinkButton href={createPageUrl(currentPage - 1)} class="join-item btn-outline">
                이전
            </LinkButton>
        {/if}
        
        {#each Array.from({length: Math.min(5, data.totalPages)}, (_, i) => {
            const start = Math.max(1, currentPage - 2);
            return start + i;
        }).filter(page => page <= data.totalPages) as pageNum}
            <LinkButton 
                href={createPageUrl(pageNum)} 
                class="join-item {pageNum === currentPage ? 'btn-primary' : 'btn-outline'}"
            >
                {pageNum}
            </LinkButton>
        {/each}
        
        {#if currentPage < data.totalPages}
            <LinkButton href={createPageUrl(currentPage + 1)} class="join-item btn-outline">
                다음
            </LinkButton>
        {/if}
    </div>
</div>
{/if}
```

---

## svelte-meta-tags 활용

### 기본 MetaTags 설정

```svelte
<script>
import { MetaTags, JsonLd } from 'svelte-meta-tags';
</script>

<MetaTags
    title="페이지 제목"
    titleTemplate="%s | 645.live"
    description="페이지 설명"
    canonical="https://www.645.live/page-url"
    keywords={["키워드1", "키워드2", "키워드3"]}
    robots="index,follow"
    additionalRobotsProps={{
        maxSnippet: 320,
        maxImagePreview: 'large',
        maxVideoPreview: 60
    }}
    additionalMetaTags={[
        {
            name: 'application-name',
            content: '645.live'
        },
        {
            name: 'theme-color',
            content: '#3B82F6'
        },
        {
            name: 'format-detection',
            content: 'telephone=no'
        },
        {
            name: 'author',
            content: '645.live'
        },
        {
            name: 'generator',
            content: 'SvelteKit'
        },
        {
            property: 'article:publisher',
            content: 'https://www.645.live'
        }
    ]}
    openGraph={{
        type: 'article',
        url: 'https://www.645.live/page-url',
        title: '오픈그래프 제목',
        description: '오픈그래프 설명',
        locale: 'ko_KR',
        images: [{
            url: 'https://www.645.live/images/og-image.png',
            width: 1200,
            height: 630,
            alt: '이미지 설명',
            secureUrl: 'https://www.645.live/images/og-image.png',
            type: 'image/png'
        }],
        siteName: '645.live',
        article: {
            section: '로또 통계',
            tags: ['로또', '통계', '분석'],
            publishedTime: '2025-01-01T00:00:00.000Z',
            modifiedTime: new Date().toISOString()
        }
    }}
    twitter={{
        cardType: 'summary_large_image',
        site: '@645live',
        title: '트위터 제목',
        description: '트위터 설명',
        image: 'https://www.645.live/images/twitter-image.png',
        imageAlt: '트위터 이미지 설명'
    }}
/>
```

### 동적 메타데이터 처리

**데이터 기반 동적 메타태그**

```svelte
<MetaTags
    title={`로또 6/45 AC값 분석 (최근 ${data.selectedRounds}회차)`}
    description={`최근 ${data.selectedRounds}회차 AC값 상세 분석 - 평균 ${data.acStats.summary.avgAC.toFixed(2)}`}
    openGraph={{
        title: `로또 6/45 AC값 ${data.selectedRounds}회차 분석`,
        description: `평균 AC값 ${data.acStats.summary.avgAC.toFixed(2)} | 최대 ${data.acStats.summary.maxAC}`
    }}
/>
```

---

## JSON-LD 스키마 패턴

### Dataset 스키마

```svelte
<JsonLd
    schema={{
        '@type': 'Dataset',
        name: '데이터셋 이름',
        description: '데이터셋 설명',
        url: 'https://www.645.live/dataset-url',
        creator: {
            '@type': 'Organization',
            name: '645.live'
        },
        temporalCoverage: '시간 범위',
        spatial: {
            '@type': 'Country',
            name: '대한민국'
        },
        variableMeasured: [
            {
                '@type': 'PropertyValue',
                name: '변수명',
                value: '변수값'
            }
        ],
        mainEntity: {
            '@type': 'StatisticalPopulation',
            name: '통계 모집단',
            populationSize: 1000
        }
    }}
/>
```

### BreadcrumbList 스키마

```svelte
<JsonLd
    schema={{
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.label,
            ...(item.href && { item: `https://www.645.live${item.href}` })
        }))
    }}
/>
```

---

## 컴포넌트 재사용 패턴

### Breadcrumbs 컴포넌트

**TypeScript 인터페이스**

```typescript
export interface BreadcrumbItem {
    label: string;
    href?: string;
    current?: boolean;
}
```

**컴포넌트 구현**

```svelte
<!-- Breadcrumbs.svelte -->
<script lang="ts">
import { JsonLd } from 'svelte-meta-tags';

export interface BreadcrumbItem {
    label: string;
    href?: string;
    current?: boolean;
}

export let items: BreadcrumbItem[] = [];
export let siteName = "645.live";

// JSON-LD 스키마 생성
$: breadcrumbSchema = {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        ...(item.href && { item: `https://www.645.live${item.href}` })
    }))
};
</script>

<!-- JSON-LD 스키마 -->
<JsonLd schema={breadcrumbSchema} />

<!-- Breadcrumbs UI -->
<div class="breadcrumbs text-sm">
    <ul>
        {#each items as item}
            <li>
                {#if item.href && !item.current}
                    <a href={item.href} class="hover:text-primary">{item.label}</a>
                {:else}
                    <span class="text-base-content/70">{item.label}</span>
                {/if}
            </li>
        {/each}
    </ul>
</div>
```

**사용 예제**

```svelte
<script>
import Breadcrumbs from "$lib/ui/Breadcrumbs.svelte";

const breadcrumbItems = [
    { label: "홈", href: "/" },
    { label: "통계", href: "/stats" },
    { label: "AC값", href: "/stats/ac" },
    { label: `최근 ${data.selectedRounds}회차`, current: true }
];
</script>

<Breadcrumbs items={breadcrumbItems} />
```

---

## 에러 처리 및 디버깅

### 일반적인 에러 패턴

**1. platform.env.HYPERDRIVE 접근 에러**

```
Error: Cannot access platform.env.HYPERDRIVE in a prerenderable route
```

**해결방법:**

- hooks.server.ts에서 building 플래그 확인
- 데이터베이스 URL 우선순위 조정

**2. .trim() 메서드 에러**

```
TypeError: $.get(...).trim is not a function
```

**해결방법:**

```typescript
// 잘못된 방법
const str = inputValue.trim();

// 올바른 방법
const str = String(inputValue || "").trim();
```

**3. 배열 메서드 에러**

```
TypeError: keywords.join is not a function
```

**해결방법:**

```svelte
<!-- 문자열을 배열로 변환 -->
keywords={["keyword1", "keyword2", "keyword3"]}
```

### 입력 검증 패턴

**숫자 입력 검증**

```typescript
const validateInput = (value: string): boolean => {
    const str = String(value || "");
    if (str.trim() === "") return false;
    const num = Number(str);
    return !Number.isNaN(num) && num > 0 && num <= maxValue;
};
```

**HTML 입력 필드 설정**

```svelte
<input
    type="text"
    inputmode="numeric"
    pattern="[0-9]*"
    bind:value={inputValue}
    onkeydown={handleKeydown}
    class="input input-bordered input-sm w-24 text-center"
    placeholder="회차 수 입력"
/>
```

### 네비게이션 처리

**안전한 페이지 이동**

```typescript
const navigateToAnalysis = async () => {
    const inputStr = String(inputValue || "");
    
    if (inputStr.trim() === "") {
        alert("분석할 회차 수를 입력해주세요.");
        return;
    }
    
    if (validateInput(inputStr)) {
        const rounds = Number(inputStr);
        try {
            await goto(`/stats/ac/${rounds}`);
        } catch (error) {
            console.error("Navigation error:", error);
            alert("페이지 이동 중 오류가 발생했습니다.");
        }
    } else {
        alert(`1부터 ${maxRounds}까지의 숫자를 입력해주세요.`);
    }
};
```

---

## 성능 최적화 팁

### 1. 배치 처리 최적화

- 대용량 데이터 조회 시 1024 단위로 분할
- 필요한 데이터만 slice()로 제한
- 메모리 효율적인 배열 결합

### 2. 메타데이터 최적화

- 동적 메타데이터는 서버 사이드에서 생성
- 이미지 URL은 절대 경로 사용
- JSON-LD 스키마는 재사용 가능하게 설계

### 3. 컴포넌트 재사용

- 공통 UI 패턴은 별도 컴포넌트로 분리
- TypeScript 인터페이스로 타입 안정성 확보
- props 기본값 설정으로 유연성 제공

### 4. 에러 핸들링

- 개발/프로덕션 환경별 에러 처리 분리
- 사용자 친화적인 에러 메시지 제공
- 콘솔 로그로 디버깅 정보 제공

---

이 문서는 645.live 프로젝트에서 사용된 패턴들을 정리한 것으로, 향후 유사한 기능 개발 시 참고자료로 활용할 수 있습니다.
