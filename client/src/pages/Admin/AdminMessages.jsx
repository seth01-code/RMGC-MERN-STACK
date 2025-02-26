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
      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
        Client & Service Provider Conversations
      </h1>

      <div className="w-full max-w-4xl bg-white shadow-lg rounded-lg overflow-hidden">
        <ul className="divide-y divide-gray-200">
          {conversations.length > 0 ? (
            conversations.map((conversation) => {
              const client = conversation.participants[0];
              const provider = conversation.participants[1];
              const lastMessage = getLastMessageDisplay(
                conversation.lastMessage
              );

              return (
                <li
                  key={conversation._id}
                  onClick={() => {
                    setSelectedConversation(conversation._id);
                    navigate(`/admin/messages/${conversation._id}`);
                  }}
                  className="flex flex-col md:flex-row items-center p-4 cursor-pointer hover:bg-gray-50 transition duration-200"
                >
                  {/* Client Section */}
                  <div className="flex items-center space-x-4 w-full md:w-1/2">
                    <img
                      src={client.img || "/default-avatar.png"}
                      alt={client.username}
                      className="w-12 h-12 rounded-full border border-gray-300 shadow-sm"
                    />
                    <div className="flex flex-col">
                      <p className="font-semibold text-gray-800">
                        {client.username}
                      </p>
                      <p className="text-sm text-gray-500">Client</p>
                    </div>
                  </div>

                  {/* Service Provider Section */}
                  <div className="flex items-center space-x-4 w-full md:w-1/2 mt-3 md:mt-0">
                    <img
                      src={provider.img || "/default-avatar.png"}
                      alt={provider.username}
                      className="w-12 h-12 rounded-full border border-gray-300 shadow-sm"
                    />
                    <div className="flex flex-col">
                      <p className="font-semibold text-gray-800">
                        {provider.username}
                      </p>
                      <p className="text-sm text-gray-500">Service Provider</p>
                    </div>
                  </div>

                  {/* Last Message & Arrow */}
                  <div className="flex justify-between items-center w-full md:w-auto mt-3 md:mt-0 md:ml-auto">
                    <p className="text-sm text-gray-600 truncate max-w-[180px] md:max-w-[250px]">
                      {lastMessage}
                    </p>
                    <FaChevronRight className="text-gray-400 ml-4 hidden md:block" />
                  </div>
                </li>
              );
            })
          ) : (
            <li className="p-6 text-center text-gray-500">
              No conversations yet.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default AdminMessages;
