<script lang="ts">
import { resolve } from "$app/paths";
import { absoluteUrl } from "$lib/seo/index.js";
import { MetaTags } from "svelte-meta-tags";
type SocialProviderId = "google" | "kakao" | "naver";

type PageData = {
	nextPath: string;
	socialProviders: Array<{
		id: SocialProviderId;
		label: string;
	}>;
};

type ActionForm = {
	mode?: "signIn" | "signUp";
	formError?: string;
	values?: {
		name?: string;
		email?: string;
	};
};

let { data, form }: { data: PageData; form?: ActionForm } = $props();
let manualMode = $state<"signIn" | "signUp" | null>(null);
let serverMode = $derived(form?.mode === "signUp" ? "signUp" : "signIn");
let mode = $derived(manualMode ?? serverMode);

const socialButtonClass: Record<SocialProviderId, string> = {
	google: "btn-outline",
	kakao: "btn-warning",
	naver: "btn-success",
};
</script>

<MetaTags
	title="로그인"
	titleTemplate="%s | 645.live"
	description="645.live 로그인 페이지"
	canonical={absoluteUrl("/login")}
	robots="noindex,nofollow"
/>

<div class="hero min-h-screen bg-base-200">
	<div class="hero-content flex-col lg:flex-row-reverse">
		<div class="max-w-lg space-y-4 text-center lg:text-left">
			<h1 class="text-4xl font-bold text-base-content">내 645를 시작하세요</h1>
			<p class="text-base-content/70">
				로그인하면 앞으로 개인화 스캔 내역과 회원 전용 기능이 이 계정에 연결됩니다. 지금 단계에서는 세션과 보호된 API를 먼저 엽니다.
			</p>
		</div>
		<div class="card shrink-0 w-full max-w-sm shadow-2xl bg-base-100">
			<div class="card-body">
				{#if data.socialProviders.length > 0}
				<div class="space-y-3">
					<div class="text-center text-sm font-medium text-base-content/70">소셜 로그인으로 바로 시작</div>
					<form method="POST" action="?/social" class="space-y-2">
						<input type="hidden" name="next" value={data.nextPath} />
						{#each data.socialProviders as provider (provider.id)}
							<button
								type="submit"
								name="provider"
								value={provider.id}
								class={`btn w-full ${socialButtonClass[provider.id]}`}
							>
								{provider.label}로 계속하기
							</button>
						{/each}
					</form>
				</div>

				<div class="divider">또는 이메일로 계속하기</div>
				{/if}

				<div class="tabs tabs-boxed mb-4">
					<button
						type="button"
						class="tab {mode === 'signIn' ? 'tab-active' : ''}"
						onclick={() => {
							manualMode = "signIn";
						}}
					>
						로그인
					</button>
					<button
						type="button"
						class="tab {mode === 'signUp' ? 'tab-active' : ''}"
						onclick={() => {
							manualMode = "signUp";
						}}
					>
						회원가입
					</button>
				</div>

				{#if mode === "signIn"}
				<form method="POST" action="?/signIn" class="space-y-4">
					<input type="hidden" name="next" value={data.nextPath} />
					<div class="form-control">
						<label class="label" for="email">
							<span class="label-text">Email</span>
						</label>
						<input type="email" name="email" value={form?.values?.email ?? ""} class="input input-bordered" required />
					</div>
					<div class="form-control">
						<label class="label" for="password">
							<span class="label-text">비밀번호</span>
						</label>
						<input type="password" name="password" class="input input-bordered" minlength="8" required />
					</div>
					{#if form?.formError}
					<div class="alert alert-error">
						<span>{form.formError}</span>
					</div>
					{/if}
					<div class="form-control mt-6">
						<button type="submit" class="btn btn-primary">
							이메일로 로그인
						</button>
					</div>
				</form>
				{:else}
				<form method="POST" action="?/signUp" class="space-y-4">
					<input type="hidden" name="next" value={data.nextPath} />
					<div class="form-control">
						<label class="label" for="name">
							<span class="label-text">이름</span>
						</label>
						<input type="text" name="name" value={form?.values?.name ?? ""} class="input input-bordered" required />
					</div>
					<div class="form-control">
						<label class="label" for="signup-email">
							<span class="label-text">Email</span>
						</label>
						<input type="email" id="signup-email" name="email" value={form?.values?.email ?? ""} class="input input-bordered" required />
					</div>
					<div class="form-control">
						<label class="label" for="signup-password">
							<span class="label-text">비밀번호</span>
						</label>
						<input type="password" id="signup-password" name="password" class="input input-bordered" minlength="8" required />
					</div>
					{#if form?.formError}
					<div class="alert alert-error">
						<span>{form.formError}</span>
					</div>
					{/if}
					<div class="form-control mt-6">
						<button type="submit" class="btn btn-primary">회원가입 후 계속하기</button>
					</div>
				</form>
				{/if}

				<p class="mt-4 text-xs text-base-content/60">
					계정을 만들면 이후 <code>/my</code> 보호 페이지와 typed API 세션 컨텍스트가 함께 활성화됩니다.
				</p>
				<a class="link link-primary mt-2 inline-flex" href={resolve("/")}>홈으로 돌아가기</a>
			</div>
		</div>
	</div>
</div>
