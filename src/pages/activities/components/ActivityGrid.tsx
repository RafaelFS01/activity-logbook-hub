import { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ActivityGridProps {
  children: ReactNode;
  isLoading?: boolean;
  className?: string;
}

const ActivityGridSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
    {[...Array(6)].map((_, index) => (
      <Card key={index} className="overflow-hidden">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-3/5 mb-1" />
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-6 w-20 mt-2" />
        </CardHeader>
        <CardContent className="space-y-2 pb-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
        <div className="px-5 pb-4">
          <Skeleton className="h-8 w-full" />
        </div>
      </Card>
    ))}
  </div>
);

const ActivityGrid = ({ children, isLoading = false, className }: ActivityGridProps) => {
  return (
    <div className={cn("w-full", className)}>
      {isLoading ? (
        <ActivityGridSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {children}
        </div>
      )}
    </div>
  );
};

export default ActivityGrid;
