import express from "express";
import { config } from "./config.js";
import { router } from "./routes.js";

const app = express();

app.use(express.json({ limit: "64kb" }));
app.use(cors);
app.use(router);

app.use((request, response) => {
  response.status(404).json({ message: "not found" });
});

app.listen(config.port, () => {
  process.stdout.write(`notification backend listening on http://localhost:${config.port}\n`);
});

function cors(request, response, next) {
  response.setHeader("Access-Control-Allow-Origin", config.frontendOrigin);
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (request.method === "OPTIONS") {
    response.status(204).end();
    return;
  }

  next();
}
