/**
 * Example: Authentication usage with TrailBase adapter
 */

import { createAdapter } from '../src/adapters/index.js';

async function authExample() {
	// Create adapter
	const adapter = createAdapter('trailbase', {
		url: 'http://localhost:4000',
		cache: { enabled: true, ttl: 5 * 60 * 1000 },
	});

	// Connect
	await adapter.connect();

	// Check if auth is available
	if (!adapter.auth) {
		throw new Error('Auth adapter not available');
	}

	try {
		// Login
		console.log('🔐 Logging in...');
		const authResult = await adapter.auth.login('user@example.com', 'password123');
		console.log('✅ Login successful:', authResult.user.email);

		// Check current user
		const currentUser = await adapter.auth.getCurrentUser();
		console.log('👤 Current user:', currentUser?.name);

		// Check auth status
		if (adapter.auth.isAuthenticated()) {
			console.log('🔓 User is authenticated');
		}

		// Now you can use authenticated API calls
		// ...

		// Logout
		await adapter.auth.logout();
		console.log('🚪 Logged out');

	} catch (error) {
		console.error('❌ Auth error:', error);

		// Try registration if login fails
		try {
			console.log('📝 Trying registration...');
			const regResult = await adapter.auth.register({
				email: 'newuser@example.com',
				password: 'password123',
				name: 'New User',
			});
			console.log('✅ Registration successful:', regResult.user.email);
		} catch (regError) {
			console.error('❌ Registration failed:', regError);
		}
	}

	// Cleanup
	await adapter.destroy();
}

// Run example
if (import.meta.main) {
	authExample().catch(console.error);
}

export { authExample };