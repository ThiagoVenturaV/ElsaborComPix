export var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "PENDING";
    OrderStatus["ACCEPTED"] = "ACCEPTED";
    OrderStatus["CANCELED"] = "CANCELED";
    OrderStatus["OUT_FOR_DELIVERY"] = "OUT_FOR_DELIVERY";
    OrderStatus["DELIVERED"] = "DELIVERED";
    OrderStatus["READY_FOR_PICKUP"] = "READY_FOR_PICKUP";
    OrderStatus["COMPLETED"] = "COMPLETED";
})(OrderStatus || (OrderStatus = {}));
export var DeliveryType;
(function (DeliveryType) {
    DeliveryType["DELIVERY"] = "DELIVERY";
    DeliveryType["PICKUP"] = "PICKUP";
})(DeliveryType || (DeliveryType = {}));
export var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["CARD"] = "CARD";
    PaymentMethod["PIX"] = "PIX";
})(PaymentMethod || (PaymentMethod = {}));
// Funções auxiliares para tradução
export const translatePaymentMethod = (method) => {
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
export const translateDeliveryType = (type) => {
    switch (type) {
        case DeliveryType.DELIVERY:
            return "Entrega";
        case DeliveryType.PICKUP:
            return "Retirada";
        default:
            return type;
    }
};
export const translateOrderStatus = (status) => {
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
