export const createPixPayment = async (orderId, customer) => {
    const response = await fetch(`/api/payments/pix`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            orderId,
            customerName: customer.name,
            customerPhone: customer.phone,
        }),
    });
    if (!response.ok) {
        throw new Error("Failed to create PIX payment");
    }
    return response.json();
};
export const checkPaymentStatus = async (paymentId) => {
    const response = await fetch(`/api/payments/status/${paymentId}`);
    if (!response.ok) {
        throw new Error("Failed to check payment status");
    }
    return response.json();
};
