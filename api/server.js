import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import userRoute from "./routes/UserRoute.js";
import authRoute from "./routes/authRoute.js";
import gigRoute from "./routes/GigRoute.js";
import orderRoute from "./routes/OrderRoute.js";
import conversationRoute from "./routes/ConversationRoute.js";
import messageRoute from "./routes/MessageRoute.js";
import reviewRoute from "./routes/ReviewRoute.js";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();
dotenv.config();
const port = 3000;

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1); // Exit if connection fails
  }
};

app.use(cors({ origin: "http://localhost:5173", credentials: true })); // Middleware to parse JSON
app.use(express.json()); // Middleware to parse JSON
app.use(cookieParser()); // Middleware to parse JSON

app.use("/api/users", userRoute); // Use the user routes
app.use("/api/auth", authRoute); // Use the auth routes
app.use("/api/gigs", gigRoute); // Use the gig routes
app.use("/api/orders", orderRoute); // Use the order routes
app.use("/api/conversations", conversationRoute); // Use the convo routes
app.use("/api/messages", messageRoute); // Use the message routes
app.use("/api/reviews", reviewRoute); // Use the review routes

app.use((err, req, res, next) => {
  const errorStatus = err.status || 500;
  const errorMessage = err.message || "Something went Wrong";

  return res.status(errorStatus).send(errorMessage);
});

app.get("/", (req, res) => res.send("Hello World!"));

app.listen(port, () => {
  connect();
  console.log(`Example app listening on port ${port}!`);
});
