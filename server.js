const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const { connectMongo } = require("./config/mongodb");

// Load env
dotenv.config();

// Routes
const otpRouter = require("./routes/otp");
const authRouter = require("./routes/auth");
const transactionRouter = require("./routes/transaction");
const paymentMethodRouter = require("./routes/paymentMethod");
const kycRouter = require("./routes/kyc");
const notificationRouter = require("./routes/notification");
const adminRouter = require("./routes/admin");

// Middleware
const { requestLogger, requestId } = require("./middlewares/logger");
const { errorHandler, notFoundHandler } = require("./middlewares/errorHandler");
const {
  securityHeaders,
  rateLimiter,
  authRateLimiter,
  otpRateLimiter,
} = require("./middlewares/security");

const app = express();
const port = process.env.PORT || 6000;

/* --------------------------------------------------
   TRUST PROXY (required for RunPod / reverse proxy)
-------------------------------------------------- */
app.set("trust proxy", true);

/* --------------------------------------------------
   🔥 PRE-FLIGHT MUST BE FIRST (CRITICAL)
-------------------------------------------------- */
const ADMIN_ORIGIN = "https://pm4e1y0uu4w9i0-3000.proxy.runpod.net";

app.options("*", cors({
  origin: ADMIN_ORIGIN,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-request-id"],
}));

/* --------------------------------------------------
   CORS (MUST BE BEFORE ALL OTHER MIDDLEWARE)
-------------------------------------------------- */
app.use(cors({
  origin: ADMIN_ORIGIN,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-request-id"],
}));

/* --------------------------------------------------
   BODY PARSING
-------------------------------------------------- */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/* --------------------------------------------------
   SECURITY & LOGGING (AFTER CORS)
-------------------------------------------------- */
app.use(securityHeaders);
app.use(requestId);
app.use(requestLogger);

/* --------------------------------------------------
   STATIC UPLOADS (SAFE CORS)
-------------------------------------------------- */
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.join(__dirname, "uploads"))
);

/* --------------------------------------------------
   RATE LIMITER (SKIP OPTIONS!)
-------------------------------------------------- */
app.use("/api", (req, res, next) => {
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
}, rateLimiter);

/* --------------------------------------------------
   ROUTES
-------------------------------------------------- */
app.use("/api/otp", otpRateLimiter, otpRouter);
app.use("/api/auth", authRateLimiter, authRouter);
app.use("/api/transaction", transactionRouter);
app.use("/api/payment-methods", paymentMethodRouter);
app.use("/api/kyc", kycRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/admin", adminRouter);

/* --------------------------------------------------
   HEALTH & TEST
-------------------------------------------------- */
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend running",
    time: new Date().toISOString(),
  });
});

app.get("/api/test-db", async (req, res) => {
  const mongoose = require("mongoose");
  res.json({
    connected: mongoose.connection.readyState === 1,
  });
});

/* --------------------------------------------------
   ERROR HANDLERS (LAST)
-------------------------------------------------- */
app.use(notFoundHandler);
app.use(errorHandler);

/* --------------------------------------------------
   START SERVER
-------------------------------------------------- */
const startServer = async () => {
  try {
    await connectMongo();
    app.listen(port, "0.0.0.0", () => {
      console.log(`🚀 API running on port ${port}`);
    });
  } catch (err) {
    console.error("❌ Startup failed:", err);
    process.exit(1);
  }
};

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));

startServer();
