import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ListError({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 py-8 text-center">
      <p className="text-sm text-red-600">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Yeniden dene
        </Button>
      )}
    </Card>
  );
}
