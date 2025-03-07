
import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateInputProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  dateFormat?: string;
  label?: string;
  error?: string;
}

export function DateInput({
  value,
  onChange,
  placeholder = "Selecione uma data",
  className,
  disabled = false,
  dateFormat = "dd/MM/yyyy",
  label,
  error,
}: DateInputProps) {
  const [inputValue, setInputValue] = React.useState<string>(
    value ? format(value, dateFormat) : ""
  );
  const [open, setOpen] = React.useState(false);

  // Update input when value changes from parent
  React.useEffect(() => {
    if (value) {
      setInputValue(format(value, dateFormat));
    } else {
      setInputValue("");
    }
  }, [value, dateFormat]);

  // Handle manual input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Try to parse the date
    if (newValue) {
      try {
        const parsedDate = parse(newValue, dateFormat, new Date());
        // Only update if the date is valid
        if (isValid(parsedDate)) {
          onChange(parsedDate);
        }
      } catch (error) {
        // Invalid date format, do nothing
      }
    } else {
      // Empty input, set value to undefined
      onChange(undefined);
    }
  };

  // Handle calendar selection
  const handleCalendarSelect = (date: Date | undefined) => {
    onChange(date);
    setOpen(false);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <div className="text-sm font-medium">{label}</div>}
      <div className="relative flex items-center">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-10"
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 py-2"
              disabled={disabled}
              onClick={() => setOpen(true)}
              type="button"
            >
              <CalendarIcon className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleCalendarSelect}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
