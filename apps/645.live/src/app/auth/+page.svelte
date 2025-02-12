<script lang="ts">
import { fade } from "svelte/transition";

let isLogin = true;
$: formHeight = isLogin ? "250px" : "400px";
const toggleForm = () => {
	isLogin = !isLogin;
};
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-100">
	<div class="w-full max-w-md">
		<div class="rounded-lg border bg-white text-gray-900 shadow-sm" data-v0-t="card">
			<div class="flex flex-col space-y-1.5 p-6">
				<h3 class="text-center text-2xl font-semibold leading-none tracking-tight">Account</h3>
				<p class="text-center text-sm text-gray-500">
					{isLogin ? 'Login to your account' : 'Sign up for an account'}
				</p>
			</div>
			<div class="flex justify-center p-6 pt-0">
				<div
					class="inline-flex h-10 items-center justify-center rounded-md bg-gray-200 p-1 text-gray-700"
				>
					<button
						class={`ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
							isLogin ? 'bg-white text-gray-900 shadow-sm' : 'hover:bg-gray-100 hover:text-gray-900'
						}`}
						on:click={() => (isLogin = true)}
					>
						Login
					</button>
					<button
						class={`ring-offset-background focus-visible:ring-ring inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
							!isLogin
								? 'bg-white text-gray-900 shadow-sm'
								: 'hover:bg-gray-100 hover:text-gray-900'
						}`}
						on:click={() => (isLogin = false)}
					>
						Sign Up
					</button>
				</div>
			</div>
			<div class="p-6 pt-0">
				<div
					class="relative overflow-hidden"
					style="height: {formHeight}; transition: height 300ms ease-out;"
				>
					{#if isLogin}
						<div in:fade out:fade class="absolute w-full">
							<form action="?/login" method="post" class="space-y-4">
								<div class="space-y-2">
									<label
										for="email"
										class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
										>Email</label
									>
									<input
										type="email"
										id="email"
										name="email"
										class="bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
										placeholder="Enter your email"
									/>
								</div>
								<div class="space-y-2">
									<label
										for="password"
										class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
										>Password</label
									>
									<input
										type="password"
										id="password"
										name="password"
										class="bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
										placeholder="Enter your password"
									/>
								</div>
								<button
									type="submit"
									class="ring-offset-background focus-visible:ring-ring inline-flex h-10 w-full items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
									>Login</button
								>
							</form>
						</div>
					{:else}
						<div in:fade out:fade class="absolute w-full">
							<form action="?/register" method="post" class="space-y-4">
								<div class="space-y-2">
									<label
										for="name"
										class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
										>Full Name</label
									>
									<input
										type="text"
										id="name"
										name="name"
										class="bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
										placeholder="Enter your full name"
									/>
								</div>
								<div class="space-y-2">
									<label
										for="email"
										class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
										>Email</label
									>
									<input
										type="email"
										id="email"
										name="email"
										class="bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
										placeholder="Enter your email"
									/>
								</div>
								<div class="space-y-2">
									<label
										for="password"
										class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
										>Password</label
									>
									<input
										type="password"
										id="password"
										name="password"
										class="bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
										placeholder="Create a password"
									/>
								</div>
								<div class="space-y-2">
									<label
										for="confirmPassword"
										class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
										>Confirm Password</label
									>
									<input
										type="password"
										id="confirmPassword"
										name="confirmPassword"
										class="bg-background ring-offset-background focus-visible:ring-ring flex h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
										placeholder="Confirm your password"
									/>
								</div>
								<button
									type="submit"
									class="ring-offset-background focus-visible:ring-ring inline-flex h-10 w-full items-center justify-center rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
									>Sign Up</button
								>
							</form>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
