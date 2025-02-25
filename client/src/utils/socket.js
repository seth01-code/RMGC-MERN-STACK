// src/utils/socket.js
import { io } from "socket.io-client";

const socket = io("http://localhost:3000"); // Connect to your server
export default socket;
