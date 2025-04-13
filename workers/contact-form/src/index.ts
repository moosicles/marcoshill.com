import { fromHono } from "chanfana";
import { Hono } from "hono";
import { cors } from "hono/cors";
// import { TaskCreate } from "./endpoints/taskCreate";
// import { TaskDelete } from "./endpoints/taskDelete";
// import { TaskFetch } from "./endpoints/taskFetch";
// import { TaskList } from "./endpoints/taskList";
import { ContactPost } from "./endpoints/contactPost";

// Start a Hono app
const app = new Hono();

// Setup cors
app.use('/contact', cors({
	origin: ['http://localhost:5500', 'https://marcoshill.com'],
}))

// Setup OpenAPI registry
const openapi = fromHono(app, {
	docs_url: "/cant-read-code",
});

// Register OpenAPI endpoints
// openapi.get("/api/tasks", TaskList);
// openapi.post("/api/tasks", TaskCreate);
// openapi.get("/api/tasks/:taskSlug", TaskFetch);
// openapi.delete("/api/tasks/:taskSlug", TaskDelete);
openapi.post("/contact", ContactPost)

// Export the Hono app
export default app;
