import { Order } from "../types";
import { API_BASE_URL } from "./api";

interface CustomerInfo {
  name: string;
  phone: string;
}

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
  customer: CustomerInfo
): Promise<PixData> => {
  const response = await fetch(`${API_BASE_URL}/payments/pix`, {
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

export const checkPaymentStatus = async (
  paymentId: string
): Promise<PaymentStatus> => {
  const response = await fetch(`${API_BASE_URL}/payments/${paymentId}/status`);

  if (!response.ok) {
    throw new Error("Failed to check payment status");
  }

  return response.json();
};
