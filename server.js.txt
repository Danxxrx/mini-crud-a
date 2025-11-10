// server.js
import express from "express";
import morgan from "morgan";
import { initDb } from "./src/db.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(morgan("dev"));

// простой healthcheck, чтобы проверить, что сервер жив
app.get("/health", (req, res) => res.json({ ok: true }));

// запускаем миграции и только потом поднимаем сервер
initDb(() => {
  app.listen(PORT, () => {
    console.log(`Serwer działa na http://localhost:${PORT}`);
  });
});
