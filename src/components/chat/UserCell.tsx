import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export default function UserCell({ user, selectedUser, onSelectUser }) {
  const sessionId = user._id || user.session_id;
  const isSelected = (selectedUser?._id || selectedUser?.session_id) === sessionId;
  const isOnline = !user.isClosed;
  const userData = user.userMetaData || {};
  const displayName = user.type === "BUG_REPORT" ? user.title || "Untitled Report" : userData.name || "Unknown User";

  return (
    <div
      className={cn(
        "flex cursor-pointer items-center border-b border-foreground/10 px-4 py-3 transition-colors hover:bg-muted",
        isSelected && "border-l-4 border-l-primary bg-muted"
      )}
      onClick={() => onSelectUser(user)}
    >
      <div className="mr-3 shrink-0">
        <Avatar size="lg">
          <AvatarImage src={userData.avatar} alt={displayName} />
          <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
          {isOnline && <AvatarBadge className="bg-green-500" />}
        </Avatar>
      </div>

      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="mb-1 flex items-center justify-between">
          <h4 className="truncate text-base font-medium text-foreground">{displayName}</h4>
          <span className="ml-2 shrink-0 text-xs text-muted-foreground">
            {user?.updatedAt ? formatDistanceToNow(new Date(user.updatedAt), { addSuffix: true }) : ""}
          </span>
        </div>
        <p className="m-0 flex-1 truncate text-sm text-muted-foreground">
          {user?.recentMessage?.content || "No messages yet"}
        </p>
      </div>
    </div>
  );
}
