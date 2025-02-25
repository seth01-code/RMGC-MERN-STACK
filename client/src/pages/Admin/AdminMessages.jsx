import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import newRequest from "../../utils/newRequest";
import { useNavigate } from "react-router-dom";
import {
  FaChevronRight,
  FaMicrophone,
  FaFileAlt,
  FaCamera,
  FaVideo,
  FaPaperclip,
} from "react-icons/fa";

const AdminMessages = () => {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const navigate = useNavigate();

  // Fetch all conversations (Admin Route)
  const {
    data: conversations,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: () => newRequest.get("/conversations").then((res) => res.data),
  });

  if (isLoading) return <p>Loading conversations...</p>;
  if (error)
    return (
      <p className="text-red-500">
        Error fetching conversations: {error.message}
      </p>
    );

  // Function to determine message type and assign icon + label
  const getLastMessageDisplay = (message) => {
    if (!message) return "No messages yet";

    const { mediaType, text } = message;

    const mediaIcons = {
      audio: (
        <>
          <FaMicrophone className="inline text-blue-500" /> Voice
        </>
      ),
      document: (
        <>
          <FaFileAlt className="inline text-green-500" /> Document
        </>
      ),
      image: (
        <>
          <FaCamera className="inline text-purple-500" /> Photo
        </>
      ),
      video: (
        <>
          <FaVideo className="inline text-red-500" /> Video
        </>
      ),
      file: (
        <>
          <FaPaperclip className="inline text-gray-500" /> File
        </>
      ),
    };

    return mediaIcons[mediaType] || text || "No messages yet";
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen flex flex-col items-center">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Client/S.P Conversations
      </h1>
      <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg p-4">
        <ul className="divide-y divide-gray-200">
          {conversations.map((conversation) => {
            const client = conversation.participants[0];
            const provider = conversation.participants[1];
            const lastMessage = getLastMessageDisplay(conversation.lastMessage);

            return (
              <li
                key={conversation._id}
                onClick={() => {
                  setSelectedConversation(conversation._id);
                  navigate(`/admin/messages/${conversation._id}`);
                }}
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50 transition"
              >
                <div className="flex items-center space-x-4 w-full">
                  <img
                    src={client.img || "/default-avatar.png"}
                    alt={client.username}
                    className="w-10 h-10 rounded-full border"
                  />
                  <div className="w-1/3">
                    <p className="font-semibold text-gray-800">
                      {client.username}
                    </p>
                    <p className="text-sm text-gray-500">Client</p>
                  </div>

                  <img
                    src={provider.img || "/default-avatar.png"}
                    alt={provider.username}
                    className="w-10 h-10 rounded-full border"
                  />
                  <div className="w-1/3">
                    <p className="font-semibold text-gray-800">
                      {provider.username}
                    </p>
                    <p className="text-sm text-gray-500">Service Provider</p>
                  </div>

                  <div className="text-sm text-gray-600 truncate w-1/3 flex items-center space-x-2">
                    {lastMessage}
                  </div>
                </div>
                <FaChevronRight className="text-gray-500" />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default AdminMessages;
