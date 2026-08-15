import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

import {
  LayoutDashboard,
  Users,
  FileStack,
  BarChart3,
  HardDrive,
  Settings,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  Zap,
  Star,
  Clock,
  TrendingUp,
  AlertTriangle,
  Database,
  Server,
  Cpu,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Image as ImageIcon,
  Type,
  FileCode2,
  QrCode,
  Calculator,
  KeyRound,
  Palette,
  Search,
  RefreshCw,
  IndianRupee,
} from 'lucide-react';


// ============================================================
// TYPES
// ============================================================

type AdminTab =
  | 'overview'
  | 'users'
  | 'conversions'
  | 'analytics'
  | 'storage'
  | 'tools'
  | 'payments'
  | 'settings';


type PaymentPlan =
  | 'starter'
  | 'pro'
  | 'business';


type PaymentStatus =
  | 'pending'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'expired';


const categoryIcons: Record<
  string,
  React.ComponentType<{
    className?: string;
  }>
> = {
  image: ImageIcon,
  pdf: FileText,
  text: Type,
  developer: FileCode2,
  dev: FileCode2,
  qr: QrCode,
  color: Palette,
  calc: Calculator,
  calculator: Calculator,
  security: KeyRound,
  convert: FileText,
};


// ============================================================
// CONVERSION RECORD
// ============================================================

interface ConversionRecord {
  id: string;

  tool_id: string;

  tool_name: string;

  category: string;

  input_name: string | null;

  output_name: string | null;

  output_format: string;

  status: string;

  file_size: number | null;

  created_at: string;

  user_email?: string;
}


// ============================================================
// USER RECORD
// ============================================================

interface UserRecord {
  id: string;

  email: string;

  created_at: string;

  is_admin: boolean;

  conversion_count: number;
}


// ============================================================
// ADMIN STATS
// ============================================================

interface AdminStats {
  totalUsers: number;

  totalConversions: number;

  completedConversions: number;

  failedConversions: number;

  totalStorage: number;

  adminCount: number;

  byCategory: Record<
    string,
    number
  >;

  byTool: {
    id: string;
    name: string;
    count: number;
  }[];

  recentConversions:
    ConversionRecord[];

  recentUsers:
    UserRecord[];

  successRate: number;

  avgFileSize: number;

  last7Days: {
    date: string;
    count: number;
  }[];
}


// ============================================================
// PAYMENT REQUEST
// ============================================================

interface PaymentRequest {

  id: string;

  user_id: string;

  plan: PaymentPlan;

  amount: number;

  currency: string;

  status: PaymentStatus;

  utr: string | null;

  payment_note: string | null;

  admin_note: string | null;

  created_at: string;

  submitted_at: string | null;

  verified_at: string | null;
}


// ============================================================
// MAIN ADMIN PAGE
// ============================================================

export function AdminPage({
  navigate,
}: {
  navigate: (
    path: string
  ) => void;
}) {

  const {
    user,
  } = useAuth();


  // ----------------------------------------------------------
  // Main state
  // ----------------------------------------------------------

  const [
    tab,
    setTab,
  ] = useState<AdminTab>(
    'overview'
  );


  const [
    stats,
    setStats,
  ] = useState<AdminStats | null>(
    null
  );


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    searchQuery,
    setSearchQuery,
  ] = useState('');


  // ----------------------------------------------------------
  // Payment state
  // ----------------------------------------------------------

  const [
    paymentRequests,
    setPaymentRequests,
  ] = useState<
    PaymentRequest[]
  >([]);


  const [
    paymentLoading,
    setPaymentLoading,
  ] = useState(false);


  const [
    paymentActionId,
    setPaymentActionId,
  ] = useState<string | null>(
    null
  );


  // ==========================================================
  // LOAD ADMIN STATISTICS
  // ==========================================================

  const loadStats =
    useCallback(
      async () => {

        setLoading(true);

        try {

          const [
            convResult,
            usersResult,
          ] =
            await Promise.all([

              supabase
                .from('conversions')
                .select('*')
                .order(
                  'created_at',
                  {
                    ascending:
                      false,
                  }
                )
                .limit(200),

              supabase
                .from('profiles')
                .select('*')
                .order(
                  'created_at',
                  {
                    ascending:
                      false,
                  }
                ),

            ]);


          const conversions =
            (
              convResult.data ||
              []
            ) as ConversionRecord[];


          const users =
            (
              usersResult.data ||
              []
            ) as UserRecord[];


          const byCategory:
            Record<
              string,
              number
            > = {};


          const byToolMap:
            Record<
              string,
              {
                id: string;
                name: string;
                count: number;
              }
            > = {};


          for (
            const conversion
            of conversions
          ) {

            byCategory[
              conversion.category
            ] =
              (
                byCategory[
                  conversion.category
                ] || 0
              ) + 1;


            if (
              !byToolMap[
                conversion.tool_id
              ]
            ) {

              byToolMap[
                conversion.tool_id
              ] = {

                id:
                  conversion.tool_id,

                name:
                  conversion.tool_name,

                count:
                  0,

              };

            }


            byToolMap[
              conversion.tool_id
            ].count++;

          }


          const byTool =
            Object
              .values(
                byToolMap
              )
              .sort(
                (a, b) =>
                  b.count -
                  a.count
              )
              .slice(
                0,
                10
              );


          const completed =
            conversions.filter(
              (conversion) =>
                conversion.status ===
                'completed'
            ).length;


          const failed =
            conversions.filter(
              (conversion) =>
                conversion.status ===
                'failed'
            ).length;


          const totalStorage =
            conversions.reduce(
              (
                sum,
                conversion
              ) =>
                sum +
                (
                  conversion.file_size ||
                  0
                ),
              0
            );


          const last7Days: {
            date: string;
            count: number;
          }[] = [];


          for (
            let i = 6;
            i >= 0;
            i--
          ) {

            const date =
              new Date();

            date.setDate(
              date.getDate() -
              i
            );


            const dateStr =
              date
                .toISOString()
                .split('T')[0];


            const count =
              conversions.filter(
                (conversion) =>
                  conversion.created_at.startsWith(
                    dateStr
                  )
              ).length;


            last7Days.push({
              date:
                dateStr,

              count,
            });

          }


          const recentConversions =
            conversions.slice(
              0,
              20
            );


          const recentUsers =
            users.slice(
              0,
              10
            );


          setStats({

            totalUsers:
              users.length,

            totalConversions:
              conversions.length,

            completedConversions:
              completed,

            failedConversions:
              failed,

            totalStorage,

            adminCount:
              users.filter(
                (u) =>
                  u.is_admin
              ).length,

            byCategory,

            byTool,

            recentConversions,

            recentUsers,

            successRate:
              conversions.length >
              0
                ? (
                    completed /
                    conversions.length
                  ) *
                  100
                : 0,

            avgFileSize:
              conversions.length >
              0
                ? totalStorage /
                  conversions.length
                : 0,

            last7Days,

          });

        } catch (
          error
        ) {

          console.error(
            'Failed to load admin stats:',
            error
          );

        } finally {

          setLoading(false);

        }

      },
      []
    );


  // ==========================================================
  // LOAD PAYMENT REQUESTS
  // ==========================================================

  const loadPaymentRequests =
    useCallback(
      async () => {

        setPaymentLoading(
          true
        );


        try {

          const {
            data,
            error,
          } =
            await supabase

              .from(
                'payment_requests'
              )

              .select(`
                id,
                user_id,
                plan,
                amount,
                currency,
                status,
                utr,
                payment_note,
                admin_note,
                created_at,
                submitted_at,
                verified_at
              `)

              .order(
                'created_at',
                {
                  ascending:
                    false,
                }
              );


          if (error) {

            console.error(
              'Failed to load payment requests:',
              error
            );

            return;

          }


          setPaymentRequests(
            (
              data || []
            ) as PaymentRequest[]
          );

        } finally {

          setPaymentLoading(
            false
          );

        }

      },
      []
    );


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {

    loadStats();

  }, [
    loadStats,
  ]);


  useEffect(() => {
    loadPaymentRequests();
    const channel = supabase.channel('admin-payment-requests-live').on('postgres_changes',{event:'*',schema:'public',table:'payment_requests'},()=>{ loadPaymentRequests(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadPaymentRequests]);


  // ==========================================================
  // APPROVE PAYMENT
  // ==========================================================

  const approvePayment =
    async (
      paymentId: string
    ) => {

      const confirmed =
        window.confirm(
          'Are you sure you want to approve this payment? The user subscription will be activated.'
        );


      if (!confirmed) {

        return;

      }


      setPaymentActionId(
        paymentId
      );


      try {

        const {
          data,
          error,
        } =
          await supabase.rpc(
            'approve_payment_request',
            {
              payment_request_id:
                paymentId,
            }
          );


        if (error) {

          console.error(
            'Approve payment error:',
            error
          );

          window.alert(
            error.message
          );

          return;

        }


        console.log(
          'Payment approved:',
          data
        );


        await loadPaymentRequests();

        await loadStats();

        window.alert(
          'Payment approved successfully. The subscription has been activated.'
        );

      } catch (
        error
      ) {

        console.error(
          error
        );

        window.alert(
          error instanceof Error
            ? error.message
            : 'Failed to approve payment.'
        );

      } finally {

        setPaymentActionId(
          null
        );

      }

    };


  // ==========================================================
  // REJECT PAYMENT
  // ==========================================================

  const rejectPayment =
    async (
      paymentId: string
    ) => {

      const reason =
        window.prompt(
          'Enter the reason for rejecting this payment:'
        );


      if (
        reason === null
      ) {

        return;

      }


      setPaymentActionId(
        paymentId
      );


      try {

        const {
          error,
        } =
          await supabase.rpc(
            'reject_payment_request',
            {
              payment_request_id:
                paymentId,

              reason:
                reason.trim() ||
                null,
            }
          );


        if (error) {

          console.error(
            'Reject payment error:',
            error
          );

          window.alert(
            error.message
          );

          return;

        }


        await loadPaymentRequests();

        window.alert(
          'Payment rejected.'
        );

      } catch (
        error
      ) {

        console.error(
          error
        );

        window.alert(
          error instanceof Error
            ? error.message
            : 'Failed to reject payment.'
        );

      } finally {

        setPaymentActionId(
          null
        );

      }

    };


  // ==========================================================
  // NAVIGATION ITEMS
  // ==========================================================

  const navItems: {
    id: AdminTab;

    label: string;

    icon:
      React.ComponentType<{
        className?: string;
      }>;

  }[] = [

    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
    },

    {
      id: 'users',
      label: 'Users',
      icon: Users,
    },

    {
      id: 'conversions',
      label: 'Conversions',
      icon: FileStack,
    },

    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
    },

    {
      id: 'storage',
      label: 'Storage',
      icon: HardDrive,
    },

    {
      id: 'tools',
      label: 'Tool Usage',
      icon: Cpu,
    },

    {
      id: 'payments',
      label: 'Payments',
      icon: QrCode,
    },

    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
    },

  ];


  // ==========================================================
  // LOADING
  // ==========================================================

  if (
    loading ||
    !stats
  ) {

    return (

      <div className="min-h-[60vh] grid place-items-center">

        <div className="text-center">

          <Loader2
            className="w-10 h-10 animate-spin text-brand-600 mx-auto"
          />

          <p className="text-ink-500 mt-3">
            Loading admin dashboard…
          </p>

        </div>

      </div>

    );

  }


  // ==========================================================
  // RENDER
  // ==========================================================

  return (

    <div className="min-h-screen bg-ink-50 flex">

      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <aside className="w-64 bg-white border-r border-ink-200 hidden lg:flex flex-col shrink-0">

        <div className="p-6 border-b border-ink-100">

          <div className="flex items-center gap-2">

            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 grid place-items-center text-white">

              <ShieldCheck className="w-5 h-5" />

            </div>


            <div>

              <p className="font-display font-bold text-ink-900 text-sm">
                Admin Panel
              </p>

              <p className="text-xs text-ink-500">
                {user?.email}
              </p>

            </div>

          </div>

        </div>


        <nav className="flex-1 p-3 space-y-1">

          {navItems.map(
            (item) => (

              <button
                key={item.id}
                type="button"
                onClick={() =>
                  setTab(
                    item.id
                  )
                }
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  tab === item.id
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-ink-600 hover:bg-ink-50'
                }`}
              >

                <item.icon className="w-4 h-4" />

                {item.label}

                {item.id ===
                  'payments' && (
                  <PaymentBadge
                    requests={
                      paymentRequests
                    }
                  />
                )}

              </button>

            )
          )}

        </nav>


        <div className="p-3 border-t border-ink-100">

          <button
            type="button"
            onClick={() =>
              navigate(
                '/dashboard'
              )
            }
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-600 hover:bg-ink-50 transition"
          >

            <LayoutDashboard className="w-4 h-4" />

            User Dashboard

          </button>

        </div>

      </aside>


      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}

      <main className="flex-1 overflow-auto">


        {/* ===================================================
            MOBILE NAV
        ==================================================== */}

        <div className="lg:hidden bg-white border-b border-ink-200 p-4">

          <div className="flex flex-wrap gap-2">

            {navItems.map(
              (item) => (

                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setTab(
                      item.id
                    )
                  }
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    tab === item.id
                      ? 'bg-brand-600 text-white'
                      : 'bg-ink-50 text-ink-600'
                  }`}
                >

                  <item.icon className="w-3.5 h-3.5" />

                  {item.label}

                </button>

              )
            )}

          </div>

        </div>


        {/* ===================================================
            PAGE CONTENT
        ==================================================== */}

        <div className="p-6 lg:p-8 max-w-6xl">


          {tab ===
            'overview' && (

            <OverviewTab
              stats={
                stats
              }
            />

          )}


          {tab ===
            'users' && (

            <UsersTab
              stats={
                stats
              }
              searchQuery={
                searchQuery
              }
              setSearchQuery={
                setSearchQuery
              }
            />

          )}


          {tab ===
            'conversions' && (

            <ConversionsTab
              stats={
                stats
              }
            />

          )}


          {tab ===
            'analytics' && (

            <AnalyticsTab
              stats={
                stats
              }
            />

          )}


          {tab ===
            'storage' && (

            <StorageTab
              stats={
                stats
              }
            />

          )}


          {tab ===
            'tools' && (

            <ToolsTab
              stats={
                stats
              }
            />

          )}


          {tab ===
            'payments' && (

            <PaymentsTab
              paymentRequests={
                paymentRequests
              }
              paymentLoading={
                paymentLoading
              }
              paymentActionId={
                paymentActionId
              }
              onRefresh={
                loadPaymentRequests
              }
              onApprove={
                approvePayment
              }
              onReject={
                rejectPayment
              }
            />

          )}


          {tab ===
            'settings' && (

            <SettingsTab />

          )}

        </div>

      </main>

    </div>

  );

}


// ============================================================
// PAYMENTS TAB
// ============================================================

function PaymentsTab({
  paymentRequests,
  paymentLoading,
  paymentActionId,
  onRefresh,
  onApprove,
  onReject,
}: {
  paymentRequests:
    PaymentRequest[];

  paymentLoading:
    boolean;

  paymentActionId:
    string | null;

  onRefresh:
    () => Promise<void>;

  onApprove:
    (
      id: string
    ) => Promise<void>;

  onReject:
    (
      id: string
    ) => Promise<void>;
}) {


  const pending =
    paymentRequests.filter(
      (payment) =>
        payment.status ===
          'pending' ||
        payment.status ===
          'submitted'
    );


  const approved =
    paymentRequests.filter(
      (payment) =>
        payment.status ===
        'approved'
    );


  const rejected =
    paymentRequests.filter(
      (payment) =>
        payment.status ===
        'rejected'
    );


  return (

    <div className="space-y-6">


      {/* ====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>

          <h1 className="font-display text-2xl font-extrabold text-ink-900">
            Payment Requests
          </h1>

          <p className="text-ink-500 mt-1">
            Verify UPI QR payments before activating subscriptions.
          </p>

        </div>


        <button
          type="button"
          onClick={
            onRefresh
          }
          disabled={
            paymentLoading
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 hover:bg-ink-50 disabled:opacity-50"
        >

          <RefreshCw
            className={`w-4 h-4 ${
              paymentLoading
                ? 'animate-spin'
                : ''
            }`}
          />

          Refresh

        </button>

      </div>


      {/* ====================================================
          STAT CARDS
      ===================================================== */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <MetricCard
          icon={Clock}
          label="Pending"
          value={String(
            pending.length
          )}
          color="text-warn-500"
        />


        <MetricCard
          icon={CheckCircle2}
          label="Approved"
          value={String(
            approved.length
          )}
          color="text-accent-600"
        />


        <MetricCard
          icon={XCircle}
          label="Rejected"
          value={String(
            rejected.length
          )}
          color="text-err-500"
        />

      </div>


      {/* ====================================================
          IMPORTANT PAYMENT NOTICE
      ===================================================== */}

      <div className="rounded-2xl border border-warn-200 bg-warn-50 p-4">

        <div className="flex items-start gap-3">

          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warn-600" />

          <div>

            <p className="font-semibold text-warn-900">
              Verify the payment before approving
            </p>

            <p className="mt-1 text-sm leading-relaxed text-warn-800">

              Check the UTR and the actual amount received
              in your UPI/bank account. Do not activate a
              subscription only because the user entered a UTR.

            </p>

          </div>

        </div>

      </div>


      {/* ====================================================
          PAYMENT TABLE
      ===================================================== */}

      <div className="overflow-hidden rounded-3xl border border-ink-200 bg-white">


        {/* Mobile cards */}

        <div className="md:hidden">

          {paymentLoading ? (

            <div className="py-16 text-center">

              <Loader2 className="mx-auto h-7 w-7 animate-spin text-brand-600" />

              <p className="mt-3 text-sm text-ink-500">
                Loading payments...
              </p>

            </div>

          ) : paymentRequests.length === 0 ? (

            <div className="py-16 text-center">

              <QrCode className="mx-auto h-10 w-10 text-ink-300" />

              <p className="mt-3 text-sm font-semibold text-ink-700">
                No payment requests
              </p>

              <p className="mt-1 text-xs text-ink-400">
                Payment requests will appear here.
              </p>

            </div>

          ) : (

            <div className="divide-y divide-ink-100">

              {paymentRequests.map(
                (payment) => (

                  <PaymentMobileCard
                    key={
                      payment.id
                    }
                    payment={
                      payment
                    }
                    actionId={
                      paymentActionId
                    }
                    onApprove={
                      onApprove
                    }
                    onReject={
                      onReject
                    }
                  />

                )
              )}

            </div>

          )}

        </div>


        {/* Desktop table */}

        <div className="hidden md:block overflow-x-auto">

          <table className="w-full">

            <thead className="bg-ink-50 border-b border-ink-100">

              <tr>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Plan
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Amount
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  UTR
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Status
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Submitted
                </th>

                <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-ink-500">
                  Action
                </th>

              </tr>

            </thead>


            <tbody className="divide-y divide-ink-100">

              {paymentLoading ? (

                <tr>

                  <td
                    colSpan={6}
                    className="px-5 py-16 text-center"
                  >

                    <Loader2 className="mx-auto h-7 w-7 animate-spin text-brand-600" />

                    <p className="mt-3 text-sm text-ink-500">
                      Loading payments...
                    </p>

                  </td>

                </tr>

              ) : paymentRequests.length === 0 ? (

                <tr>

                  <td
                    colSpan={6}
                    className="px-5 py-16 text-center"
                  >

                    <QrCode className="mx-auto h-10 w-10 text-ink-300" />

                    <p className="mt-3 text-sm font-semibold text-ink-700">
                      No payment requests
                    </p>

                    <p className="mt-1 text-xs text-ink-400">
                      Payment requests will appear here.
                    </p>

                  </td>

                </tr>

              ) : (

                paymentRequests.map(
                  (payment) => (

                    <tr
                      key={
                        payment.id
                      }
                      className="hover:bg-ink-50 transition"
                    >


                      {/* PLAN */}

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-3">

                          <div className="h-9 w-9 rounded-xl bg-brand-50 text-brand-600 grid place-items-center">

                            <QrCode className="h-4 w-4" />

                          </div>

                          <div>

                            <p className="font-semibold capitalize text-ink-900">
                              {payment.plan}
                            </p>

                            <p className="text-xs text-ink-400">
                              30 days
                            </p>

                          </div>

                        </div>

                      </td>


                      {/* AMOUNT */}

                      <td className="px-5 py-4">

                        <div className="flex items-center gap-1 font-bold text-ink-900">

                          <IndianRupee className="h-3.5 w-3.5" />

                          {payment.amount}

                        </div>

                      </td>


                      {/* UTR */}

                      <td className="px-5 py-4">

                        {payment.utr ? (

                          <code className="inline-block max-w-[180px] truncate rounded-lg bg-ink-50 px-2.5 py-1.5 text-xs font-medium text-ink-700">
                            {payment.utr}
                          </code>

                        ) : (

                          <span className="text-sm text-ink-400">
                            Not submitted
                          </span>

                        )}

                      </td>


                      {/* STATUS */}

                      <td className="px-5 py-4">

                        <PaymentStatusBadge
                          status={
                            payment.status
                          }
                        />

                      </td>


                      {/* DATE */}

                      <td className="px-5 py-4">

                        <span className="text-xs text-ink-500">

                          {formatDate(
                            payment.submitted_at ||
                            payment.created_at
                          )}

                        </span>

                      </td>


                      {/* ACTION */}

                      <td className="px-5 py-4">

                        <PaymentActions
                          payment={
                            payment
                          }
                          actionId={
                            paymentActionId
                          }
                          onApprove={
                            onApprove
                          }
                          onReject={
                            onReject
                          }
                        />

                      </td>

                    </tr>

                  )
                )

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>

  );

}


// ============================================================
// PAYMENT MOBILE CARD
// ============================================================

function PaymentMobileCard({
  payment,
  actionId,
  onApprove,
  onReject,
}: {
  payment:
    PaymentRequest;

  actionId:
    string | null;

  onApprove:
    (
      id: string
    ) => Promise<void>;

  onReject:
    (
      id: string
    ) => Promise<void>;
}) {

  return (

    <div className="p-5 space-y-4">


      <div className="flex items-center justify-between">

        <div className="flex items-center gap-3">

          <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-600 grid place-items-center">

            <QrCode className="h-5 w-5" />

          </div>

          <div>

            <p className="font-semibold capitalize text-ink-900">
              {payment.plan}
            </p>

            <p className="text-xs text-ink-400">
              {formatDate(
                payment.created_at
              )}
            </p>

          </div>

        </div>


        <PaymentStatusBadge
          status={
            payment.status
          }
        />

      </div>


      <div className="grid grid-cols-2 gap-3">

        <div className="rounded-xl bg-ink-50 p-3">

          <p className="text-xs text-ink-400">
            Amount
          </p>

          <p className="mt-1 font-bold text-ink-900">
            ₹{payment.amount}
          </p>

        </div>


        <div className="rounded-xl bg-ink-50 p-3">

          <p className="text-xs text-ink-400">
            UTR
          </p>

          <p className="mt-1 truncate text-xs font-semibold text-ink-800">

            {payment.utr ||
              'Not submitted'}

          </p>

        </div>

      </div>


      <PaymentActions
        payment={
          payment
        }
        actionId={
          actionId
        }
        onApprove={
          onApprove
        }
        onReject={
          onReject
        }
      />

    </div>

  );

}


// ============================================================
// PAYMENT ACTIONS
// ============================================================

function PaymentActions({
  payment,
  actionId,
  onApprove,
  onReject,
}: {
  payment:
    PaymentRequest;

  actionId:
    string | null;

  onApprove:
    (
      id: string
    ) => Promise<void>;

  onReject:
    (
      id: string
    ) => Promise<void>;
}) {


  const isProcessing =
    actionId ===
    payment.id;


  const canAct =
    payment.status ===
      'pending' ||
    payment.status ===
      'submitted';


  if (!canAct) {

    return (

      <div className="text-right text-xs text-ink-400">
        No action
      </div>

    );

  }


  return (

    <div className="flex justify-end gap-2">

      <button
        type="button"
        disabled={
          isProcessing
        }
        onClick={() =>
          onApprove(
            payment.id
          )
        }
        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent-600 px-3 py-2 text-xs font-semibold text-white hover:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-50"
      >

        {isProcessing ? (

          <Loader2 className="h-3.5 w-3.5 animate-spin" />

        ) : (

          <CheckCircle2 className="h-3.5 w-3.5" />

        )}

        Approve

      </button>


      <button
        type="button"
        disabled={
          isProcessing
        }
        onClick={() =>
          onReject(
            payment.id
          )
        }
        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-err-50 px-3 py-2 text-xs font-semibold text-err-600 hover:bg-err-100 disabled:cursor-not-allowed disabled:opacity-50"
      >

        <XCircle className="h-3.5 w-3.5" />

        Reject

      </button>

    </div>

  );

}


// ============================================================
// PAYMENT STATUS BADGE
// ============================================================

function PaymentStatusBadge({
  status,
}: {
  status:
    PaymentStatus;
}) {

  const styles = {

    pending:
      'bg-warn-50 text-warn-700',

    submitted:
      'bg-brand-50 text-brand-700',

    approved:
      'bg-accent-50 text-accent-700',

    rejected:
      'bg-err-50 text-err-700',

    expired:
      'bg-ink-100 text-ink-600',

  };


  const labels = {

    pending:
      'Pending',

    submitted:
      'Submitted',

    approved:
      'Approved',

    rejected:
      'Rejected',

    expired:
      'Expired',

  };


  return (

    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >

      {labels[status]}

    </span>

  );

}


// ============================================================
// PAYMENT BADGE FOR SIDEBAR
// ============================================================

function PaymentBadge({
  requests,
}: {
  requests:
    PaymentRequest[];
}) {

  const count =
    requests.filter(
      (request) =>
        request.status ===
          'pending' ||
        request.status ===
          'submitted'
    ).length;


  if (count === 0) {

    return null;

  }


  return (

    <span className="ml-auto min-w-5 h-5 px-1.5 rounded-full bg-err-500 text-white text-[10px] font-bold grid place-items-center">

      {count > 99
        ? '99+'
        : count}

    </span>

  );

}


// ============================================================
// OVERVIEW
// ============================================================

function OverviewTab({
  stats,
}: {
  stats:
    AdminStats;
}) {

  return (

    <div className="space-y-6">


      <div>

        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          Overview
        </h1>

        <p className="text-ink-500 mt-1">
          Platform statistics and health at a glance
        </p>

      </div>


      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <StatCard
          icon={Users}
          label="Total Users"
          value={String(
            stats.totalUsers
          )}
          sub={`${stats.adminCount} admins`}
          color="from-brand-500 to-brand-600"
          trend="+12%"
          trendUp
        />


        <StatCard
          icon={FileStack}
          label="Total Conversions"
          value={String(
            stats.totalConversions
          )}
          sub={`${stats.completedConversions} completed`}
          color="from-accent-500 to-accent-600"
          trend="+8%"
          trendUp
        />


        <StatCard
          icon={Gauge}
          label="Success Rate"
          value={`${stats.successRate.toFixed(1)}%`}
          sub={`${stats.failedConversions} failed`}
          color="from-success-500 to-success-600"
          trend="+2%"
          trendUp
        />


        <StatCard
          icon={HardDrive}
          label="Storage Used"
          value={formatBytes(
            stats.totalStorage
          )}
          sub={`Avg ${formatBytes(
            stats.avgFileSize
          )}/file`}
          color="from-warn-500 to-warn-600"
          trend="-3%"
          trendUp={false}
        />

      </div>


      {/* 7 DAY ACTIVITY */}

      <div className="bg-white rounded-3xl border border-ink-200 p-6">

        <h2 className="font-display text-lg font-bold text-ink-900 mb-4 flex items-center gap-2">

          <Activity className="w-5 h-5 text-brand-600" />

          Last 7 Days Activity

        </h2>


        <div className="flex items-end justify-between gap-2 h-40">

          {stats.last7Days.map(
            (day) => {

              const maxCount =
                Math.max(
                  ...stats.last7Days.map(
                    (d) =>
                      d.count
                  ),
                  1
                );


              const heightPct =
                (
                  day.count /
                  maxCount
                ) *
                100;


              return (

                <div
                  key={
                    day.date
                  }
                  className="flex-1 flex flex-col items-center gap-2"
                >

                  <div
                    className="w-full bg-ink-100 rounded-lg overflow-hidden flex items-end"
                    style={{
                      height:
                        '120px',
                    }}
                  >

                    <div
                      className="w-full bg-gradient-to-t from-brand-500 to-accent-400 rounded-lg transition-all duration-500"
                      style={{
                        height:
                          `${heightPct}%`,
                      }}
                    />

                  </div>


                  <span className="text-xs text-ink-400">

                    {new Date(
                      day.date
                    ).toLocaleDateString(
                      'en',
                      {
                        weekday:
                          'short',
                      }
                    )}

                  </span>


                  <span className="text-xs font-semibold text-ink-700">
                    {day.count}
                  </span>

                </div>

              );

            }
          )}

        </div>

      </div>


      {/* RECENT CONVERSIONS */}

      <div className="bg-white rounded-3xl border border-ink-200 p-6">

        <h2 className="font-display text-lg font-bold text-ink-900 mb-4 flex items-center gap-2">

          <Clock className="w-5 h-5 text-brand-600" />

          Recent Conversions

        </h2>


        <div className="divide-y divide-ink-50">

          {stats.recentConversions
            .slice(0, 8)
            .map(
              (conv) => (

                <div
                  key={
                    conv.id
                  }
                  className="flex items-center gap-3 py-3"
                >

                  <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 grid place-items-center shrink-0">

                    {(() => {

                      const Icon =
                        categoryIcons[
                          conv.category
                        ] ||
                        FileText;

                      return (
                        <Icon className="w-4 h-4" />
                      );

                    })()}

                  </div>


                  <div className="flex-1 min-w-0">

                    <p className="text-sm font-semibold text-ink-900 truncate">
                      {conv.tool_name}
                    </p>

                    <p className="text-xs text-ink-500 truncate">
                      {conv.input_name ||
                        '—'}
                    </p>

                  </div>


                  {conv.status ===
                  'completed' ? (

                    <CheckCircle2 className="w-4 h-4 text-accent-500 shrink-0" />

                  ) : (

                    <XCircle className="w-4 h-4 text-err-500 shrink-0" />

                  )}


                  <span className="text-xs text-ink-400 shrink-0">
                    {formatBytes(
                      conv.file_size
                    )}
                  </span>

                </div>

              )
            )}

        </div>

      </div>

    </div>

  );

}


// ============================================================
// USERS
// ============================================================

function UsersTab({
  stats,
  searchQuery,
  setSearchQuery,
}: {
  stats:
    AdminStats;

  searchQuery:
    string;

  setSearchQuery:
    (
      value: string
    ) => void;
}) {


  const filtered =
    stats.recentUsers.filter(
      (u) =>
        u.email
          ?.toLowerCase()
          .includes(
            searchQuery.toLowerCase()
          )
    );


  return (

    <div className="space-y-6">


      <div className="flex items-center justify-between gap-4">

        <div>

          <h1 className="font-display text-2xl font-extrabold text-ink-900">
            Users
          </h1>

          <p className="text-ink-500 mt-1">
            {stats.totalUsers} registered users
          </p>

        </div>


        <div className="relative">

          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />

          <input
            value={
              searchQuery
            }
            onChange={(e) =>
              setSearchQuery(
                e.target.value
              )
            }
            placeholder="Search users…"
            className="rounded-xl border border-ink-200 pl-9 pr-4 py-2 text-sm outline-none focus:border-brand-500"
          />

        </div>

      </div>


      <div className="bg-white rounded-3xl border border-ink-200 overflow-hidden">

        <div className="overflow-x-auto">

          <table className="w-full">

            <thead className="bg-ink-50 border-b border-ink-100">

              <tr>

                <th className="text-left text-xs font-semibold text-ink-500 uppercase px-5 py-3">
                  User
                </th>

                <th className="text-left text-xs font-semibold text-ink-500 uppercase px-5 py-3">
                  Role
                </th>

                <th className="text-left text-xs font-semibold text-ink-500 uppercase px-5 py-3">
                  Joined
                </th>

                <th className="text-right text-xs font-semibold text-ink-500 uppercase px-5 py-3">
                  Conversions
                </th>

              </tr>

            </thead>


            <tbody className="divide-y divide-ink-50">

              {filtered.map(
                (u) => (

                  <tr
                    key={
                      u.id
                    }
                    className="hover:bg-ink-50 transition"
                  >

                    <td className="px-5 py-3">

                      <div className="flex items-center gap-3">

                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-accent-400 text-white grid place-items-center text-xs font-bold">

                          {u.email?.[0]?.toUpperCase() ||
                            '?'}

                        </div>


                        <span className="text-sm font-medium text-ink-900">
                          {u.email}
                        </span>

                      </div>

                    </td>


                    <td className="px-5 py-3">

                      {u.is_admin ? (

                        <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 bg-brand-50 px-2 py-1 rounded-md">

                          <ShieldCheck className="w-3 h-3" />

                          Admin

                        </span>

                      ) : (

                        <span className="text-xs font-medium text-ink-500">
                          User
                        </span>

                      )}

                    </td>


                    <td className="px-5 py-3 text-sm text-ink-500">

                      {new Date(
                        u.created_at
                      ).toLocaleDateString()}

                    </td>


                    <td className="px-5 py-3 text-sm font-semibold text-ink-900 text-right">

                      {u.conversion_count ||
                        0}

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>

  );

}


// ============================================================
// CONVERSIONS
// ============================================================

function ConversionsTab({
  stats,
}: {
  stats:
    AdminStats;
}) {

  return (

    <div className="space-y-6">

      <div>

        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          All Conversions
        </h1>

        <p className="text-ink-500 mt-1">
          {stats.totalConversions} total conversions
        </p>

      </div>


      <div className="bg-white rounded-3xl border border-ink-200 overflow-hidden">

        <div className="divide-y divide-ink-50 max-h-[600px] overflow-auto">

          {stats.recentConversions.map(
            (conv) => (

              <div
                key={
                  conv.id
                }
                className="flex items-center gap-4 p-4 hover:bg-ink-50 transition"
              >

                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 grid place-items-center shrink-0">

                  {(() => {

                    const Icon =
                      categoryIcons[
                        conv.category
                      ] ||
                      FileText;

                    return (
                      <Icon className="w-5 h-5" />
                    );

                  })()}

                </div>


                <div className="flex-1 min-w-0">

                  <p className="text-sm font-semibold text-ink-900 truncate">
                    {conv.tool_name}
                  </p>

                  <p className="text-xs text-ink-500 truncate">

                    {conv.input_name ||
                      '—'}

                    {' → '}

                    {conv.output_name ||
                      '—'}

                  </p>

                </div>


                <div className="text-right shrink-0">

                  {conv.status ===
                  'completed' ? (

                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-600">

                      <CheckCircle2 className="w-3.5 h-3.5" />

                      Done

                    </span>

                  ) : (

                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-err-500">

                      <XCircle className="w-3.5 h-3.5" />

                      Failed

                    </span>

                  )}


                  <p className="text-xs text-ink-400 mt-0.5">
                    {formatBytes(
                      conv.file_size
                    )}
                  </p>

                </div>

              </div>

            )
          )}

        </div>

      </div>

    </div>

  );

}


// ============================================================
// ANALYTICS
// ============================================================

function AnalyticsTab({
  stats,
}: {
  stats:
    AdminStats;
}) {

  return (

    <div className="space-y-6">


      <div>

        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          Analytics
        </h1>

        <p className="text-ink-500 mt-1">
          Deep insights into platform usage
        </p>

      </div>


      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">

        <MetricCard
          icon={TrendingUp}
          label="Success Rate"
          value={`${stats.successRate.toFixed(
            1
          )}%`}
          color="text-accent-600"
        />


        <MetricCard
          icon={Zap}
          label="Avg File Size"
          value={formatBytes(
            stats.avgFileSize
          )}
          color="text-brand-600"
        />


        <MetricCard
          icon={Star}
          label="Top Category"
          value={
            Object.entries(
              stats.byCategory
            ).sort(
              (a, b) =>
                b[1] -
                a[1]
            )[0]?.[0] ||
            '—'
          }
          color="text-warn-600"
        />

      </div>


      <div className="bg-white rounded-3xl border border-ink-200 p-6">

        <h2 className="font-display text-lg font-bold text-ink-900 mb-4">
          Category Distribution
        </h2>


        <div className="space-y-3">

          {Object.entries(
            stats.byCategory
          )
            .sort(
              (a, b) =>
                b[1] -
                a[1]
            )
            .map(
              ([
                cat,
                count,
              ]) => {

                const pct =
                  stats.totalConversions >
                  0
                    ? (
                        count /
                        stats.totalConversions
                      ) *
                      100
                    : 0;


                const CatIcon =
                  categoryIcons[
                    cat
                  ] ||
                  FileText;


                return (

                  <div
                    key={
                      cat
                    }
                  >

                    <div className="flex items-center justify-between text-sm mb-1">

                      <span className="flex items-center gap-2 text-ink-600 capitalize">

                        <CatIcon className="w-4 h-4" />

                        {cat}

                      </span>


                      <span className="font-semibold text-ink-900">

                        {count}

                        {' ('}

                        {pct.toFixed(
                          0
                        )}

                        {'%)'}

                      </span>

                    </div>


                    <div className="h-3 bg-ink-100 rounded-full overflow-hidden">

                      <div
                        className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full transition-all duration-500"
                        style={{
                          width:
                            `${pct}%`,
                        }}
                      />

                    </div>

                  </div>

                );

              }
            )}

        </div>

      </div>

    </div>

  );

}


// ============================================================
// STORAGE
// ============================================================

function StorageTab({
  stats,
}: {
  stats:
    AdminStats;
}) {

  const storagePct =
    Math.min(
      (
        stats.totalStorage /
        (
          500 *
          1024 *
          1024
        )
      ) *
        100,
      100
    );


  return (

    <div className="space-y-6">


      <div>

        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          Storage
        </h1>

        <p className="text-ink-500 mt-1">
          Monitor storage consumption across the platform
        </p>

      </div>


      <div className="bg-white rounded-3xl border border-ink-200 p-6">

        <div className="flex items-center gap-4 mb-6">

          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white grid place-items-center">

            <Database className="w-8 h-8" />

          </div>


          <div>

            <p className="text-3xl font-display font-extrabold text-ink-900">
              {formatBytes(
                stats.totalStorage
              )}
            </p>

            <p className="text-sm text-ink-500">
              of 500 MB used
            </p>

          </div>

        </div>


        <div className="h-4 bg-ink-100 rounded-full overflow-hidden mb-2">

          <div
            className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full transition-all duration-500"
            style={{
              width:
                `${storagePct}%`,
            }}
          />

        </div>


        <div className="flex justify-between text-xs text-ink-500">

          <span>
            {storagePct.toFixed(
              1
            )}% used
          </span>

          <span>
            {formatBytes(
              Math.max(
                500 *
                  1024 *
                  1024 -
                  stats.totalStorage,
                0
              )
            )}{' '}
            free
          </span>

        </div>

      </div>


      <div className="grid grid-cols-2 gap-4">

        <MetricCard
          icon={Server}
          label="Avg per file"
          value={formatBytes(
            stats.avgFileSize
          )}
          color="text-brand-600"
        />


        <MetricCard
          icon={FileStack}
          label="Total files"
          value={String(
            stats.totalConversions
          )}
          color="text-accent-600"
        />

      </div>

    </div>

  );

}


// ============================================================
// TOOLS
// ============================================================

function ToolsTab({
  stats,
}: {
  stats:
    AdminStats;
}) {

  return (

    <div className="space-y-6">


      <div>

        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          Tool Usage
        </h1>

        <p className="text-ink-500 mt-1">
          Most popular tools on the platform
        </p>

      </div>


      <div className="bg-white rounded-3xl border border-ink-200 p-6">

        <div className="space-y-4">

          {stats.byTool.map(
            (
              tool,
              index
            ) => {

              const maxCount =
                stats.byTool[
                  0
                ]?.count ||
                1;


              const pct =
                (
                  tool.count /
                  maxCount
                ) *
                100;


              return (

                <div
                  key={
                    tool.id
                  }
                  className="flex items-center gap-4"
                >

                  <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 grid place-items-center text-sm font-bold shrink-0">

                    {index + 1}

                  </span>


                  <span className="text-sm font-medium text-ink-700 flex-1 truncate">

                    {tool.name}

                  </span>


                  <div className="w-32 h-2.5 bg-ink-100 rounded-full overflow-hidden">

                    <div
                      className="h-full bg-brand-500 rounded-full transition-all duration-500"
                      style={{
                        width:
                          `${pct}%`,
                      }}
                    />

                  </div>


                  <span className="text-sm font-semibold text-ink-900 w-12 text-right">

                    {tool.count}

                  </span>

                </div>

              );

            }
          )}

        </div>

      </div>

    </div>

  );

}


// ============================================================
// SETTINGS
// ============================================================

function SettingsTab() {

  return (

    <div className="space-y-6">


      <div>

        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          Settings
        </h1>

        <p className="text-ink-500 mt-1">
          Platform configuration and preferences
        </p>

      </div>


      <div className="bg-white rounded-3xl border border-ink-200 p-6 space-y-4">

        <SettingRow
          icon={
            ShieldCheck
          }
          label="Enable user registration"
          desc="Allow new users to sign up"
          enabled
        />


        <SettingRow
          icon={
            Zap
          }
          label="Auto-optimize conversions"
          desc="Compress output files automatically"
          enabled
        />


        <SettingRow
          icon={
            AlertTriangle
          }
          label="Maintenance mode"
          desc="Show maintenance page to users"
          enabled={
            false
          }
        />


        <SettingRow
          icon={
            Server
          }
          label="Rate limiting"
          desc="Limit conversions per user"
          enabled
        />

      </div>


      <div className="rounded-3xl border border-brand-200 bg-brand-50 p-6">

        <div className="flex items-start gap-3">

          <ShieldCheck className="h-6 w-6 shrink-0 text-brand-600" />

          <div>

            <h2 className="font-bold text-brand-900">
              Free conversion policy
            </h2>

            <p className="mt-1 text-sm leading-relaxed text-brand-800">

              Free users are limited to 5 total conversions.
              Paid subscriptions receive unlimited conversions
              while their subscription is active.

            </p>

          </div>

        </div>

      </div>

    </div>

  );

}


// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  trend,
  trendUp,
}: {
  icon:
    React.ComponentType<{
      className?: string;
    }>;

  label: string;

  value: string;

  sub: string;

  color: string;

  trend: string;

  trendUp: boolean;
}) {

  return (

    <div className="bg-white rounded-2xl border border-ink-200 p-5">


      <div className="flex items-start justify-between mb-3">

        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} text-white grid place-items-center`}
        >

          <Icon className="w-5 h-5" />

        </div>


        <span
          className={`flex items-center gap-0.5 text-xs font-semibold ${
            trendUp
              ? 'text-accent-600'
              : 'text-err-500'
          }`}
        >

          {trendUp ? (

            <ArrowUpRight className="w-3 h-3" />

          ) : (

            <ArrowDownRight className="w-3 h-3" />

          )}

          {trend}

        </span>

      </div>


      <p className="text-2xl font-display font-extrabold text-ink-900">
        {value}
      </p>

      <p className="text-xs text-ink-500 mt-0.5">
        {label}
      </p>

      <p className="text-xs text-ink-400 mt-0.5">
        {sub}
      </p>

    </div>

  );

}


// ============================================================
// METRIC CARD
// ============================================================

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon:
    React.ComponentType<{
      className?: string;
    }>;

  label: string;

  value: string;

  color: string;
}) {

  return (

    <div className="bg-white rounded-2xl border border-ink-200 p-5">

      <Icon
        className={`w-6 h-6 ${color} mb-2`}
      />

      <p className="text-xl font-display font-bold text-ink-900">
        {value}
      </p>

      <p className="text-xs text-ink-500 mt-0.5">
        {label}
      </p>

    </div>

  );

}


// ============================================================
// SETTING ROW
// ============================================================

function SettingRow({
  icon: Icon,
  label,
  desc,
  enabled,
}: {
  icon:
    React.ComponentType<{
      className?: string;
    }>;

  label: string;

  desc: string;

  enabled: boolean;
}) {

  return (

    <div className="flex items-center justify-between py-3 border-b border-ink-50 last:border-0">

      <div className="flex items-center gap-3">

        <div className="w-9 h-9 rounded-xl bg-ink-50 text-ink-600 grid place-items-center">

          <Icon className="w-4 h-4" />

        </div>


        <div>

          <p className="text-sm font-semibold text-ink-900">
            {label}
          </p>

          <p className="text-xs text-ink-500">
            {desc}
          </p>

        </div>

      </div>


      <div
        className={`w-11 h-6 rounded-full transition ${
          enabled
            ? 'bg-brand-500'
            : 'bg-ink-200'
        } relative cursor-pointer`}
      >

        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
            enabled
              ? 'left-5'
              : 'left-0.5'
          }`}
        />

      </div>

    </div>

  );

}


// ============================================================
// FORMAT BYTES
// ============================================================

function formatBytes(
  bytes: number | null
): string {

  if (
    !bytes ||
    bytes <= 0
  ) {

    return '0 B';

  }


  if (
    bytes <
    1024
  ) {

    return `${bytes} B`;

  }


  if (
    bytes <
    1024 *
      1024
  ) {

    return `${(
      bytes /
      1024
    ).toFixed(
      1
    )} KB`;

  }


  return `${(
    bytes /
    (
      1024 *
      1024
    )
  ).toFixed(
    2
  )} MB`;

}


// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(
  date: string
): string {

  try {

    return new Date(
      date
    ).toLocaleString(
      'en-IN',
      {
        dateStyle:
          'medium',

        timeStyle:
          'short',
      }
    );

  } catch {

    return date;

  }

}