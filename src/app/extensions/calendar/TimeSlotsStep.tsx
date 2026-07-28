import { format } from "date-fns";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

import type { TimeSelection } from "./EventModal";

function toTimeInputValue(date: Date) {
  return format(date, "HH:mm");
}

function applyTimeInput(date: Date, timeStr: string) {
  const [h, m] = timeStr.split(":").map(Number);
  const next = new Date(date);
  next.setHours(h, m, 0, 0);
  return next;
}

export default function TimeSlotsStep({
  isAllDay,
  onAllDayChange,
  timeSelections,
  onTimeSelectionsChange,
  isIndeterminate,
}: {
  isAllDay: boolean;
  onAllDayChange: (v: boolean) => void;
  timeSelections: TimeSelection[];
  onTimeSelectionsChange: (selections: TimeSelection[]) => void;
  isIndeterminate: boolean;
}) {
  const handleMasterAllDayChange = (checked: boolean) => {
    onAllDayChange(checked);
    onTimeSelectionsChange(
      timeSelections.map((ts) => {
        const startTime = new Date(ts.date);
        const endTime = new Date(ts.date);
        if (checked) {
          startTime.setHours(0, 1, 0, 0);
          endTime.setHours(23, 59, 0, 0);
        } else {
          startTime.setHours(9, 0, 0, 0);
          endTime.setHours(17, 0, 0, 0);
        }
        return { ...ts, isAllDay: checked, startTime, endTime };
      })
    );
  };

  const handleAllDayToggle = (index: number, checked: boolean) => {
    const next = [...timeSelections];
    const startTime = new Date(next[index].date);
    const endTime = new Date(next[index].date);
    if (checked) {
      startTime.setHours(0, 1, 0, 0);
      endTime.setHours(23, 59, 0, 0);
    } else {
      startTime.setHours(9, 0, 0, 0);
      endTime.setHours(17, 0, 0, 0);
    }
    next[index] = { ...next[index], isAllDay: checked, startTime, endTime };
    onTimeSelectionsChange(next);
  };

  return (
    <div>
      <label className="mb-4 flex items-center gap-2 text-sm">
        <Checkbox checked={isAllDay} onCheckedChange={(c) => handleMasterAllDayChange(!!c)} data-indeterminate={isIndeterminate} />
        All Day Event (Master Switch)
      </label>

      <div className="max-h-[350px] overflow-y-auto rounded-lg ring-1 ring-foreground/10">
        <table className="w-full table-auto">
          <thead className="sticky top-0 z-10 bg-muted/60">
            <tr>
              <th className="p-2 text-left text-sm font-semibold">Date</th>
              <th className="p-2 text-left text-sm font-semibold">Start Time</th>
              <th className="p-2 text-left text-sm font-semibold">End Time</th>
              <th className="p-2 text-center text-sm font-semibold">All Day</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {timeSelections.map((selection, index) => (
              <tr key={index} className="hover:bg-muted/40">
                <td className="p-2 text-sm">{format(selection.date, "yyyy-MM-dd")}</td>
                <td className="p-1.5">
                  <Input
                    type="time"
                    value={toTimeInputValue(selection.startTime)}
                    disabled={selection.isAllDay}
                    onChange={(e) => {
                      const next = [...timeSelections];
                      next[index] = {
                        ...next[index],
                        startTime: applyTimeInput(next[index].startTime, e.target.value),
                        isAllDay: false,
                      };
                      onTimeSelectionsChange(next);
                    }}
                  />
                </td>
                <td className="p-1.5">
                  <Input
                    type="time"
                    value={toTimeInputValue(selection.endTime)}
                    disabled={selection.isAllDay}
                    onChange={(e) => {
                      const next = [...timeSelections];
                      next[index] = {
                        ...next[index],
                        endTime: applyTimeInput(next[index].endTime, e.target.value),
                        isAllDay: false,
                      };
                      onTimeSelectionsChange(next);
                    }}
                  />
                </td>
                <td className="text-center">
                  <Checkbox checked={selection.isAllDay} onCheckedChange={(c) => handleAllDayToggle(index, !!c)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
