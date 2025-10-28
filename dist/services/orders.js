import axios from "axios";
const MP_API_BASE = "https://api.mercadopago.com/v1";
export const createOrderOnMP = async (order) => {
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!token)
        throw new Error("Missing Mercado Pago access token");
    try {
        const response = await axios.post(`${MP_API_BASE}/orders`, {
            external_reference: order.id,
            total_amount: Number(order.total.toFixed(2)),
            items: order.items.map((item) => ({
                id: item.id.toString(),
                category_id: item.category,
                title: item.name,
                description: item.description || item.name,
                unit_price: item.price,
                quantity: item.quantity,
                unit_measure: "unit",
                total_amount: item.price * item.quantity,
            })),
            payer: {
                email: order.user.email || "customer@email.com",
                name: order.user.name,
            },
        }, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                "X-Idempotency-Key": `order_${order.id}_${Date.now()}`,
            },
        });
        console.log("Mercado Pago order created:", {
            orderId: order.id,
            mpOrderId: response.data.id,
            status: response.data.status,
        });
        return response.data;
    }
    catch (error) {
        console.error("Error creating Mercado Pago order:", {
            orderId: order.id,
            error: error.message,
            response: error.response?.data,
        });
        throw new Error(error.response?.data?.message || "Failed to create order on Mercado Pago");
    }
};
export const getOrderOnMP = async (mpOrderId) => {
    const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!token)
        throw new Error("Missing Mercado Pago access token");
    try {
        const response = await axios.get(`${MP_API_BASE}/orders/${mpOrderId}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
        });
        return response.data;
    }
    catch (error) {
        console.error("Error fetching Mercado Pago order:", {
            mpOrderId,
            error: error.message,
            response: error.response?.data,
        });
        throw new Error(error.response?.data?.message || "Failed to fetch order from Mercado Pago");
    }
};
