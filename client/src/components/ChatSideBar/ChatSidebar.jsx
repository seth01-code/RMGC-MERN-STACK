import React, { useEffect, useState, useRef } from "react";
import newRequest from "../../utils/newRequest";
import { io } from "socket.io-client";
import {
  FaArrowLeft,
  FaTimes,
  FaCamera,
  FaFile,
  FaMicrophone,
  FaVideo,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const ChatSidebar = ({
  userId,
  selectConversation,
  isSidebarOpen,
  toggleSidebar,
}) => {
  const [conversations, setConversations] = useState([]);
  const socket = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    socket.current = io("http://localhost:3000");

    const fetchConversations = async () => {
      try {
        const { data } = await newRequest.get(`/conversations/${userId}`);
        setConversations(data);
      } catch (error) {
        console.error("Error fetching conversations:", error);
      }
    };

    fetchConversations();

    // Listen for message seen event and update last message
    socket.current.on("messageSeen", (seenMessage) => {
      setConversations((prevConversations) =>
        prevConversations.map((conv) =>
          conv._id === seenMessage.conversationId
            ? {
                ...conv,
                lastMessage: {
                  text: seenMessage.text,
                  mediaType: seenMessage.mediaType,
                },
              }
            : conv
        )
      );
    });

    return () => {
      socket.current.disconnect();
    };
  }, [userId]);

  const handleBackClick = () => {
    navigate("/");
  };

  const renderLastMessage = (lastMessage) => {
    if (!lastMessage) return "No messages yet";

    switch (lastMessage.mediaType) {
      case "image":
        return (
          <span className="flex items-center gap-2 text-gray-400">
            <FaCamera className="text-blue-500" /> Photo
          </span>
        );
      case "video":
        return (
          <span className="flex items-center gap-2 text-gray-400">
            <FaVideo className="text-green-500" /> Video
          </span>
        );
      case "audio":
        return (
          <span className="flex items-center gap-2 text-gray-400">
            <FaMicrophone className="text-purple-500" /> Voice
          </span>
        );
      case "document":
        return (
          <span className="flex items-center gap-2 text-gray-400">
            <FaFile className="text-red-500" /> Document
          </span>
        );
      default:
        return lastMessage.text || "No messages yet";
    }
  };

  return (
    <div
      className={`fixed z-20 inset-y-0 left-0 bg-black border-r border-gray-700 text-white transition-all duration-300
      ${isSidebarOpen ? "w-full sm:w-1/4 lg:w-1/3" : "w-0 sm:w-1/4 lg:w-1/3"}
      ${isSidebarOpen ? "block" : "hidden sm:block"}
    `}
    >
      {/* Header */}
      <div className="p-4 flex justify-between items-center h-0.5 bg-gray-800 border-b border-gray-700">
        <button
          onClick={handleBackClick}
          className="text-white text-lg flex items-center gap-2 hover:bg-gray-700 px-2 rounded-full"
        >
          <FaArrowLeft /> Back
        </button>
        <button
          onClick={toggleSidebar}
          className="sm:hidden text-white text-xl p-2"
        >
          <FaTimes />
        </button>
      </div>

      {/* Conversations */}
      <h2 className="text-xl font-semibold p-4">Chats</h2>
      <div className="overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="text-gray-400 p-4">No conversations found</p>
        ) : (
          conversations.map((conv) => {
            const otherParticipant = conv.otherParticipant;

            return (
              <div
                key={conv._id}
                className="p-3 cursor-pointer hover:bg-gray-800 rounded-md flex items-center gap-3 mb-2 transition duration-300 ease-in-out"
                onClick={() => {
                  if (window.innerWidth <= 768) {
                    selectConversation(conv);
                    toggleSidebar();
                  } else {
                    toggleSidebar();
                    setTimeout(() => {
                      selectConversation(conv);
                    }, 50);
                  }
                }}
              >
                {otherParticipant?.img && (
                  <img
                    src={otherParticipant.img}
                    alt={otherParticipant.username}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium text-lg">
                    {otherParticipant?.username || "Unknown"}
                  </p>
                  <p className="text-sm truncate">
                    {renderLastMessage(conv.lastMessage)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
