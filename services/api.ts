import { Order, OrderStatus, MenuItem } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

// Helper function to handle API responses
const handleApiResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// Menu API functions
export const fetchMenu = async (): Promise<MenuItem[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/menu`);
    return await handleApiResponse(response);
  } catch (error) {
    console.error('Failed to fetch menu:', error);
    throw error;
  }
};

export const createMenuItem = async (menuItem: Omit<MenuItem, 'id'>): Promise<MenuItem> => {
  try {
    const response = await fetch(`${API_BASE_URL}/menu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(menuItem),
    });
    return await handleApiResponse(response);
  } catch (error) {
    console.error('Failed to create menu item:', error);
    throw error;
  }
};

export const updateMenuItem = async (id: number, menuItem: Partial<MenuItem>): Promise<MenuItem> => {
  try {
    const response = await fetch(`${API_BASE_URL}/menu/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(menuItem),
    });
    return await handleApiResponse(response);
  } catch (error) {
    console.error('Failed to update menu item:', error);
    throw error;
  }
};

export const deleteMenuItem = async (id: number): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE_URL}/menu/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error('Failed to delete menu item:', error);
    throw error;
  }
};

// Orders API functions
export const submitOrder = async (order: Omit<Order, 'id' | 'createdAt' | 'status'>): Promise<Order> => {
  try {
    const response = await fetch(`${API_BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    });
    const newOrder = await handleApiResponse(response);
    // Convert createdAt string back to Date object
    return {
      ...newOrder,
      createdAt: new Date(newOrder.createdAt),
    };
  } catch (error) {
    console.error('Failed to submit order:', error);
    throw error;
  }
};

export const fetchOrders = async (): Promise<Order[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/orders`);
    const orders = await handleApiResponse(response);
    // Convert createdAt strings back to Date objects
    return orders.map((order: any) => ({
      ...order,
      createdAt: new Date(order.createdAt),
    })).sort((a: Order, b: Order) => b.createdAt.getTime() - a.createdAt.getTime());
  } catch (error) {
    console.error('Failed to fetch orders:', error);
    throw error;
  }
};

export const updateOrderStatus = async (orderId: string, status: OrderStatus): Promise<Order> => {
  try {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    const updatedOrder = await handleApiResponse(response);
    // Convert createdAt string back to Date object
    return {
      ...updatedOrder,
      createdAt: new Date(updatedOrder.createdAt),
    };
  } catch (error) {
    console.error('Failed to update order status:', error);
    throw error;
  }
};