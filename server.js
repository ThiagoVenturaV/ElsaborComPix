import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

// Configure dotenv before any other imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== "production") {
  dotenv.config();
}

// Try to load .env file
//const envPath = path.resolve(__dirname, ".env");
//const envResult = dotenv.config({ path: envPath });

if (envResult.error) {
  console.error("Error loading .env file:", envResult.error);
  process.exit(1);
}

// Double check environment variables
if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
  console.error("MERCADO_PAGO_ACCESS_TOKEN is not set in environment");
  process.exit(1);
}

// Log loaded configuration
console.log("Configuration loaded:", {
  envPath,
  port: process.env.PORT || 3001,
  mpTokenPrefix: process.env.MERCADO_PAGO_ACCESS_TOKEN.substring(0, 10) + "...",
});

import express from "express";
import cors from "cors";
import fs from "fs";
import * as mercadopagoPkg from "mercadopago";
import axios from "axios";
import { createOrderOnMP, getOrderOnMP } from "./services/orders.js";

const app = express();
const PORT = process.env.PORT || process.env.SERVER_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Data storage files
const MENU_FILE = path.join(__dirname, "data", "menu.json");
const ORDERS_FILE = path.join(__dirname, "data", "orders.json");

// Ensure data directory exists (use recursive to be safe)
const dataDir = path.join(__dirname, "data");
try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
} catch (err) {
  console.error("Failed to ensure data directory exists:", err);
  // If we can't ensure the data directory exists, exit early to avoid corrupt state
  process.exit(1);
}

// Initialize data files if they don't exist
const initializeDataFiles = () => {
  if (!fs.existsSync(MENU_FILE)) {
    const initialMenu = [
      {
        id: 1,
        name: "Hambúrguer Clássico",
        description: "Pão, carne, queijo, alface, tomate e molho especial.",
        price: 25.5,
        category: "Hambúrgueres",
        image: "https://picsum.photos/id/1060/400/300",
      },
      {
        id: 2,
        name: "Hambúrguer Duplo Bacon",
        description:
          "Pão, duas carnes, dobro de bacon, queijo cheddar e barbecue.",
        price: 32.0,
        category: "Hambúrgueres",
        image: "https://picsum.photos/id/312/400/300",
      },
      {
        id: 3,
        name: "Pizza Margherita",
        description: "Molho de tomate, mussarela fresca e manjericão.",
        price: 45.0,
        category: "Pizzas",
        image: "https://picsum.photos/id/292/400/300",
      },
      {
        id: 4,
        name: "Pizza Calabresa",
        description: "Molho de tomate, mussarela, calabresa e cebola.",
        price: 48.5,
        category: "Pizzas",
        image: "https://picsum.photos/id/102/400/300",
      },
      {
        id: 5,
        name: "Batata Frita",
        description: "Porção generosa de batatas fritas crocantes.",
        price: 15.0,
        category: "Acompanhamentos",
        image: "https://picsum.photos/id/1084/400/300",
      },
      {
        id: 6,
        name: "Refrigerante Lata",
        description: "Coca-Cola, Guaraná ou Soda.",
        price: 6.0,
        category: "Bebidas",
        image: "https://picsum.photos/id/119/400/300",
      },
    ];
    fs.writeFileSync(MENU_FILE, JSON.stringify(initialMenu, null, 2), "utf8");
  }

  if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2), "utf8");
  }
};

// Helper functions
const readMenu = () => {
  try {
    const data = fs.readFileSync(MENU_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading menu:", error);
    return [];
  }
};

const writeMenu = (menu) => {
  try {
    fs.writeFileSync(MENU_FILE, JSON.stringify(menu, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error("Error writing menu:", error);
    return false;
  }
};

const readOrders = () => {
  try {
    const data = fs.readFileSync(ORDERS_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading orders:", error);
    return [];
  }
};

const writeOrders = (orders) => {
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf8");
    return true;
  } catch (error) {
    console.error("Error writing orders:", error);
    return false;
  }
};

// Routes

// Menu routes
app.get("/api/menu", (req, res) => {
  const menu = readMenu();
  res.json(menu);
});

app.post("/api/menu", (req, res) => {
  const menu = readMenu();
  // Basic validation: require a name and price
  const { name, price } = req.body || {};
  if (!name || typeof price !== "number") {
    return res.status(400).json({
      error:
        'Invalid menu item. "name" (string) and "price" (number) are required.',
    });
  }

  // Normalize existing ids to numbers and compute next id safely
  const existingIds = menu
    .map((item) => Number(item.id))
    .filter((n) => Number.isFinite(n));
  const nextId = existingIds.length ? Math.max(...existingIds) + 1 : 1;

  const newItem = {
    id: nextId,
    ...req.body,
  };

  menu.push(newItem);

  if (writeMenu(menu)) {
    res.status(201).json(newItem);
  } else {
    res.status(500).json({ error: "Failed to save menu item" });
  }
});

app.put("/api/menu/:id", (req, res) => {
  const menu = readMenu();
  const itemId = parseInt(req.params.id);
  const itemIndex = menu.findIndex((item) => item.id === itemId);

  if (itemIndex === -1) {
    return res.status(404).json({ error: "Menu item not found" });
  }

  menu[itemIndex] = { ...menu[itemIndex], ...req.body };

  if (writeMenu(menu)) {
    res.json(menu[itemIndex]);
  } else {
    res.status(500).json({ error: "Failed to update menu item" });
  }
});

app.delete("/api/menu/:id", (req, res) => {
  const menu = readMenu();
  const itemId = parseInt(req.params.id);
  const filteredMenu = menu.filter((item) => item.id !== itemId);

  if (filteredMenu.length === menu.length) {
    return res.status(404).json({ error: "Menu item not found" });
  }

  if (writeMenu(filteredMenu)) {
    res.status(204).send();
  } else {
    res.status(500).json({ error: "Failed to delete menu item" });
  }
});

// Orders routes
app.get("/api/orders", (req, res) => {
  const orders = readOrders();
  res.json(orders);
});

app.post("/api/orders", (req, res) => {
  const orders = readOrders();
  // Basic validation for orders: require items array and total
  const { items, total } = req.body || {};
  if (!Array.isArray(items) || typeof total !== "number") {
    return res.status(400).json({
      error:
        'Invalid order. "items" (array) and "total" (number) are required.',
    });
  }

  const newOrder = {
    id: `ORDER-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: "PENDING",
    ...req.body,
  };

  orders.push(newOrder);

  if (writeOrders(orders)) {
    res.status(201).json(newOrder);
  } else {
    res.status(500).json({ error: "Failed to save order" });
  }
});

app.put("/api/orders/:id/status", (req, res) => {
  const orders = readOrders();
  const orderId = req.params.id;
  const orderIndex = orders.findIndex((order) => order.id === orderId);

  if (orderIndex === -1) {
    return res.status(404).json({ error: "Order not found" });
  }

  orders[orderIndex].status = req.body.status;

  if (writeOrders(orders)) {
    res.json(orders[orderIndex]);
  } else {
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Configure MercadoPago
console.log(
  "Initializing Mercado Pago with token:",
  process.env.MERCADO_PAGO_ACCESS_TOKEN?.substring(0, 10) + "..."
);

// Initialize Mercado Pago client with runtime detection to support several SDK shapes
let mp;
if (typeof mercadopagoPkg.MercadoPago === "function") {
  // export: { MercadoPago }
  mp = new mercadopagoPkg.MercadoPago({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
  });
} else if (typeof mercadopagoPkg.MercadoPagoConfig === "function") {
  // older named export
  mp = new mercadopagoPkg.MercadoPagoConfig({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
  });
} else if (typeof mercadopagoPkg.default === "function") {
  // default constructor export
  mp = new mercadopagoPkg.default({
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
  });
} else if (typeof mercadopagoPkg.configure === "function") {
  // v1-style SDK: configure in place
  mercadopagoPkg.configure({
    access_token: process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
  });
  mp = mercadopagoPkg;
} else {
  throw new Error(
    "Unsupported mercadopago SDK shape - cannot initialize client"
  );
}

// Payment helper reference
const payment = mp.payment;

// Fallback: direct REST call to Mercado Pago if SDK shape doesn't expose payment.create
const createPaymentDirect = async (payload) => {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN || "";
  const url = "https://api.mercadopago.com/v1/payments";
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const response = await axios.post(url, payload, { headers });
  return response.data;
};

const getPaymentDirect = async (transactionId) => {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN || "";
  const url = `https://api.mercadopago.com/v1/payments/${transactionId}`;
  const headers = { Authorization: `Bearer ${token}` };
  const response = await axios.get(url, { headers });
  return response.data;
};

// Test Mercado Pago configuration
const testMercadoPago = async () => {
  try {
    console.log("Testing Mercado Pago payment creation...");
    const payload = {
      transaction_amount: Number(10),
      description: "Pedido de Teste - El Sabor",
      payment_method_id: "pix",
      installments: 1,
      payer: {
        email: "cliente@gmail.com",
        first_name: "João",
        last_name: "Silva",
        identification: {
          type: "CPF",
          number: "97532419081", // CPF válido para testes
        },
      },
      notification_url: "https://webhook.site/xyz", // Precisaremos configurar uma URL válida depois
    };
    console.log("Payment payload:", JSON.stringify(payload, null, 2));
    console.log(
      "Using token:",
      process.env.MERCADO_PAGO_ACCESS_TOKEN?.substring(0, 15) + "..."
    );

    let testPayment;
    try {
      if (payment && typeof payment.create === "function") {
        testPayment = await payment.create(payload);
        console.log(
          "Raw test payment response (SDK):",
          JSON.stringify(testPayment, null, 2)
        );
        testPayment = testPayment?.response || testPayment;
      } else {
        testPayment = await createPaymentDirect(payload);
        console.log(
          "Raw test payment response (REST):",
          JSON.stringify(testPayment, null, 2)
        );
      }
      console.log(
        "Normalized test response body:",
        JSON.stringify(testPayment, null, 2)
      );
      return true;
    } catch (error) {
      console.error("Mercado Pago test failed:", {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        response: error.response?.data,
        headers: error.response?.headers,
      });
      if (error.cause) {
        console.error("Error cause:", error.cause);
      }
      // Try to get token information
      try {
        const tokenInfo = await axios.get(
          "https://api.mercadopago.com/users/me",
          {
            headers: {
              Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );
        console.log("Token info:", tokenInfo.data);
      } catch (tokenError) {
        console.error("Failed to get token info:", tokenError.response?.data);
      }
      return false;
    }
  } catch (err) {
    console.error("Unexpected error in testMercadoPago:", err);
    return false;
  }
};

// Run test when server starts
testMercadoPago();

// Payment routes
app.post("/api/payments/pix", async (req, res) => {
  const { orderId, customerName, customerPhone } = req.body;

  if (!orderId || !customerName || !customerPhone) {
    return res
      .status(400)
      .json({ error: "Order ID, customer name and phone are required" });
  }

  const orders = readOrders();
  const order = orders.find((o) => o.id === orderId);

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  // Update order with customer info
  order.customer = {
    name: customerName,
    phone: customerPhone,
  };

  try {
    // 1. Create order on Mercado Pago first
    console.log("Creating Mercado Pago order...", {
      orderId: order.id,
      total: order.total,
      items: order.items.length,
    });

    const mpOrder = await createOrderOnMP(order);
    console.log("Mercado Pago order created:", mpOrder);

    // 2. Create PIX payment linked to the order
    console.log("Creating PIX payment for order:", {
      orderId: order.id,
      total: order.total,
      userName: order.user.name,
      mpOrderId: mpOrder.id,
    });

    const result = await axios
      .post(
        "https://api.mercadopago.com/v1/payments",
        {
          transaction_amount: Number(order.total.toFixed(2)),
          description: `Pedido #${order.id}`,
          payment_method_id: "pix",
          payer: {
            email: `cliente.${order.id}@email.com`,
            first_name: order.customer.name.split(" ")[0] || "Cliente",
            last_name: order.customer.name.split(" ").slice(1).join(" ") || "",
            identification: {
              type: "CPF",
              number: "13468423454", // Using test CPF
            },
            phone: {
              area_code: order.customer.phone.substring(0, 2),
              number: order.customer.phone.substring(2),
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
            "X-Idempotency-Key": `pix_${order.id}_${Date.now()}`,
          },
        }
      )
      .then((response) => response.data);

    console.log("Payment created:", {
      id: result.id,
      status: result.status,
      status_detail: result.status_detail,
    });

    if (!result.point_of_interaction?.transaction_data) {
      console.error("Invalid payment response - missing QR code data:", result);
      throw new Error("Payment creation failed");
    }

    const transactionData = result.point_of_interaction.transaction_data;
    res.json({
      qrCode: {
        image: transactionData.qr_code_base64,
        code: transactionData.qr_code,
      },
      expiresIn: transactionData.qr_code_expiration_date,
      paymentId: result.id,
      status: result.status,
    });
  } catch (error) {
    console.error("Error creating PIX payment:", error);
    console.error("Error details:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      response: error.response?.data,
    });
    res.status(500).json({
      error: "Failed to create PIX payment",
      details: error.message,
      apiError: error.response?.data,
    });
  }
});

app.get("/api/payments/:transactionId/status", async (req, res) => {
  const { transactionId } = req.params;

  try {
    const response = await payment.get(transactionId);
    const body = response?.response || response?.body || response;
    res.json({
      status: body?.status,
      statusDetail: body?.status_detail,
      paid: body?.status === "approved",
    });
  } catch (error) {
    console.error("Error checking payment status:", error);
    res.status(500).json({ error: "Failed to check payment status" });
  }
});

// Initialize data and start server
initializeDataFiles();

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Start server with error handling
const server = app
  .listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
  })
  .on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `Port ${PORT} is already in use. Please try another port or kill the process using this port.`
      );
    } else {
      console.error("Failed to start server:", err);
    }
    process.exit(1);
  });

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.info("SIGTERM signal received. Closing server...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
