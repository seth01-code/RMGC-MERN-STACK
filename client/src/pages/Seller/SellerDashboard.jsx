import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Line, Bar, Pie } from "react-chartjs-2";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import newRequest from "../../utils/newRequest"; // Ensure correct import path
// import moment from "moment";
import { useExchangeRate } from "../../hooks/useExchangeRate"; // Import your custom hook
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  BarElement,
  ArcElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  BarElement,
  ArcElement
);

const SellerDashboard = () => {
  // const currentUser = JSON.parse(localStorage.getItem("currentUser"));

  const navigate = useNavigate();

  // Fetch User Profile
  const {
    data: user,
    isLoading: userLoading,
    error: userError,
  } = useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      const response = await newRequest.get("/users/profile");
      return response.data;
    },
  });

  const { currencySymbol, convertPrice, countryCurrency } = useExchangeRate(
    user?.country
  );

  const {
    data: orders = [],
    isLoading: ordersLoading,
    error: ordersError,
  } = useQuery({
    queryKey: ["fetchOrders"],
    queryFn: async () => {
      const res = await newRequest.get("/orders");
      return res.data || [];
    },
  });

  // Fetch Gigs
  const {
    data: gigs = [],
    isLoading: gigsLoading,
    error: gigsError,
  } = useQuery({
    queryKey: ["userGigs", user?._id],
    enabled: !!user?._id, // Ensures query runs after user is available
    queryFn: async () => {
      const response = await newRequest.get(`/gigs?userId=${user._id}`);
      return response.data;
    },
  });

  const [revenueData, setRevenueData] = useState([]);
  const [totalRevenueAllGigs, setTotalRevenueAllGigs] = useState(0);
  const [monthlyEarnings, setMonthlyEarnings] = useState([]);

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        const { data } = await newRequest.get("/orders/seller-revenue");

        // Set the revenue data and total revenue
        setRevenueData(data.revenueData);
        setTotalRevenueAllGigs(data.totalRevenueAllGigs);

        // Set the monthly earnings
        const monthlyEarnings = data.monthlyEarnings.map((entry) => ({
          month: entry.month,
          totalRevenue: parseFloat(entry.totalRevenue), // Ensure it's in numeric format
        }));

        setMonthlyEarnings(monthlyEarnings); // Update state
      } catch (error) {
        console.error("Error fetching revenue data:", error);
      }
    };

    fetchRevenueData();
  }, []);

  // const getMonthlyEarnings = (revenueData) => {
  //   if (!revenueData || !Array.isArray(revenueData)) {
  //     return []; // Ensure there's an array to process
  //   }

  //   return revenueData.map((entry) => ({
  //     month: entry.month,
  //     totalRevenue: parseFloat(entry.totalRevenue), // Ensure revenue is in numeric format
  //   }));
  // };

  // Bar Chart Data (Revenue per Gig)
  const barChartData = {
    labels: revenueData.map((gig) => gig.title),
    datasets: [
      {
        label: "Revenue per Gig",
        data: revenueData.map((gig) => gig.totalRevenue),
        backgroundColor: "rgba(0, 128, 0, 0.9)", // Thick Green
        borderColor: "rgba(0, 100, 0, 1)", // Darker Green Border
        borderWidth: 4,
      },
    ],
  };

  const lineChartData = {
    labels: monthlyEarnings.map((entry) => entry.month), // Using months from monthlyEarnings
    datasets: [
      {
        label: "Monthly Earnings",
        data: monthlyEarnings.map((entry) => convertPrice(entry.totalRevenue)), // Convert earnings to seller's currency
        borderColor: "rgba(0, 128, 255, 0.9)", // Bright Blue
        backgroundColor: "rgba(0, 128, 255, 0.2)", // Light Blue (filled area)
        borderWidth: 3,
        pointBackgroundColor: "rgba(0, 128, 255, 1)", // Point color
        pointBorderColor: "#fff",
        pointRadius: 5,
        tension: 0.3, // Smooth curve
      },
    ],
  };

  // Fetch revenue data from backend
  // const fetchRevenueData = async () => {
  //   try {
  //     const { data } = await newRequest.get("/orders/seller-revenue"); // Assuming endpoint provides the revenue data
  //     const monthlyEarnings = getMonthlyEarnings(data.monthlyEarnings);

  //     // Set the monthly earnings data for the chart
  //     setRevenueData(monthlyEarnings);
  //     setTotalRevenueAllGigs(data.totalRevenueAllGigs);

  //     // You can now proceed with the line chart data

  //   } catch (error) {
  //     console.error("Error fetching revenue data:", error);
  //   }
  // };

  // Pie Chart Data (Total Revenue for all Gigs)
  const DoughnutChartData = {
    labels: revenueData.map((gig) => gig.title),
    datasets: [
      {
        data: revenueData.map((gig) => gig.totalRevenue),
        backgroundColor: [
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#4BC0C0",
          "#9966FF",
          "#FF9F40",
        ],
      },
    ],
  };

  // Handle Profile Editing
  const handleEdit = () => navigate("/seller/profile-edit"); // Navigate to profile-edit page

  // Loading and Error Handling
  if (userLoading || gigsLoading || ordersLoading) {
    return <div>Loading...</div>;
  }

  if (userError || gigsError || ordersError) {
    return <div>Error loading data. Please try again later.</div>;
  }

  return (
    <div className="min-h-screen p-6 flex flex-col gap-5 items-center">
      {/* Profile Section */}
      <motion.div className="border rounded-lg shadow-md p-6 bg-white w-full mx-auto">
        <h2 className="text-2xl font-semibold mb-4">Profile</h2>
        <div className="flex flex-wrap gap-6">
          <img
            src={
              user?.img ||
              "https://miamistonesource.com/wp-content/uploads/2018/05/no-avatar-25359d55aa3c93ab3466622fd2ce712d1.jpg"
            }
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover"
          />
          <div className="w-full sm:w-2/3">
            <p>
              <strong>Bio:</strong> {user.desc}
            </p>
            <p>
              <strong>Phone:</strong> {user.phone}
            </p>
            <p>
              <strong>Country:</strong> {user.country}
            </p>
            <p>
              <strong>Years of Experience:</strong> {user.yearsOfExperience}
            </p>
            <p>
              <strong>Language(s):</strong>{" "}
              {user.languages && user.languages.length > 0
                ? user.languages.map((lang, index) => (
                    <span key={index} className="text-gray-600 ml-2">
                      {lang}
                    </span>
                  ))
                : "No Languages To Display"}
            </p>
            <button
              onClick={handleEdit}
              className="text-green-500 mt-4 hover:underline"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div className="bg-white p-4 shadow-md rounded-lg w-full mx-auto mt-6">
        <h3 className="text-lg font-semibold mb-2">Revenue Per Gig</h3>
        <Bar data={barChartData} />
      </motion.div>

      {/* Pie Chart */}
      <motion.div className="bg-white p-4 shadow-md rounded-lg w-full mx-auto mt-6">
        <h3 className="text-lg font-semibold mb-2">
          Total Revenue Distribution:{" "}
          <span>
            {currencySymbol}{" "}
            {new Intl.NumberFormat().format(totalRevenueAllGigs)}
          </span>
        </h3>
        <div className="w-full flex justify-center items-center">
          <Pie
            className="w-full h-[200px] sm:h-[250px] md:h-[300px]"
            data={DoughnutChartData}
          />
        </div>
      </motion.div>

      {/* Line Chart */}
      <motion.div className="bg-white p-4 shadow-md rounded-lg w-full mx-auto mt-6">
        <h3 className="text-lg font-semibold mb-2">Monthly Earnings</h3>
        <Line data={lineChartData} />
      </motion.div>
      {/* Gigs Section */}
      <motion.div className="bg-white shadow-md mt-8 w-full sm:w-4/5">
        <h2 className="text-2xl font-semibold mb-4">Your Gigs</h2>
        {gigsLoading ? (
          <p>Loading gigs...</p>
        ) : gigs && gigs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gigs.map((gig) => (
              <div
                key={gig._id}
                className="border rounded-lg shadow-md p-4 bg-gray-100"
              >
                <span>
                  <p className="text-sm font-bold">Gig Title:</p>{" "}
                  <h3 className="font-semibold text-lg">{gig.title}</h3>
                </span>
                <img
                  src={gig.cover}
                  className="h-72 w-full object-cover rounded-lg"
                  alt=""
                />
                <span>
                  <p className="text-sm font-bold">Service Title:</p>
                  <h3 className="font-semibold text-lg">{gig.shortTitle}</h3>
                </span>
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
            ))}
          </div>
        ) : (
          <p>No gigs available.</p>
        )}
      </motion.div>
      <motion.div className="border rounded-lg shadow-md p-6 bg-white w-full mx-auto">
        <h2 className="text-2xl font-semibold mb-4">Completed Orders</h2>
        {ordersLoading ? (
          <p>Loading completed orders...</p>
        ) : ordersError ? (
          <p>Error loading completed orders.</p>
        ) : orders && orders.sellerOrders?.length > 0 ? ( // Ensure orders exists
          <div className="space-y-4">
            {orders.sellerOrders.map((order) => (
              <div key={order._id} className="border-b pb-4">
                <p>
                  <strong>Order ID:</strong> {order._id}
                </p>
                <p>
                  <strong>Total:</strong>{" "}
                  {new Intl.NumberFormat().format(convertPrice(order.price))}{" "}
                  {countryCurrency}
                </p>
                <p>
                  <strong>Status:</strong>{" "}
                  {order.isCompleted ? "Completed" : "Pending"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p>No completed orders yet.</p>
        )}
      </motion.div>
    </div>
  );
};

export default SellerDashboard;
