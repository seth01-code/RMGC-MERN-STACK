import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import Message from "./models/messageModel.js";
import Conversation from "./models/conversationModel.js";
import prerender from "prerender-node";

// Models
import User from "./models/userModel.js";

// Initialize express app
const app = express();
dotenv.config();
const port = 4000;

// Create an HTTP server and attach Express
const server = createServer(app);

// Prerender.io Middleware
prerender.set("prerenderToken", "VN3i1Er0OnKphdok5ICr"); // Replace with your token
app.use(prerender);

// Initialize Socket.io
export const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000", // <--- add this
      "https://www.renewedmindsglobalconsult.com",
      "https://renewedmindsglobalconsult.com",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Get current directory using import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to MongoDB
const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

// Set up CORS
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://www.renewedmindsglobalconsult.com",
      "https://renewedmindsglobalconsult.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  })
);
app.options("*", cors());

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  "/uploads/audio",
  express.static(path.join(__dirname, "uploads/audio"))
);

// Set up express-session
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);

// Initialize Passport and restore authentication state
app.use(passport.initialize());
app.use(passport.session());

// Google OAuth Passport Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails[0].value });

        if (!user) {
          user = new User({
            username: profile.displayName,
            email: profile.emails[0].value,
            country: "Unknown",
            password: "",
            img: profile.photos[0].value,
          });

          await user.save();
        } else {
          user.profilePicture = profile.photos[0].value;
          await user.save();
        }

        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Authentication Routes
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.cookie("currentUser", JSON.stringify(req.user), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.redirect("https://rmgc-mern-stack-7.onrender.com");
  }
);

app.get("/user", (req, res) => {
  res.send(req.user);
});

// Import Routes
import userRoute from "./routes/UserRoute.js";
import authRoute from "./routes/authRoute.js";
import gigRoute from "./routes/GigRoute.js";
import orderRoute from "./routes/OrderRoute.js";
import conversationRoute from "./routes/ConversationRoute.js";
import messageRoute from "./routes/MessageRoute.js";
import reviewRoute from "./routes/ReviewRoute.js";
import sellerRoutes from "./routes/sellerRoutes.js";
import exchangeRateRoute from "./routes/exchangeRoute.js";
import paymentRoute from "./routes/paymentRoute.js";

app.use("/api/users", userRoute);
app.use("/api/auth", authRoute);
app.use("/api/gigs", gigRoute);
app.use("/api/orders", orderRoute);
app.use("/api/conversations", conversationRoute);
app.use("/api/messages", messageRoute);
app.use("/api/reviews", reviewRoute);
app.use("/api", exchangeRateRoute);
app.use("/api/sellers", sellerRoutes);
app.use("/api/payments", paymentRoute);

// Global error handling middleware
app.use((err, req, res, next) => {
  const errorStatus = err.status || 500;
  const errorMessage = err.message || "Something went wrong";
  return res.status(errorStatus).send(errorMessage);
});

app.get("/", (req, res) => res.send("Hello World!"));

// Socket.io for real-time messaging
let onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);

  // Add user to online users
  socket.on("join", (userId) => {
    if (userId) {
      onlineUsers.set(userId, socket.id);
      console.log("✅ User joined:", userId);
      io.emit("updateOnlineUsers", Array.from(onlineUsers.keys()));
      io.emit("onlineStatus", { userId, status: "online" }); // Emit online status
    }
  });

  // Handle sending messages (text, emoji, audio, file attachments)
  socket.on(
    "sendMessage",
    ({ senderId, receiverId, text, media, fileUrl, conversationId }) => {
      const receiverSocketId = onlineUsers.get(receiverId);

      const messageData = {
        senderId,
        text,
        media,
        fileUrl,
        conversationId,
        messageStatus: "sent",
      };

      if (receiverSocketId) {
        messageData.status = "delivered";
        io.to(receiverSocketId).emit("receiveMessage", messageData);
      }
    }
  );

  // Message seen
  socket.on("messageSeen", async ({ senderId, messageId, conversationId }) => {
    try {
      const message = await Message.findByIdAndUpdate(
        messageId,
        { status: "seen" },
        { new: true }
      );

      if (!message) return;

      // Update last message in the conversation
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: {
          text: message.text || "",
          mediaType: message.mediaType || "text",
        },
      });

      // Notify sender that the message has been seen
      io.to(onlineUsers.get(senderId)).emit("messageSeen", {
        messageId,
        conversationId,
        text: message.text,
        mediaType: message.mediaType,
      });
    } catch (error) {
      console.error("Error updating message status:", error);
    }
  });

  // Message reactions
  socket.on("reactToMessage", ({ messageId, reaction }) => {
    io.emit("updateMessageReaction", { messageId, reaction });
  });

  // Handle calling functionality
  socket.on("startCall", ({ callerId, receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("incomingCall", { callerId });
    }
  });

  socket.on("endCall", ({ callerId, receiverId }) => {
    const receiverSocketId = onlineUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("callEnded", { callerId });
    }
  });

  // Handle user disconnect
  socket.on("disconnect", () => {
    onlineUsers.forEach((value, key) => {
      if (value === socket.id) {
        io.emit("onlineStatus", { userId: key, status: "offline" }); // Emit offline status
        onlineUsers.delete(key);
      }
    });
    console.log("❌ User disconnected:", socket.id);
  });
});

// Start the server with Socket.io
server.listen(port, () => {
  connect();
  console.log(`🚀 Server is listening on port ${port}`);
});
