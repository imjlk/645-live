<script lang="ts">
import { goto } from "$app/navigation";
import { authClient } from "$lib/auth-client";

let formView: "email" | "otp" = $state("email");
let email = $state("");
let otp = $state("");
let errorMessage = $state("");

//@ts-ignore
async function sendOtp(event) {
	event.preventDefault();
	const { data, error } = await authClient.emailOtp.sendVerificationOtp({
		email: email,
		type: "sign-in",
	});

	if (data?.success) {
		formView = "otp";
	} else {
		errorMessage = error?.message || "An unknown error occurred";
	}
}

//@ts-ignore
async function verifyOtp(event) {
	event.preventDefault();
	const { data, error } = await authClient.signIn.emailOtp({
		email: email,
		otp: otp,
	});
	if (data?.user) {
		goto("/", { invalidateAll: true });
	} else {
		errorMessage = error?.message || "An unknown error occurred";
	}
}
</script>

<div class="hero min-h-screen bg-base-200">
	<div class="hero-content flex-col lg:flex-row-reverse">
		<div class="card shrink-0 w-full max-w-sm shadow-2xl bg-base-100">
			<div class="card-body">
				<h1 class="text-3xl font-bold">Login</h1>
				<p class="text-sm text-base-content/70 mb-4">Login with a one-time password. We'll email you a code.</p>

				{#if formView === "email"}
				<form onsubmit={sendOtp}>
					<div class="form-control">
						<label class="label" for="email">
							<span class="label-text">Email</span>
						</label>
						<input type="email" bind:value={email} name="email" class="input input-bordered" required />
					</div>
					<div class="form-control mt-6">
						<button type="submit" class="btn btn-primary">
							Send me a login code
						</button>
					</div>
				</form>
				{:else if formView === "otp"}
				<form onsubmit={verifyOtp}>
					<div class="form-control">
						<label class="label" for="otp">
							<span class="label-text">Enter the code we sent you</span>
						</label>
						<input type="text" autocomplete="one-time-code" minlength="6" maxlength="6" bind:value={otp} name="otp" class="input input-bordered text-center tracking-widest" required />
					</div>
					<div class="form-control mt-6">
						<button type="submit" class="btn btn-primary">Login</button>
					</div>
					<div class="form-control mt-2">
						<button type="button" onclick={()=> formView = "email"} class="btn btn-ghost btn-sm">Cancel</button>
					</div>
				</form>
				{/if}

				{#if errorMessage}
				<div class="alert alert-error mt-4">
					<span>{errorMessage}</span>
				</div>
				{/if}
			</div>
		</div>
	</div>
</div>