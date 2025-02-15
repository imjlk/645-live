## SvelteKit+Typescript with Server-Side Appwrite Authentication

Template for Sveltekit and Appwrite Authentication (should be easy to throw in your databases and such).  This uses server hooks to protect routes and form actions (progressive enhancement, yay!) for registering, logging in and logging out users.

It has a basic login/register form using tailwind and some tasteful animation.  Feel free to delete them and use something that fits your style.  Due to using form actions, there's no JS code in those files for logging in or registering an account.

#### Instructions

1. Clone the project
2. Create a .env file with the following:

```env
PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
PUBLIC_APPWRITE_PROJECT=YOUR-PROJECT-ID
APPWRITE_KEY=YOUR-API-KEY
```

3. Protect your routes with a +page.server.ts file and the following:

```ts
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
 if (!locals.user) throw redirect(302, '/auth');

 return {
  user: locals.user
 };
}
```

### Preview of Login Form

![preview](https://github.com/user-attachments/assets/6b10ea6b-3fff-473c-9012-0164f9a15662)
