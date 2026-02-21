import { Hono } from "hono";
import { cacheMiddleware } from "./middleware/index.js";
import { handleGenerate, handleNews, handleWildcard } from "./routes/index.js";

const app = new Hono();

// Add caching middleware
app.use("*", cacheMiddleware());

// News-specific routes
app.get("/news/*", handleNews);

// General routes
app.get("*", handleWildcard);
app.post("/generate", handleGenerate);

export default app;
