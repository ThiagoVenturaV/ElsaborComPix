import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, scryptSync } from "node:crypto";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const getAvailablePort = () =>
  new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });

const waitForServer = (process, port) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Server startup timed out")), 5000);
    process.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`Server exited with code ${code}`));
    });
    process.stdout.on("data", async () => {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/api/health`);
        if (response.ok) {
          clearTimeout(timeout);
          resolve();
        }
      } catch {}
    });
  });

test("protects admin routes and recalculates order totals", async (t) => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "elsabor-test-"));
  await writeFile(
    path.join(dataDir, "menu.json"),
    JSON.stringify([
      {
        id: 1,
        name: "Trusted item",
        description: "",
        price: 25.5,
        category: "Test",
        image: "",
      },
    ])
  );
  await writeFile(path.join(dataDir, "orders.json"), "[]");

  const password = "test-admin-password";
  const salt = randomBytes(16);
  const passwordHash = `scrypt:${salt.toString("hex")}:${scryptSync(
    password,
    salt,
    32
  ).toString("hex")}`;
  const port = await getAvailablePort();
  const child = spawn(process.execPath, [path.join(projectRoot, "server.js")], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(port),
      DATA_DIR: dataDir,
      MERCADO_PAGO_ACCESS_TOKEN: "test-token-never-sent",
      ADMIN_PASSWORD_HASH: passwordHash,
      ADMIN_SESSION_SECRET: "test-session-secret-with-at-least-32-characters",
      ALLOWED_ORIGINS: "http://localhost:3000",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(async () => {
    child.kill("SIGTERM");
    await rm(dataDir, { recursive: true, force: true });
  });
  await waitForServer(child, port);

  const baseUrl = `http://127.0.0.1:${port}/api`;
  assert.equal((await fetch(`${baseUrl}/orders`)).status, 401);
  assert.equal(
    (
      await fetch(`${baseUrl}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: "wrong" }),
      })
    ).status,
    401
  );

  const login = await fetch(`${baseUrl}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  assert.equal(login.status, 204);
  const cookie = login.headers.get("set-cookie");
  assert.match(cookie, /HttpOnly/i);
  assert.equal(
    (await fetch(`${baseUrl}/orders`, { headers: { Cookie: cookie } })).status,
    200
  );

  const createOrder = await fetch(`${baseUrl}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user: { name: "Test User", phone: "81999999999" },
      items: [{ id: 1, name: "Forged", price: 0.01, quantity: 2 }],
      total: 0.02,
      deliveryType: "PICKUP",
      paymentMethod: "CASH",
    }),
  });
  assert.equal(createOrder.status, 201);
  const responseOrder = await createOrder.json();
  assert.equal(responseOrder.total, 51);
  assert.equal(responseOrder.items[0].name, "Trusted item");
  assert.ok(responseOrder.accessToken);

  const [storedOrder] = JSON.parse(
    await readFile(path.join(dataDir, "orders.json"), "utf8")
  );
  assert.equal(storedOrder.total, 51);
  assert.equal(storedOrder.accessToken, undefined);
  assert.match(storedOrder.accessTokenHash, /^[a-f0-9]{64}$/);
});
