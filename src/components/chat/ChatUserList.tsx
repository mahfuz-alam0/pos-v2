import UserCell from "./UserCell";

export default function ChatUserList({ chatUsers, selectedUser, onSelectUser }) {
  return (
    <div>
      {chatUsers?.map((user, index) => (
        <UserCell key={user._id || user.session_id || index} user={user} selectedUser={selectedUser} onSelectUser={onSelectUser} />
      ))}
    </div>
  );
}
