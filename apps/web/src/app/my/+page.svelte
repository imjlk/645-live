<script lang="ts">
// import type {Account, Models} from 'appwrite'
// biome-ignore lint: temporary
export let data;

const { user } = data;
</script>

<div>
	<h1>Account</h1>
	<p>Welcome, {user.name}</p>
</div>

<form action="?/logout" method="post">
	<button class="btn btn-primary" type="submit">Logout</button>
</form>