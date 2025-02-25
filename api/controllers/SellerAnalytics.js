import Order from '../models/orderModel.js';

const calculateSellerRevenue = async (sellerId) => {
  const completedOrders = await Order.find({ sellerId, status: 'completed' });
  return completedOrders.reduce((total, order) => total + order.price, 0);
};

export const getSellerAnalytics = async (req, res) => {
  try {
    const { sellerId } = req.params;
    const revenue = await calculateSellerRevenue(sellerId);
    const completedOrders = await Order.countDocuments({ sellerId, status: 'completed' });

    res.json({ revenue, completedOrders });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};
