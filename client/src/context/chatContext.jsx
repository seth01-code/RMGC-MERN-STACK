// import React, { createContext, useContext, useEffect, useState } from "react";
// import { socket } from "../utils/socket.js"; // Import WebSocket utility
// import newRequest from "../utils/newRequest.js"; // Axios instance

// const ChatContext = createContext();

// export const ChatProvider = ({ children }) => {
//   const [user, setUser] = useState(null);
//   const [conversations, setConversations] = useState([]);
//   const [messages, setMessages] = useState([]);
//   const [selectedChat, setSelectedChat] = useState(null);
//   const [onlineUsers, setOnlineUsers] = useState([]);

//   // Fetch logged-in user
//   useEffect(() => {
//     const fetchUser = async () => {
//       try {
//         const res = await newRequest.get("/users");
//         setUser(res.data);
//         socket.emit("join", res.data._id); // Notify backend of online status
//       } catch (err) {
//         console.log("User not logged in");
//       }
//     };
//     fetchUser();
//   }, []);

//   // Fetch user's conversations
//   useEffect(() => {
//     if (user) {
//       const fetchConversations = async () => {
//         try {
//           const res = await newRequest.get("/conversations");
//           setConversations(res.data);
//         } catch (err) {
//           console.error(err);
//         }
//       };
//       fetchConversations();
//     }
//   }, [user]);

//   // Listen for incoming messages
//   useEffect(() => {
//     socket.on("receiveMessage", (message) => {
//       setMessages((prev) => [...prev, message]);
//     });

//     socket.on("updateOnlineUsers", (users) => {
//       setOnlineUsers(users);
//     });

//     return () => {
//       socket.off("receiveMessage");
//       socket.off("updateOnlineUsers");
//     };
//   }, []);

//   return (
//     <ChatContext.Provider
//       value={{
//         user,
//         conversations,
//         messages,
//         selectedChat,
//         setSelectedChat,
//         onlineUsers,
//         setMessages,
//       }}
//     >
//       {children}
//     </ChatContext.Provider>
//   );
// };

// export const useChat = () => useContext(ChatContext);
