import { Hono } from "hono";
import { cacheMiddleware } from "./middleware/index.js";
import { handleGenerate, handleWildcard } from "./routes/index.js";

const app = new Hono();

// Add caching middleware
app.use("*", cacheMiddleware());

app.get("*", handleWildcard);
app.post("/generate", handleGenerate);

export default app;
