interface Task {
  title: string;
  description?: string;
  tags?: { name: string; colorCode?: string }[];
  taskStatus?: { displayName: string; colorCode?: string };
  taskPriority?: { displayName: string; colorCode?: string };
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex w-full items-center justify-between gap-4">
      <p className="w-2/5 shrink-0 text-sm text-muted-foreground">{label}</p>
      <div className="w-3/5 truncate text-sm">{value}</div>
    </div>
  );
}

export default function TaskDetailsPanel({ selectedTask }: { selectedTask: Task | null | undefined }) {
  if (!selectedTask) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl p-4 ring-1 ring-foreground/10">
      <DetailRow label="Title:" value={selectedTask.title} />

      {selectedTask.tags && selectedTask.tags.length > 0 && (
        <DetailRow
          label="Associated Tags:"
          value={
            <div className="flex flex-wrap gap-1.5">
              {selectedTask.tags.map((tag, index) => (
                <span
                  key={index}
                  className="rounded-full px-2.5 py-1 text-xs text-white"
                  style={{ backgroundColor: tag.colorCode }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          }
        />
      )}

      <DetailRow label="Description:" value={selectedTask.description} />

      <DetailRow
        label="Status:"
        value={
          <span
            className="inline-block w-fit rounded-full px-2.5 py-1 text-xs text-white"
            style={{ backgroundColor: selectedTask.taskStatus?.colorCode }}
          >
            {selectedTask.taskStatus?.displayName}
          </span>
        }
      />

      <DetailRow
        label="Priority:"
        value={
          <span
            className="inline-block w-fit rounded-full px-2.5 py-1 text-xs text-white"
            style={{ backgroundColor: selectedTask.taskPriority?.colorCode }}
          >
            {selectedTask.taskPriority?.displayName}
          </span>
        }
      />
    </div>
  );
}
