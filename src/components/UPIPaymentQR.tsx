import { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle2,
  Copy,
  Smartphone,
} from 'lucide-react';

import {
  PAYMENT_CONFIG,
  type PaidPlan,
} from '@/lib/payment-config';

import { supabase } from '@/lib/supabase';


interface Props {
  plan: PaidPlan;
  onSubmitted?: () => void;
}


export default function UPIPaymentQR({
  plan,
  onSubmitted,
}: Props) {

  const [utr, setUtr] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [submitted, setSubmitted] =
    useState(false);


  const selectedPlan =
    PAYMENT_CONFIG.plans[plan];


  /*
  |--------------------------------------------------------------------------
  | UPI payment URI
  |--------------------------------------------------------------------------
  */

  const upiUrl =
    useMemo(() => {

      const params =
        new URLSearchParams({

          pa:
            PAYMENT_CONFIG.upiId,

          pn:
            PAYMENT_CONFIG.merchantName,

          am:
            selectedPlan.amount.toFixed(2),

          cu:
            PAYMENT_CONFIG.currency,

          tn:
            `QuadraConverter ${selectedPlan.name}`,

        });


      return `upi://pay?${params.toString()}`;

    }, [
      selectedPlan,
    ]);


  const copyUPI =
    async () => {

      await navigator.clipboard.writeText(
        PAYMENT_CONFIG.upiId
      );

    };


  const submitPayment =
    async () => {

      setError(null);


      const cleanUTR =
        utr.trim();


      if (!cleanUTR) {

        setError(
          'Please enter the UTR / transaction ID after making the payment.'
        );

        return;

      }


      if (
        cleanUTR.length < 6
      ) {

        setError(
          'Please enter a valid UTR / transaction ID.'
        );

        return;

      }


      setLoading(true);


      try {

        const {
          data: {
            user
          }
        } =
          await supabase.auth.getUser();


        if (!user) {

          throw new Error(
            'Please login before making a payment.'
          );

        }


        /*
        |--------------------------------------------------------------------------
        | Create payment request
        |--------------------------------------------------------------------------
        */

        const {
          error: insertError
        } =
          await supabase
            .from('payment_requests')
            .insert({

              user_id:
                user.id,

              plan,

              amount:
                selectedPlan.amount,

              currency:
                'INR',

              status:
                'submitted',

              utr:
                cleanUTR,

              submitted_at:
                new Date().toISOString(),

            });


        if (insertError) {

          throw insertError;

        }


        setSubmitted(true);


        onSubmitted?.();

      } catch (err) {

        setError(

          err instanceof Error
            ? err.message
            : 'Could not submit payment.'

        );

      } finally {

        setLoading(false);

      }

    };


  if (submitted) {

    return (

      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">

        <CheckCircle2
          className="mx-auto h-14 w-14 text-emerald-600"
        />

        <h3 className="mt-4 text-2xl font-bold text-emerald-900">

          Payment Submitted

        </h3>

        <p className="mx-auto mt-2 max-w-md text-sm text-emerald-700">

          Your payment is waiting for verification.
          Your {selectedPlan.name} plan will be activated
          after the payment is verified.

        </p>

      </div>

    );

  }


  return (

    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">

      <div className="text-center">

        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50">

          <Smartphone
            className="h-6 w-6 text-indigo-600"
          />

        </div>


        <h2 className="mt-4 text-2xl font-bold text-slate-900">

          Pay ₹{selectedPlan.amount}

        </h2>


        <p className="mt-1 text-sm text-slate-500">

          {selectedPlan.name} Plan · 30 days

        </p>

      </div>


      <div className="mt-6 flex justify-center">

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">

          <QRCodeSVG
            value={upiUrl}
            size={240}
            level="H"
            includeMargin
          />

        </div>

      </div>


      <p className="mt-4 text-center text-sm font-medium text-slate-700">

        Scan this QR using Google Pay or PhonePe

      </p>


      <div className="mt-4 rounded-2xl bg-slate-50 p-4">

        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">

          UPI ID

        </p>


        <div className="mt-2 flex items-center justify-between gap-3">

          <code className="break-all text-sm font-semibold text-slate-900">

            {PAYMENT_CONFIG.upiId}

          </code>


          <button
            type="button"
            onClick={copyUPI}
            className="rounded-xl p-2 hover:bg-white"
            title="Copy UPI ID"
          >

            <Copy className="h-4 w-4" />

          </button>

        </div>

      </div>


      <div className="mt-6">

        <label className="text-sm font-semibold text-slate-800">

          UTR / Transaction ID

        </label>


        <input
          value={utr}
          onChange={(e) =>
            setUtr(e.target.value)
          }
          placeholder="Enter UTR after payment"
          className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
        />


        {error && (

          <p className="mt-2 text-sm text-red-600">

            {error}

          </p>

        )}


        <button
          type="button"
          disabled={loading}
          onClick={submitPayment}
          className="mt-4 w-full rounded-2xl bg-indigo-600 px-5 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >

          {loading
            ? 'Submitting...'
            : 'I Have Paid — Submit UTR'}

        </button>

      </div>


      <p className="mt-4 text-center text-xs leading-relaxed text-slate-500">

        After completing the UPI payment, enter the
        transaction UTR above. Your plan is activated
        only after payment verification.

      </p>

    </div>

  );

}