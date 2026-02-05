import { CheckIn } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface LastCheckInSnippetProps {
  checkIn: CheckIn;
  clientName: string;
}

export function LastCheckInSnippet({ checkIn, clientName }: LastCheckInSnippetProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-3">
        <div className="flex items-start gap-3">
          <MessageCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1">
              {clientName}'s last check-in · {formatDistanceToNow(new Date(checkIn.date), { addSuffix: true })}
            </p>
            <p className="text-sm italic line-clamp-2">
              "{checkIn.notes}"
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
