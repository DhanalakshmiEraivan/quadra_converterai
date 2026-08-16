// ============================================================
// FILE:
// src/lib/usage.ts
// REPLACE THE ENTIRE FILE
// ============================================================

import { supabase } from '@/lib/supabase';

export interface UsageStatus {
  plan:
    | 'free'
    | 'starter'
    | 'pro'
    | 'business'
    | 'anonymous';

  free_remaining: number;

  unlimited: boolean;

  expires_at: string | null;

  allowed?: boolean;
}

export interface ConversionReservation {
  allowed: boolean;
  unlimited: boolean;
  remaining: number;
  plan: string;
  message?: string;
}

export async function getUsageStatus(): Promise<UsageStatus> {
  const {
    data,
    error,
  } = await supabase.rpc('get_usage_status');

  if (error) {
    throw new Error(error.message);
  }

  return data as UsageStatus;
}

/*
 * IMPORTANT:
 *
 * Do not call canUseConversion() before consumeConversion().
 *
 * consumeConversion() is now atomic and performs:
 *
 * check -> lock -> reserve
 *
 * in one database transaction.
 */
export async function consumeConversion(): Promise<ConversionReservation> {
  const {
    data,
    error,
  } = await supabase.rpc('consume_conversion');

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(
      'Unable to reserve a conversion credit.'
    );
  }

  return data as ConversionReservation;
}

export async function refundConversion() {
  const {
    data,
    error,
  } = await supabase.rpc('refund_conversion');

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
