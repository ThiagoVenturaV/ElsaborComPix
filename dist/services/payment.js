import * as mercadopagoPkg from "mercadopago";
// Initialize Mercado Pago client with runtime detection (supports multiple SDK shapes)
const createMpClient = () => {
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (typeof mercadopagoPkg.MercadoPago === "function") {
        return new mercadopagoPkg.MercadoPago({ accessToken: token });
    }
    if (typeof mercadopagoPkg.MercadoPagoConfig === "function") {
        return new mercadopagoPkg.MercadoPagoConfig({
            accessToken: token,
        });
    }
    if (typeof mercadopagoPkg.default === "function") {
        return new mercadopagoPkg.default({ accessToken: token });
    }
    if (typeof mercadopagoPkg.configure === "function") {
        mercadopagoPkg.configure({ access_token: token });
        return mercadopagoPkg;
    }
    throw new Error("Unsupported mercadopago SDK shape - cannot initialize client");
};
const mp = createMpClient();
export const createPixPayment = async (order) => {
    try {
        const payment = await mp.payment.create({
            transaction_amount: order.total,
            payment_method_id: "pix",
            installments: 1,
            payer: {
                email: "customer@email.com", // In production, get this from the user
                first_name: order.user.name.split(" ")[0],
                last_name: order.user.name.split(" ").slice(1).join(" ") || "Cliente",
            },
            description: `Pedido #${order.id}`,
        });
        // Normalize response shape
        const raw = payment?.response || payment;
        const pixData = raw.point_of_interaction?.transaction_data;
        if (!pixData)
            throw new Error("No PIX transaction data returned");
        return {
            qrCode: {
                image: pixData.qr_code_base64,
                code: pixData.qr_code,
            },
            expiresIn: pixData.qr_code_expiration_date,
            transactionId: raw.id || raw.transaction_id,
        };
    }
    catch (error) {
        console.error("Error creating PIX payment:", error);
        throw new Error("Failed to create PIX payment");
    }
};
export const checkPaymentStatus = async (transactionId) => {
    try {
        const response = await mp.payment.get(transactionId);
        const body = response?.response || response?.body || response;
        return {
            status: body?.status,
            statusDetail: body?.status_detail,
            paid: body?.status === "approved",
        };
    }
    catch (error) {
        console.error("Error checking payment status:", error);
        throw new Error("Failed to check payment status");
    }
};
