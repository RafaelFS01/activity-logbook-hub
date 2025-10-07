import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
  };
  className?: string;
}

const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className
}: EmptyStateProps) => {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-12 text-center border rounded-lg bg-card shadow-sm",
      className
    )}>
      {Icon && (
        <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      )}

      <h3 className="text-xl font-semibold mb-2">
        {title}
      </h3>

      <p className="text-muted-foreground mb-6 max-w-md">
        {description}
      </p>

      {action && (
        <Button
          variant={action.variant || "default"}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
