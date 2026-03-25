import { Hono } from "hono";
import { handleGenerate, handleNews, handleWildcard } from "./routes/index.js";

const app = new Hono();

// News-specific routes
app.get("/news/*", handleNews);

// General routes
app.get("*", handleWildcard);
app.post("/generate", handleGenerate);

export default app;
