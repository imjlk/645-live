import { Hono } from "hono";
import { cacheMiddleware } from "./middleware/index.js";
import { handleGenerate, handleNews, handleWildcard } from "./routes/index.js";

const app = new Hono();

// News-specific routes
app.use("/news/*", cacheMiddleware());
app.get("/news/*", handleNews);

// General routes
app.get("*", handleWildcard);
app.post("/generate", handleGenerate);

export default app;
