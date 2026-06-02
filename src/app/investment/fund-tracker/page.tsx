import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function FundTrackerPage() {
    redirect('/investment/consensus-signal?tab=watchlist');
}
