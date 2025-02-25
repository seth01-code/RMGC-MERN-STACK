// src/utils/socket.js
import { io } from "socket.io-client";

const socket = io("https://rmgc-mern-stack-6.onrender.com"); // Connect to your server
export default socket;
