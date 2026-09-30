import { redirect } from 'next/navigation';

// The roster moved to the coach home — keep old links and bookmarks working
export default function ClientsPage() {
  redirect('/coach');
}
