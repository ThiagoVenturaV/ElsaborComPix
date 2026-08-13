import { API_BASE_URL } from "./api";

interface PixData {
  qrCode: {
    image: string;
    code: string;
  };
  expiresIn: string;
  paymentId: string;
  status: string;
}

interface PaymentStatus {
  status: string;
  statusDetail: string;
  paid: boolean;
}

export const createPixPayment = async (
  orderId: string,
  orderAccessToken: string
): Promise<PixData> => {
  const response = await fetch(`${API_BASE_URL}/payments/pix`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      orderId,
      orderAccessToken,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create PIX payment");
  }

  return response.json();
};

export const checkPaymentStatus = async (
  paymentId: string,
  orderAccessToken: string
): Promise<PaymentStatus> => {
  const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/status`, {
    headers: { "X-Order-Token": orderAccessToken },
  });

  if (!response.ok) {
    throw new Error("Failed to check payment status");
  }

  return response.json();
};
