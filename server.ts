import { createServer } from "node:http";
import next from "next";
import { startScheduler } from "./src/lib/scheduler-loop";

const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = next({ dev });
const handle = app.getRequestHandler();

await app.prepare();

createServer((req, res) => {
  handle(req, res);
}).listen(port, () => {
  console.log(`[perfnest] listening on http://localhost:${port}`);
  startScheduler();
});
