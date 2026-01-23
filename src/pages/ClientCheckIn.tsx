import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { storage } from '@/lib/storage';

export default function ClientCheckIn() {
  const { clientId } = useParams();
  const navigate = useNavigate();

  const appState = storage.get();
  const client = appState?.clients.find(c => c.id === clientId);
  const checkIn = appState?.checkIns?.find(c => c.clientId === clientId && c.status === 'pending');

  const clientName = client?.name || "Client";

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/coach')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>

          <h1 className="text-3xl font-bold text-gray-900">
            Check-in for {clientName}
          </h1>
          <p className="text-gray-600 mt-2">
            Review and respond to client check-in
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center text-gray-500">
            <p className="text-lg">Check-in page content coming soon...</p>
            <div className="mt-4 text-sm space-y-1">
              <p>Client: {client?.avatar} {clientName}</p>
              {checkIn && (
                <>
                  <p>Check-in submitted: {new Date(checkIn.date).toLocaleDateString()}</p>
                  {checkIn.notes && <p className="mt-2 italic">"{checkIn.notes}"</p>}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
