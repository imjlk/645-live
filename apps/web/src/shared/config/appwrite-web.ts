import {
	PUBLIC_APPWRITE_ENDPOINT,
	PUBLIC_APPWRITE_PROJECT,
} from "$env/static/public";
// filepath: /Users/imjlk/repos/imjlk/645.live/apps/web/src/lib/appwrite.ts
import { Account, Client } from "appwrite";

const client = new Client()
	.setEndpoint(PUBLIC_APPWRITE_ENDPOINT) // Your Appwrite Endpoint
	.setProject(PUBLIC_APPWRITE_PROJECT); // Your project ID

export const account = new Account(client);
// 필요한 다른 Appwrite 서비스 (Databases, Storage 등)도 여기서 export 할 수 있습니다.
