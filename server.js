import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";
import express from "express";
import cors from "cors";
import fs from "fs";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== "production") {
  const result = dotenv.config({ path: path.resolve(__dirname, ".env") });
  if (result.error) console.warn("Development .env file was not found");
}

const app = express();
const PORT = process.env.PORT || process.env.SERVER_PORT || 3001;
const isProduction = process.env.NODE_ENV === "production";
const ADMIN_COOKIE = "admin_session";
const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, "data");
const MENU_FILE = path.join(DATA_DIR, "menu.json");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

const requiredEnvironment = [
  "MERCADO_PAGO_ACCESS_TOKEN",
  "ADMIN_PASSWORD_HASH",
  "ADMIN_SESSION_SECRET",
];
const missingEnvironment = requiredEnvironment.filter(
  (name) => !process.env[name]
);

if (missingEnvironment.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnvironment.join(", ")}`
  );
  process.exit(1);
}
if (process.env.ADMIN_SESSION_SECRET.length < 32) {
  console.error("ADMIN_SESSION_SECRET must contain at least 32 characters");
  process.exit(1);
}

const parsePasswordHash = () => {
  const [algorithm, saltHex, expectedHex] =
    process.env.ADMIN_PASSWORD_HASH.split(":");
  if (
    algorithm !== "scrypt" ||
    !/^[a-f0-9]{32,}$/i.test(saltHex || "") ||
    !/^[a-f0-9]{64,}$/i.test(expectedHex || "") ||
    expectedHex.length % 2 !== 0
  ) {
    throw new Error(
      "ADMIN_PASSWORD_HASH must use the format scrypt:<salt-hex>:<hash-hex>"
    );
  }
  return {
    salt: Buffer.from(saltHex, "hex"),
    expected: Buffer.from(expectedHex, "hex"),
  };
};

let adminPassword;
try {
  adminPassword = parsePasswordHash();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const configuredOrigins = (
  process.env.ALLOWED_ORIGINS ||
  process.env.CORS_ORIGIN ||
  ""
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins =
  configuredOrigins.length > 0
    ? configuredOrigins
    : ["http://localhost:3000", "http://localhost:5173"];

if (isProduction && configuredOrigins.length === 0) {
  console.error("ALLOWED_ORIGINS is required in production");
  process.exit(1);
}

console.log("Configuration loaded", { port: PORT, allowedOrigins });

app.disable("x-powered-by");
if (isProduction) app.set("trust proxy", 1);
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (isProduction) {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "100kb" }));

const parseCookies = (cookieHeader = "") =>
  Object.fromEntries(
    cookieHeader
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const separator = cookie.indexOf("=");
        if (separator === -1) return [cookie, ""];
        return [
          decodeURIComponent(cookie.slice(0, separator)),
          decodeURIComponent(cookie.slice(separator + 1)),
        ];
      })
  );

const verifyAdminPassword = (password) => {
  if (typeof password !== "string" || password.length > 256) return false;
  const actual = scryptSync(
    password,
    adminPassword.salt,
    adminPassword.expected.length
  );
  return timingSafeEqual(actual, adminPassword.expected);
};

const signAdminSession = () => {
  const payload = Buffer.from(
    JSON.stringify({ exp: Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000 })
  ).toString("base64url");
  const signature = createHmac("sha256", process.env.ADMIN_SESSION_SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
};

const verifyAdminSession = (token) => {
  if (typeof token !== "string") return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const expected = createHmac("sha256", process.env.ADMIN_SESSION_SECRET)
    .update(payload)
    .digest();
  let supplied;
  try {
    supplied = Buffer.from(signature, "base64url");
  } catch {
    return false;
  }
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return false;
  }
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString());
    return Number.isFinite(session.exp) && session.exp > Date.now();
  } catch {
    return false;
  }
};

const requireAdmin = (req, res, next) => {
  const token = parseCookies(req.headers.cookie)[ADMIN_COOKIE];
  if (!verifyAdminSession(token)) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};

const loginAttempts = new Map();
const allowLoginAttempt = (req) => {
  const now = Date.now();
  const windowStart = now - 15 * 60 * 1000;
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const recent = (loginAttempts.get(key) || []).filter(
    (timestamp) => timestamp > windowStart
  );
  if (recent.length >= 5) return false;
  recent.push(now);
  loginAttempts.set(key, recent);
  return true;
};

const createRateLimiter = ({ limit, windowMs }) => {
  const requests = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const recent = (requests.get(key) || []).filter(
      (timestamp) => timestamp > now - windowMs
    );
    if (recent.length >= limit) {
      return res.status(429).json({ error: "Too many requests" });
    }
    recent.push(now);
    requests.set(key, recent);
    next();
  };
};
const orderLimiter = createRateLimiter({ limit: 30, windowMs: 15 * 60 * 1000 });
const paymentLimiter = createRateLimiter({ limit: 10, windowMs: 15 * 60 * 1000 });

const hashOrderAccessToken = (token) =>
  createHash("sha256").update(token).digest("hex");
const hasOrderAccess = (order, token) => {
  if (!order?.accessTokenHash || typeof token !== "string") return false;
  const expected = Buffer.from(order.accessTokenHash, "hex");
  const supplied = Buffer.from(hashOrderAccessToken(token), "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
};
const serializeOrder = (order) => {
  const { accessTokenHash, ...safeOrder } = order;
  return safeOrder;
};

const ensureDataFiles = () => {
  const dataDir = path.dirname(MENU_FILE);
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(MENU_FILE)) fs.writeFileSync(MENU_FILE, "[]", "utf8");
  if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, "[]", "utf8");
};
const readJsonArray = (file) => {
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.error(`Failed to read ${path.basename(file)}`, error.message);
    return [];
  }
};
const writeJsonArray = (file, value) => {
  const temporary = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(temporary, JSON.stringify(value, null, 2), "utf8");
    fs.renameSync(temporary, file);
    return true;
  } catch (error) {
    console.error(`Failed to write ${path.basename(file)}`, error.message);
    try {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    } catch {}
    return false;
  }
};
const readMenu = () => readJsonArray(MENU_FILE);
const readOrders = () => readJsonArray(ORDERS_FILE);
const writeMenu = (menu) => writeJsonArray(MENU_FILE, menu);
const writeOrders = (orders) => writeJsonArray(ORDERS_FILE, orders);

app.post("/api/admin/login", (req, res) => {
  if (!allowLoginAttempt(req)) {
    return res.status(429).json({ error: "Too many login attempts" });
  }
  if (!verifyAdminPassword(req.body?.password)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const cookie = [
    `${ADMIN_COOKIE}=${encodeURIComponent(signAdminSession())}`,
    "HttpOnly",
    `SameSite=${isProduction ? "None" : "Lax"}`,
    "Path=/",
    `Max-Age=${ADMIN_SESSION_TTL_SECONDS}`,
    isProduction ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
  res.setHeader("Set-Cookie", cookie);
  return res.status(204).send();
});
app.get("/api/admin/session", requireAdmin, (_req, res) =>
  res.status(204).send()
);
app.post("/api/admin/logout", (_req, res) => {
  res.setHeader(
    "Set-Cookie",
    `${ADMIN_COOKIE}=; HttpOnly; SameSite=${
      isProduction ? "None" : "Lax"
    }; Path=/; Max-Age=0${
      isProduction ? "; Secure" : ""
    }`
  );
  return res.status(204).send();
});

app.get("/api/menu", (_req, res) => res.json(readMenu()));
app.post("/api/menu", requireAdmin, (req, res) => {
  const { name, description, price, category, image, flavors } = req.body || {};
  if (
    typeof name !== "string" ||
    name.trim().length === 0 ||
    name.length > 120 ||
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price < 0 ||
    price > 100000 ||
    (description !== undefined &&
      (typeof description !== "string" || description.length > 1000)) ||
    (category !== undefined &&
      (typeof category !== "string" || category.length > 80)) ||
    (image !== undefined && (typeof image !== "string" || image.length > 2048)) ||
    (flavors !== undefined &&
      (!Array.isArray(flavors) ||
        flavors.length > 50 ||
        flavors.some(
          (flavor) => typeof flavor !== "string" || flavor.length > 100
        )))
  ) {
    return res.status(400).json({ error: "Invalid menu item" });
  }
  const menu = readMenu();
  const ids = menu.map((item) => Number(item.id)).filter(Number.isFinite);
  const newItem = {
    id: ids.length ? Math.max(...ids) + 1 : 1,
    name: name.trim(),
    description: description?.trim() || "",
    price: Math.round(price * 100) / 100,
    category: category?.trim() || "",
    image: image?.trim() || "",
    ...(flavors ? { flavors: flavors.map((flavor) => flavor.trim()) } : {}),
  };
  menu.push(newItem);
  return writeMenu(menu)
    ? res.status(201).json(newItem)
    : res.status(500).json({ error: "Failed to save menu item" });
});
app.put("/api/menu/:id", requireAdmin, (req, res) => {
  const menu = readMenu();
  const itemId = Number(req.params.id);
  const itemIndex = menu.findIndex((item) => Number(item.id) === itemId);
  if (!Number.isInteger(itemId) || itemIndex === -1) {
    return res.status(404).json({ error: "Menu item not found" });
  }
  const allowedFields = [
    "name",
    "description",
    "price",
    "category",
    "image",
    "flavors",
  ];
  const updates = Object.fromEntries(
    Object.entries(req.body || {}).filter(([key]) => allowedFields.includes(key))
  );
  if (
    (updates.name !== undefined &&
      (typeof updates.name !== "string" || updates.name.trim().length === 0)) ||
    (updates.price !== undefined &&
      (typeof updates.price !== "number" ||
        !Number.isFinite(updates.price) ||
        updates.price < 0 ||
        updates.price > 100000)) ||
    (updates.flavors !== undefined &&
      (!Array.isArray(updates.flavors) ||
        updates.flavors.some((flavor) => typeof flavor !== "string")))
  ) {
    return res.status(400).json({ error: "Invalid menu item update" });
  }
  menu[itemIndex] = { ...menu[itemIndex], ...updates, id: itemId };
  return writeMenu(menu)
    ? res.json(menu[itemIndex])
    : res.status(500).json({ error: "Failed to update menu item" });
});
app.delete("/api/menu/:id", requireAdmin, (req, res) => {
  const menu = readMenu();
  const itemId = Number(req.params.id);
  const filtered = menu.filter((item) => Number(item.id) !== itemId);
  if (!Number.isInteger(itemId) || filtered.length === menu.length) {
    return res.status(404).json({ error: "Menu item not found" });
  }
  return writeMenu(filtered)
    ? res.status(204).send()
    : res.status(500).json({ error: "Failed to delete menu item" });
});

app.get("/api/orders", requireAdmin, (_req, res) =>
  res.json(readOrders().map(serializeOrder))
);
app.post("/api/orders", orderLimiter, (req, res) => {
  const { items, user, deliveryType, paymentMethod, observations } =
    req.body || {};
  const phoneDigits =
    typeof user?.phone === "string" ? user.phone.replace(/\D/g, "") : "";
  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > 50 ||
    typeof user?.name !== "string" ||
    user.name.trim().length < 2 ||
    user.name.length > 120 ||
    phoneDigits.length < 10 ||
    phoneDigits.length > 15 ||
    !new Set(["DELIVERY", "PICKUP"]).has(deliveryType) ||
    !new Set(["CASH", "CARD", "PIX"]).has(paymentMethod) ||
    (observations !== undefined &&
      (typeof observations !== "string" || observations.length > 500))
  ) {
    return res.status(400).json({ error: "Invalid order" });
  }

  const menuById = new Map(readMenu().map((item) => [Number(item.id), item]));
  const normalizedItems = [];
  for (const requestedItem of items) {
    const menuItem = menuById.get(Number(requestedItem?.id));
    const quantity = Number(requestedItem?.quantity);
    if (
      !menuItem ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 99 ||
      (requestedItem.selectedFlavor !== undefined &&
        (!Array.isArray(menuItem.flavors) ||
          !menuItem.flavors.includes(requestedItem.selectedFlavor)))
    ) {
      return res.status(400).json({ error: "Invalid order item" });
    }
    normalizedItems.push({
      ...menuItem,
      quantity,
      ...(requestedItem.selectedFlavor
        ? { selectedFlavor: requestedItem.selectedFlavor }
        : {}),
    });
  }

  const total =
    Math.round(
      normalizedItems.reduce(
        (sum, item) => sum + Number(item.price) * item.quantity,
        0
      ) * 100
    ) / 100;
  const accessToken = randomBytes(32).toString("base64url");
  const newOrder = {
    id: `ORDER-${Date.now()}-${randomBytes(6).toString("hex")}`,
    createdAt: new Date().toISOString(),
    status: "PENDING",
    user: {
      name: user.name.trim(),
      phone: phoneDigits,
      ...(typeof user.email === "string" && user.email.length <= 254
        ? { email: user.email.trim() }
        : {}),
      ...(deliveryType === "DELIVERY" &&
      typeof user.address === "string" &&
      user.address.length <= 500
        ? { address: user.address.trim() }
        : {}),
    },
    items: normalizedItems,
    total,
    deliveryType,
    paymentMethod,
    ...(observations ? { observations: observations.trim() } : {}),
    accessTokenHash: hashOrderAccessToken(accessToken),
  };
  const orders = readOrders();
  orders.push(newOrder);
  return writeOrders(orders)
    ? res.status(201).json({ ...serializeOrder(newOrder), accessToken })
    : res.status(500).json({ error: "Failed to save order" });
});
app.put("/api/orders/:id/status", requireAdmin, (req, res) => {
  const validStatuses = new Set([
    "PENDING",
    "ACCEPTED",
    "CANCELED",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "READY_FOR_PICKUP",
    "COMPLETED",
  ]);
  if (!validStatuses.has(req.body?.status)) {
    return res.status(400).json({ error: "Invalid order status" });
  }
  const orders = readOrders();
  const order = orders.find((candidate) => candidate.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found" });
  order.status = req.body.status;
  return writeOrders(orders)
    ? res.json(serializeOrder(order))
    : res.status(500).json({ error: "Failed to update order status" });
});

const mercadoPagoHeaders = (idempotencyKey) => ({
  Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
  "Content-Type": "application/json",
  ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
});
const getPayment = async (paymentId) => {
  const safeId = String(paymentId);
  if (!/^\d+$/.test(safeId)) throw new Error("Invalid payment ID");
  const response = await axios.get(
    `https://api.mercadopago.com/v1/payments/${safeId}`,
    { headers: mercadoPagoHeaders() }
  );
  return response.data;
};
const paymentResponse = (payment) => {
  const transactionData = payment?.point_of_interaction?.transaction_data;
  if (!transactionData?.qr_code || !transactionData?.qr_code_base64) {
    throw new Error("Payment response does not contain PIX data");
  }
  return {
    qrCode: {
      image: transactionData.qr_code_base64,
      code: transactionData.qr_code,
    },
    expiresIn: transactionData.qr_code_expiration_date,
    paymentId: String(payment.id),
    status: payment.status,
  };
};

app.post("/api/payments/pix", paymentLimiter, async (req, res) => {
  const { orderId, orderAccessToken } = req.body || {};
  let order = readOrders().find((candidate) => candidate.id === orderId);
  if (!order || !hasOrderAccess(order, orderAccessToken)) {
    return res.status(404).json({ error: "Order not found" });
  }
  if (order.paymentMethod !== "PIX") {
    return res.status(409).json({ error: "Order does not use PIX" });
  }

  try {
    if (order.paymentId) {
      return res.json(paymentResponse(await getPayment(order.paymentId)));
    }
    const payload = {
      transaction_amount: Number(order.total.toFixed(2)),
      description: `Pedido #${order.id}`,
      payment_method_id: "pix",
      external_reference: order.id,
      payer: {
        email: order.user.email || `cliente.${order.id}@example.invalid`,
        first_name: order.user.name.split(" ")[0],
        last_name: order.user.name.split(" ").slice(1).join(" "),
      },
      ...(process.env.MERCADO_PAGO_WEBHOOK_URL
        ? { notification_url: process.env.MERCADO_PAGO_WEBHOOK_URL }
        : {}),
    };
    const idempotencyKey = `pix-${createHash("sha256")
      .update(order.id)
      .digest("hex")}`;
    const response = await axios.post(
      "https://api.mercadopago.com/v1/payments",
      payload,
      { headers: mercadoPagoHeaders(idempotencyKey) }
    );

    const orders = readOrders();
    order = orders.find((candidate) => candidate.id === orderId);
    if (!order || !hasOrderAccess(order, orderAccessToken)) {
      return res.status(409).json({ error: "Order changed while creating payment" });
    }
    order.paymentId = String(response.data.id);
    if (!writeOrders(orders)) throw new Error("Failed to store payment ID");
    return res.json(paymentResponse(response.data));
  } catch (error) {
    console.error("Failed to create PIX payment", error.message);
    return res.status(502).json({ error: "Failed to create PIX payment" });
  }
});

app.get("/api/payments/:paymentId/status", async (req, res) => {
  const order = readOrders().find(
    (candidate) => String(candidate.paymentId) === req.params.paymentId
  );
  if (!order || !hasOrderAccess(order, req.get("X-Order-Token"))) {
    return res.status(404).json({ error: "Payment not found" });
  }
  try {
    const payment = await getPayment(req.params.paymentId);
    return res.json({
      status: payment.status,
      statusDetail: payment.status_detail,
      paid: payment.status === "approved",
    });
  } catch (error) {
    console.error("Failed to fetch payment status", error.message);
    return res.status(502).json({ error: "Failed to fetch payment status" });
  }
});

app.post("/api/payments/webhook", async (req, res) => {
  const paymentId = req.body?.data?.id || req.body?.id || req.query.id;
  const topic = req.body?.type || req.body?.topic || req.query.topic;
  if (
    !paymentId ||
    (topic && !new Set(["payment", "payment.created", "payment.updated"]).has(topic))
  ) {
    return res.status(200).send("OK");
  }
  try {
    const payment = await getPayment(paymentId);
    if (payment.status !== "approved" || !payment.external_reference) {
      return res.status(200).send("OK");
    }
    const orders = readOrders();
    const order = orders.find(
      (candidate) => candidate.id === payment.external_reference
    );
    if (!order) return res.status(200).send("OK");
    const amountMatches =
      Math.round(Number(payment.transaction_amount) * 100) ===
      Math.round(Number(order.total) * 100);
    const paymentMatches =
      !order.paymentId || String(order.paymentId) === String(payment.id);
    if (!amountMatches || !paymentMatches) {
      console.warn("Rejected payment update with mismatched order data", {
        orderId: order.id,
        paymentId: String(payment.id),
      });
      return res.status(200).send("OK");
    }
    order.paymentId = String(payment.id);
    if (order.status === "PENDING") order.status = "ACCEPTED";
    if (!writeOrders(orders)) throw new Error("Failed to update order");
    return res.status(200).send("OK");
  } catch (error) {
    console.error("Failed to process payment webhook", error.message);
    return res.status(502).json({ error: "Failed to verify payment" });
  }
});

app.get("/api/health", (_req, res) =>
  res.json({ status: "OK", timestamp: new Date().toISOString() })
);

ensureDataFiles();
app.use((err, _req, res, _next) => {
  console.error("Unhandled request error", err.message);
  res.status(500).json({ error: "Internal server error" });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
server.on("error", (error) => {
  console.error("Failed to start server", error.message);
  process.exit(1);
});
process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});
