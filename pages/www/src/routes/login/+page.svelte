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

const nextLabel = $derived(
	data.nextPath !== "/" ? `${data.nextPath}로 이동` : "내 계정에 저장",
);
</script>

<MetaTags
	title="로그인"
	titleTemplate="%s | 645.live"
	description="645.live 로그인 페이지"
	canonical={absoluteUrl("/login")}
	robots="noindex,nofollow"
/>

<div class="min-h-screen bg-base-200 px-4 py-10 sm:py-16">
	<div class="mx-auto flex max-w-5xl justify-center">
		<div class="card w-full max-w-md border border-base-300 bg-base-100 shadow-xl">
			<div class="card-body gap-6 p-6 sm:p-8">
				<div class="space-y-3 text-center">
					<div class="mx-auto inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
						645.live
					</div>
					<div class="space-y-1">
						<h1 class="text-3xl font-bold text-base-content">
							{mode === "signIn" ? "로그인" : "회원가입"}
						</h1>
						<p class="text-sm text-base-content/65">
							스캔 내역을 {nextLabel}
						</p>
					</div>
				</div>

				<div class="tabs tabs-boxed grid w-full grid-cols-2">
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

				{#if data.socialProviders.length > 0}
					<div class="space-y-3">
						<p class="text-center text-xs font-medium uppercase tracking-[0.18em] text-base-content/45">
							소셜로 계속하기
						</p>
						<form method="POST" action="?/social" class="grid gap-2">
							<input type="hidden" name="next" value={data.nextPath} />
							{#each data.socialProviders as provider (provider.id)}
								<button
									type="submit"
									name="provider"
									value={provider.id}
									class={`btn w-full ${socialButtonClass[provider.id]}`}
								>
									{provider.label}
								</button>
							{/each}
						</form>
					</div>

					<div class="divider my-0 text-xs text-base-content/40">또는 이메일</div>
				{/if}

				{#if mode === "signIn"}
					<form method="POST" action="?/signIn" class="space-y-4">
						<input type="hidden" name="next" value={data.nextPath} />
						<div class="form-control">
							<label class="label" for="signin-email">
								<span class="label-text">이메일</span>
							</label>
							<input
								id="signin-email"
								type="email"
								name="email"
								value={form?.values?.email ?? ""}
								class="input input-bordered w-full"
								autocomplete="email"
								required
							/>
						</div>
						<div class="form-control">
							<label class="label" for="signin-password">
								<span class="label-text">비밀번호</span>
							</label>
							<input
								id="signin-password"
								type="password"
								name="password"
								class="input input-bordered w-full"
								minlength="8"
								autocomplete="current-password"
								required
							/>
						</div>
						{#if form?.formError}
							<div class="alert alert-error text-sm">
								<span>{form.formError}</span>
							</div>
						{/if}
						<button type="submit" class="btn btn-primary w-full">
							로그인
						</button>
					</form>
				{:else}
					<form method="POST" action="?/signUp" class="space-y-4">
						<input type="hidden" name="next" value={data.nextPath} />
						<div class="form-control">
							<label class="label" for="name">
								<span class="label-text">이름</span>
							</label>
							<input
								id="name"
								type="text"
								name="name"
								value={form?.values?.name ?? ""}
								class="input input-bordered w-full"
								autocomplete="name"
								required
							/>
						</div>
						<div class="form-control">
							<label class="label" for="signup-email">
								<span class="label-text">이메일</span>
							</label>
							<input
								id="signup-email"
								type="email"
								name="email"
								value={form?.values?.email ?? ""}
								class="input input-bordered w-full"
								autocomplete="email"
								required
							/>
						</div>
						<div class="form-control">
							<label class="label" for="signup-password">
								<span class="label-text">비밀번호</span>
							</label>
							<input
								id="signup-password"
								type="password"
								name="password"
								class="input input-bordered w-full"
								minlength="8"
								autocomplete="new-password"
								required
							/>
						</div>
						<p class="text-xs text-base-content/55">비밀번호는 8자 이상으로 입력해 주세요.</p>
						{#if form?.formError}
							<div class="alert alert-error text-sm">
								<span>{form.formError}</span>
							</div>
						{/if}
						<button type="submit" class="btn btn-primary w-full">
							회원가입
						</button>
					</form>
				{/if}

				<div class="flex items-center justify-between gap-3 text-sm text-base-content/55">
					<span>{mode === "signIn" ? "처음이라면 회원가입" : "이미 계정이 있으면 로그인"}</span>
					<a class="link link-hover" href={resolve("/")}>홈으로</a>
				</div>
			</div>
		</div>
	</div>
</div>
