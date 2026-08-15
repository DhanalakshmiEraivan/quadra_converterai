import { supabase } from '@/lib/supabase';


export interface UsageStatus {

  plan:
    | 'free'
    | 'starter'
    | 'pro'
    | 'business';

  free_remaining:
    number;

  unlimited:
    boolean;

  expires_at:
    string | null;

}


export async function getUsageStatus() {

  const {
    data,
    error,
  } =
    await supabase.rpc(
      'get_usage_status'
    );


  if (error) {

    throw new Error(
      error.message
    );

  }


  return data as UsageStatus;

}


export async function canUseConversion() {

  const {
    data,
    error,
  } =
    await supabase.rpc(
      'can_use_conversion'
    );


  if (error) {

    throw new Error(
      error.message
    );

  }


  return data;

}


export async function refundConversion() { const { data, error } = await supabase.rpc('refund_conversion'); if(error) throw new Error(error.message); return data; }

export async function consumeConversion() {

  const {
    data,
    error,
  } =
    await supabase.rpc(
      'consume_conversion'
    );


  if (error) {

    throw new Error(
      error.message
    );

  }


  return data;

}