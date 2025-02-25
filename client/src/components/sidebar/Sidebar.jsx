import React, { useChat } from "../../context/chatContext";

const Sidebar = () => {
  const { conversations, setActiveChat, user } = useChat();

  return (
    <div className="w-1/3 h-full border-r border-gray-300 bg-white">
      <div className="p-4 text-lg font-semibold border-b">Chats</div>
      <div>
        {conversations.map((conv) => {
          const otherUser = conv.participants.find((p) => p._id !== user?._id);
          return (
            <div
              key={conv._id}
              className="p-4 border-b cursor-pointer hover:bg-gray-100"
              onClick={() => setActiveChat(conv)}
            >
              <div className="font-semibold">{otherUser.username}</div>
              <img src={otherUser.img} alt="" />
              <div className="text-sm text-gray-500">
                {conv.lastMessage?.message || "No messages yet"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Sidebar;
