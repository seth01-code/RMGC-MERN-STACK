import React, { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import newRequest from "../../utils/newRequest";
import { Bar, Pie, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useExchangeRate } from "../../hooks/useExchangeRate";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement,
  PointElement,
  LineElement
);

function AdminDashboard() {
  const chartRef = useRef(null);
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const { currencySymbol, convertPrice, countryCurrency } = useExchangeRate(
    currentUser?.country
  );
  const [currentGroup, setCurrentGroup] = useState(0);
  const usersPerGroup = 10;

  // Fetch seller revenue data
  const { data, isLoading, error } = useQuery({
    queryKey: ["adminRevenue"],
    queryFn: async () => {
      const res = await newRequest.get("/orders/admin-revenue");
      return res.data;
    },
  });

  const { data: gigs = [], isLoading: gigsLoading } = useQuery({
    queryKey: ["userGigs"],
    queryFn: async () => {
      const response = await newRequest.get(`/gigs`);
      return response.data;
    },
  });

  // Store user details
  const [userDetails, setUserDetails] = useState({});

  // Fetch user details based on userId
  useEffect(() => {
    const fetchUserDetails = async () => {
      const uniqueUserIds = [...new Set(gigs.map((gig) => gig.userId))];
      const userResponses = await Promise.all(
        uniqueUserIds.map((userId) => newRequest.get(`/users/${userId}`))
      );

      const usersData = {};
      userResponses.forEach((res) => {
        usersData[res.data._id] = res.data;
      });

      setUserDetails(usersData);
    };

    if (gigs.length > 0) {
      fetchUserDetails();
    }
  }, [gigs]);

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["fetchOrders"],
    queryFn: async () => {
      const res = await newRequest.get("/orders/all-completed");
      return res.data || [];
    },
  });

  // State for charts
  const [barChartData, setBarChartData] = useState({
    labels: [],
    datasets: [],
  });
  const [pieChartData, setPieChartData] = useState({
    labels: [],
    datasets: [],
  });
  const [lineChartData, setLineChartData] = useState({
    labels: [],
    datasets: [],
  });

  const groupedData = {
    ...barChartData,
    labels: barChartData.labels.slice(
      currentGroup * usersPerGroup,
      (currentGroup + 1) * usersPerGroup
    ),
    datasets: barChartData.datasets.map((dataset) => ({
      ...dataset,
      data: dataset.data.slice(
        currentGroup * usersPerGroup,
        (currentGroup + 1) * usersPerGroup
      ),
    })),
  };

  // const [monthlyEarnings, setMonthlyEarnings] = useState([]);

  // Revenue Calculation
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [companyIncome, setCompanyIncome] = useState(0);

  useEffect(() => {
    if (data) {
      const sellerNames = data.revenueData.map((seller) => seller.sellerName);
      const revenueValues = data.revenueData.map(
        (seller) => seller.totalSellerRevenueConverted
      );

      setBarChartData({
        labels: sellerNames,
        datasets: [
          {
            label: `Total Revenue ${currencySymbol}`,
            data: revenueValues,
            backgroundColor: "#1dbf73",
          },
        ],
      });

      const totalRevenueValue = data?.totalRevenueAllSellersConverted || 0;
      const companyIncomeValue = totalRevenueValue * 0.1;
      setTotalRevenue(totalRevenueValue);
      setCompanyIncome(companyIncomeValue);

      setPieChartData({
        labels: ["Total Revenue", "Company's Income (10%)"],
        datasets: [
          {
            data: [totalRevenueValue, companyIncomeValue],
            backgroundColor: ["#1dbf73", "#ffcc00"],
          },
        ],
      });

      const monthlyEarnings = data.monthlyEarnings || {};
      const months = Object.keys(monthlyEarnings);
      const earnings = Object.values(monthlyEarnings);

      setLineChartData({
        labels: months,
        datasets: [
          {
            label: "Monthly Sales",
            data: earnings,
            borderColor: "#1dbf73",
            fill: false,
          },
        ],
      });
    }
  }, [data]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6"
    >
      <h1 className="text-3xl font-semibold text-gray-900">Admin Dashboard</h1>

      {/* Sales Per Seller Chart */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border rounded-lg shadow-md p-6 bg-white"
      >
        <h2 className="font-semibold text-lg mb-4">
          Total Sales Per Service Provider
        </h2>

        {/* Bar Chart */}
        <div className="w-full flex flex-col items-center justify-center">
          <Bar
            ref={chartRef}
            data={groupedData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                x: { beginAtZero: true },
              },
            }}
            className="w-full h-auto sm:h-[400px] md:h-[450px] lg:h-[500px] max-h-[600px]"
          />
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col items-center gap-2 mt-6">
          <div className="flex items-center gap-4">
            {/* Previous Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => setCurrentGroup((prev) => Math.max(prev - 1, 0))}
              disabled={currentGroup === 0}
              className="flex items-center gap-1 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiChevronLeft size={18} />
              Previous
            </motion.button>

            {/* Page Selector */}
            <select
              className="px-3 py-1 rounded border text-sm text-gray-700"
              value={currentGroup}
              onChange={(e) => setCurrentGroup(Number(e.target.value))}
            >
              {Array.from({
                length: Math.ceil(barChartData.labels.length / usersPerGroup),
              }).map((_, index) => (
                <option key={index} value={index}>
                  Page {index + 1}
                </option>
              ))}
            </select>

            {/* Next Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              onClick={() =>
                setCurrentGroup((prev) =>
                  (prev + 1) * usersPerGroup < barChartData.labels.length
                    ? prev + 1
                    : prev
                )
              }
              disabled={
                (currentGroup + 1) * usersPerGroup >= barChartData.labels.length
              }
              className="flex items-center gap-1 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <FiChevronRight size={18} />
            </motion.button>
          </div>

          {/* Page Count */}
          <span className="text-sm text-gray-500">
            Page {currentGroup + 1} of{" "}
            {Math.ceil(barChartData.labels.length / usersPerGroup)}
          </span>
        </div>
      </motion.div>

      {/* Revenue Breakdown */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border rounded-lg shadow-md p-6 bg-white"
      >
        <h2 className="font-semibold text-lg mb-4">Revenue Breakdown</h2>
        <div className="flex flex-col items-center justify-center">
          <div className="w-full flex justify-center items-center">
            <Pie
              data={pieChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
              }}
              className="w-full h-[300px] sm:h-[400px] md:h-[450px]"
            />
          </div>
          <p className="text-center font-semibold mt-4">
            Total Revenue: {currencySymbol}{" "}
            {new Intl.NumberFormat().format(totalRevenue)}
          </p>
          <p className="text-center font-semibold">
            Company Income (10%): {currencySymbol}{" "}
            {companyIncome.toLocaleString()}
          </p>
        </div>
      </motion.div>

      {/* Monthly Sales Line Chart */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border rounded-lg shadow-md p-6 bg-white"
      >
        <h2 className="text-2xl font-semibold mb-4">
          Monthly Company Income Overview
        </h2>
        <div className="w-full flex flex-col items-center justify-center">
          <Line
            data={lineChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
            }}
            className="w-full h-auto sm:h-[400px] md:h-[450px] lg:h-[500px] max-h-[600px]"
          />
        </div>
      </motion.div>

      {/* All Completed Orders */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border rounded-lg shadow-md p-6 bg-white"
      >
        <h2 className="text-2xl font-semibold mb-4">All Completed Orders</h2>
        {ordersLoading ? (
          <p>Loading completed orders...</p>
        ) : orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order._id} className="border-b pb-4">
                <p>
                  <strong>Order ID:</strong> {order._id}
                </p>
                <p>
                  <strong>S.P:</strong> {order.sellerName}
                </p>
                <p>
                  <strong>Buyer:</strong> {order.buyerName}
                </p>
                <p>
                  <strong>Total:</strong>{" "}
                  {new Intl.NumberFormat().format(convertPrice(order.price))}{" "}
                  {countryCurrency}
                </p>
                <p>
                  <strong>Status:</strong> {order.status}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p>No completed orders yet.</p>
        )}
      </motion.div>

      {/* List of All Gigs */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border rounded-lg shadow-md p-6 bg-white"
      >
        <h2 className="text-2xl font-semibold mb-4">All Gigs</h2>
        {gigsLoading ? (
          <p>Loading gigs...</p>
        ) : gigs && gigs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gigs.map((gig) => {
              const user = userDetails[gig.userId] || {};
              return (
                <div
                  key={gig._id}
                  className="border rounded-lg shadow-md p-4 bg-gray-100"
                >
                  <p className="text-sm font-bold">Gig Title:</p>
                  <h3 className="font-semibold text-lg">{gig.title}</h3>

                  <img
                    src={gig.cover}
                    className="h-72 w-full object-cover rounded-lg"
                    alt="Gig Cover"
                  />

                  <div className="user flex items-center gap-2 mt-2">
                    <img
                      src={
                        user.img ||
                        "https://miamistonesource.com/wp-content/uploads/2018/05/no-avatar-25359d55aa3c93ab3466622fd2ce712d1.jpg"
                      }
                      alt={user.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <span>{user.username || "Unknown User"}</span>
                  </div>

                  <p className="text-sm font-bold">Service Title:</p>
                  <h3 className="font-semibold text-lg">{gig.shortTitle}</h3>

                  <p className="text-sm text-gray-700 mt-2 line-clamp-3">
                    {gig.desc}
                  </p>
                  <p className="text-md font-semibold mt-2 mb-2">
                    Price: {currencySymbol}{" "}
                    {new Intl.NumberFormat().format(convertPrice(gig.price))}
                  </p>
                  <button
                    onClick={() => navigate(`gigdetails/${gig._id}`)}
                    className="text-green-500 hover:text-green-600"
                  >
                    View Details
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p>No gigs available.</p>
        )}
      </motion.div>
    </motion.div>
  );
}

export default AdminDashboard;
