<script lang="ts">
let activeTab = "login";
</script>

<div class="min-h-screen bg-base-200 flex items-center justify-center p-4">
	<div class="w-full max-w-md">
		<div class="card w-full bg-base-100 shadow-xl">
			<div class="card-body pb-2">
				<h2 class="card-title justify-center mb-2">Account</h2>
				
				<!-- 일반적인 탭 구조 -->
				<div role="tablist" class="tabs tabs-lifted">
					<button 
						role="tab" 
						class="tab {activeTab === 'login' ? 'tab-active' : ''}" 
						on:click={() => activeTab = 'login'}
					>
						Login
					</button>
					<button 
						role="tab" 
						class="tab {activeTab === 'signup' ? 'tab-active' : ''}" 
						on:click={() => activeTab = 'signup'}
					>
						Sign Up
					</button>
				</div>
			</div>
			
			<div class="card-body pt-2">
				{#if activeTab === 'login'}
					<div class="py-2">
						<p class="text-center text-sm text-base-content opacity-70 mb-6">
							Login to your account
						</p>
						
						<form action="?/login" method="post" class="space-y-6">
							<div class="form-control w-full">
								<label class="label">
									<span class="label-text">Email</span>
								</label>
								<input
									type="email"
									name="email"
									class="input input-bordered w-full"
									placeholder="Enter your email"
									required
								/>
							</div>
							
							<div class="form-control w-full">
								<label class="label">
									<span class="label-text">Password</span>
								</label>
								<input
									type="password"
									name="password"
									class="input input-bordered w-full"
									placeholder="Enter your password"
									required
								/>
								<label class="label">
									<a href="/forgot-password" class="label-text-alt link link-hover">Forgot password?</a>
								</label>
							</div>
							
							<div class="form-control w-full mt-6">
								<button type="submit" class="btn btn-primary w-full">Login</button>
							</div>
						</form>
						
						<div class="divider">OR</div>
						
						<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
							<button
								on:click={() => oauthLogin(OAuthProvider.Oidc)}
								class="btn btn-outline btn-block"
							>
								OIDC - Kakao
							</button>
							<button
								on:click={() => oauthLogin(OAuthProvider.Github)}
								class="btn btn-outline btn-block"
							>
								GitHub
							</button>
						</div>
					</div>
				{:else}
					<div class="py-2">
						<p class="text-center text-sm text-base-content opacity-70 mb-6">
							Sign up for an account
						</p>
						
						<form action="?/register" method="post" class="space-y-6">
							<div class="form-control w-full">
								<label class="label">
									<span class="label-text">Full Name</span>
								</label>
								<input
									type="text"
									name="name"
									class="input input-bordered w-full"
									placeholder="Enter your full name"
									required
								/>
							</div>
							
							<div class="form-control w-full">
								<label class="label">
									<span class="label-text">Email</span>
								</label>
								<input
									type="email"
									name="email"
									class="input input-bordered w-full"
									placeholder="Enter your email"
									required
								/>
							</div>
							
							<div class="form-control w-full">
								<label class="label">
									<span class="label-text">Password</span>
								</label>
								<input
									type="password"
									name="password"
									class="input input-bordered w-full"
									placeholder="Create a password"
									required
								/>
							</div>
							
							<div class="form-control w-full">
								<label class="label">
									<span class="label-text">Confirm Password</span>
								</label>
								<input
									type="password"
									name="confirmPassword"
									class="input input-bordered w-full"
									placeholder="Confirm your password"
									required
								/>
							</div>
							
							<div class="form-control w-full mt-6">
								<button type="submit" class="btn btn-primary w-full">Sign Up</button>
							</div>
						</form>
						
						<div class="divider">OR</div>
						
						<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
							<button
								on:click={() => oauthLogin(OAuthProvider.Google)}
								class="btn btn-outline btn-block"
							>
								Google
							</button>
							<button
								on:click={() => oauthLogin(OAuthProvider.Github)}
								class="btn btn-outline btn-block"
							>
								GitHub
							</button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>