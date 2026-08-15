export type PaidPlan =
  | 'starter'
  | 'pro'
  | 'business';


export const PAYMENT_CONFIG = {

  merchantName:
    'QuadraConverter',

  upiId:
    'dhalak65@okicici',

  currency:
    'INR',

  plans: {

    starter: {
      name: 'Starter',
      amount: 199,
      durationDays: 30,
    },

    pro: {
      name: 'Pro',
      amount: 499,
      durationDays: 30,
    },

    business: {
      name: 'Business',
      amount: 1999,
      durationDays: 30,
    },

  },

} as const;