import { useSelector } from "react-redux";
import SentMessageCell from "./SentMessageCell";
import ReceivedMessageCell from "./ReceivedMessageCell";

export default function Conversation({ chats }) {
  const { userRole } = useSelector((state: any) => state.chat);

  const isSentByMe = (chat) => (userRole === "admin" ? !!chat.adminId : !!chat.userId);

  return (
    <div className="flex flex-col gap-4">
      {chats.map((chat, index) => {
        const key = chat._id || `msg-${index}`;
        return isSentByMe(chat) ? (
          <SentMessageCell key={key} conversation={chat} />
        ) : (
          <ReceivedMessageCell key={key} conversation={chat} />
        );
      })}
    </div>
  );
}
