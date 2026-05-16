import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { sessionConfig } from "./config/session";
import { auditLogger } from "./middlewares/audit.middleware";
import authRoutes from "./routes/auth.routes";
import roomRoutes from "./routes/room.routes";
import adminRoutes from "./routes/admin.routes";
import { setupSwagger } from "./config/swagger";

const app = express();

// Setup Swagger
setupSwagger(app);

app.use(helmet());
const allowedOrigins = ["http://127.0.0.1:5500", "http://127.0.0.1:5501", "http://localhost:5500", "http://localhost:5501"];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies
}));
app.use(express.json());
app.use(morgan("dev"));
app.use(sessionConfig);

// Auto-audit middleware — ghi log tự động cho POST/PUT/PATCH/DELETE
// Phải đặt sau sessionConfig (cần session để lấy userId)
app.use(auditLogger);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/rooms", roomRoutes);
app.use("/api/v1/admin", adminRoutes);

export default app;
