'use client';

import { PricingRulesAdmin } from '../../components/admin/PricingRulesAdmin';

// Force dynamic rendering for admin pages
export const dynamic = 'force-dynamic';

export default function PricingRulesPage() {
  return <PricingRulesAdmin />;
}