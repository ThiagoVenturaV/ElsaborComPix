export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  flavors?: string[]; // Opções de sabores disponíveis
}

export interface CartItem extends MenuItem {
  quantity: number;
  selectedFlavor?: string; // Sabor selecionado pelo cliente
}

export enum OrderStatus {
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  CANCELED = "CANCELED",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  READY_FOR_PICKUP = "READY_FOR_PICKUP",
  COMPLETED = "COMPLETED",
}

export enum DeliveryType {
  DELIVERY = "DELIVERY",
  PICKUP = "PICKUP",
}

export enum PaymentMethod {
  CASH = "CASH",
  CARD = "CARD",
  PIX = "PIX",
}

// Funções auxiliares para tradução
export const translatePaymentMethod = (method: PaymentMethod): string => {
  switch (method) {
    case PaymentMethod.CASH:
      return "Dinheiro";
    case PaymentMethod.CARD:
      return "Cartão de Crédito/Débito";
    case PaymentMethod.PIX:
      return "PIX";
    default:
      return method;
  }
};

export const translateDeliveryType = (type: DeliveryType): string => {
  switch (type) {
    case DeliveryType.DELIVERY:
      return "Entrega";
    case DeliveryType.PICKUP:
      return "Retirada";
    default:
      return type;
  }
};

export const translateOrderStatus = (status: OrderStatus): string => {
  switch (status) {
    case OrderStatus.PENDING:
      return "Pendente";
    case OrderStatus.ACCEPTED:
      return "Aceito";
    case OrderStatus.CANCELED:
      return "Cancelado";
    case OrderStatus.OUT_FOR_DELIVERY:
      return "Saiu para Entrega";
    case OrderStatus.DELIVERED:
      return "Entregue";
    case OrderStatus.READY_FOR_PICKUP:
      return "Pronto para Retirada";
    case OrderStatus.COMPLETED:
      return "Concluído";
    default:
      return status;
  }
};

export interface User {
  name: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface Order {
  id: string;
  user: User;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  deliveryType: DeliveryType;
  paymentMethod: PaymentMethod;
  createdAt: Date;
  observations?: string; // Observações do cliente
}
