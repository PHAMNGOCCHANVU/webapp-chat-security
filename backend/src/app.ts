import cors from "cors";
import express from "express";

const app = express();

// TODO: Them helmet, rate-limit, morgan va dang ky route /api/v1 tai day.
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

export default app;
