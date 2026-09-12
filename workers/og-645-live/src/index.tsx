import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cacheMiddleware } from "./middleware/index.js";
import { handleGenerate, handleNews, handleWildcard } from "./routes/index.js";

const app = new Hono<{ Bindings: CloudflareBindings }>();

// News-specific routes
app.use("*", cacheMiddleware());
app.get("/news/*", handleNews);

// General routes
app.get("*", handleWildcard);
app.post("/generate", bodyLimit({ maxSize: 16 * 1024 }), handleGenerate);

export default app;
