import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import newRequest from "../../utils/newRequest";
import { ClipLoader } from "react-spinners";
import { useExchangeRate } from "../../hooks/useExchangeRate";
import { useTranslation } from "react-i18next";
import { RiMessage3Line } from "react-icons/ri";

const Orders = () => {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [userDetails, setUserDetails] = useState({});

  const { currencySymbol, convertPrice } = useExchangeRate(
    currentUser?.country
  );

  const { isLoading, error, data } = useQuery({
    queryKey: ["orders"],
    queryFn: () => newRequest.get(`/orders`).then((res) => res.data),
  });

  useEffect(() => {
    const fetchUserDetails = async (userId) => {
      if (!userId || userDetails[userId]) return;
      try {
        const response = await newRequest.get(`/users/${userId}`);
        setUserDetails((prev) => ({ ...prev, [userId]: response.data }));
      } catch (error) {
        console.error("Error fetching user details:", error);
      }
    };

    if (data) {
      data.buyerOrders?.forEach((order) => fetchUserDetails(order.sellerId));
      data.sellerOrders?.forEach((order) => fetchUserDetails(order.buyerId));
    }
  }, [data]);

  const handleContact = async (order) => {
    const sellerId = order.sellerId;
    const buyerId = order.buyerId;
    const otherUserId = currentUser.seller ? buyerId : sellerId; // Ensure correct user targeting

    console.log("currentUser:", currentUser); // Debugging
    console.log("userId (currentUser._id):", currentUser.id); // Ensure it's not undefined
    console.log("otherUserId:", otherUserId);

    if (!currentUser.id || !otherUserId) {
      console.error("User ID or Other User ID is missing!");
      return;
    }

    try {
      // ✅ Send request to check or create conversation
      const res = await newRequest.post(`/conversations/`, {
        userId: currentUser.id,
        otherUserId: otherUserId,
      });

      // ✅ Navigate to chat page with the conversation ID
      navigate(`/chat`);
    } catch (error) {
      console.error("Error handling contact:", error);
    }
  };

  const formatPrice = (price) => {
    return parseFloat(price).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleCompleteOrder = async (orderId) => {
    try {
      await newRequest.patch(`/orders/${orderId}`, { isCompleted: true });
      window.location.reload();
    } catch (err) {
      console.error("Error updating order status:", err);
    }
  };

  return (
    <div className="flex justify-center text-gray-700 min-h-screen px-4 sm:px-8 lg:px-12 py-12">
      {isLoading ? (
        <div className="flex justify-center items-center w-full h-full">
          <ClipLoader size={50} color="#1dbf73" />
        </div>
      ) : error ? (
        <div className="text-center text-red-500">
          {t("somethingWentWrong")}
        </div>
      ) : (
        <div className="w-full max-w-7xl">
          <h1 className="text-2xl font-semibold mb-6">{t("orders")}</h1>

          {!data.buyerOrders?.length && !data.sellerOrders?.length ? (
            <div className="text-center text-gray-600 mt-12">
              {t("noOrdersYet")}
            </div>
          ) : (
            <div>
              {["buyerOrders", "sellerOrders"].map(
                (orderType) =>
                  data[orderType]?.length > 0 && (
                    <div key={orderType} className="mb-10">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px] border-collapse border border-gray-200">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="p-3 text-left">{t("image")}</th>
                              <th className="p-3 text-left">{t("title")}</th>
                              <th className="p-3 text-left">{t("price")}</th>
                              <th className="p-3 text-left">{t("username")}</th>
                              <th className="p-3 text-left">{t("status")}</th>
                              {orderType === "buyerOrders" && (
                                <th className="p-3 text-left">
                                  {t("actions")}
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {data[orderType].map((order) => {
                              const user =
                                userDetails[order.sellerId] ||
                                userDetails[order.buyerId];
                              return (
                                <tr
                                  key={order._id}
                                  className="border-t border-gray-200"
                                >
                                  <td className="p-3">
                                    <img
                                      className="w-12 h-12 object-cover rounded"
                                      src={
                                        order.img ||
                                        "https://via.placeholder.com/50"
                                      }
                                      alt="Order"
                                    />
                                  </td>
                                  <td className="p-3">{order.title}</td>
                                  <td className="p-3">
                                    {currencySymbol}{" "}
                                    {formatPrice(order.price, order.currency)}
                                  </td>
                                  <td className="p-3">
                                    {user?.username || "N/A"}
                                  </td>
                                  <td className="p-3">
                                    {order.isCompleted ? (
                                      <span className="text-green-500">
                                        {t("completed")}
                                      </span>
                                    ) : (
                                      <span className="text-red-500">
                                        {t("notCompleted")}
                                      </span>
                                    )}
                                  </td>
                                  {orderType === "buyerOrders" && (
                                    <td className="p-3 flex gap-2">
                                      <button
                                        className="text-blue-500 underline hover:text-blue-700"
                                        onClick={() => handleContact(order)}
                                      >
                                        <RiMessage3Line />
                                      </button>
                                      {!order.isCompleted && (
                                        <button
                                          className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                                          onClick={() =>
                                            handleCompleteOrder(order._id)
                                          }
                                        >
                                          {t("markAsCompleted")}
                                        </button>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Orders;
