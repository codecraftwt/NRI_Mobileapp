import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  walletCredits: 2500,
  invoices: [
    { id: 'INV-2026-001', date: '09 Jun 2026', description: 'Family Membership Plan (Annual)', amount: 24999, status: 'Paid', cgst: 2250, sgst: 2250, igst: 0, total: 29499 },
    { id: 'INV-2026-002', date: '15 Jun 2026', description: 'Parent Care Gold (Monthly Add-on)', amount: 9999, status: 'Paid', cgst: 900, sgst: 900, igst: 0, total: 11799 },
  ],
  coupons: [
    { code: 'THREE33', discountType: 'percentage', discountValue: 100, description: 'Percentage Off' },
    { code: 'SAVE2000', discountType: 'flat', discountValue: 2000, description: '₹2,000 off any plan — campaign / festive offer' },
    { code: 'DIWALI25', discountType: 'percentage', discountValue: 25, description: '25% off membership — seasonal / festival campaign' },
    { code: 'RENEW10', discountType: 'percentage', discountValue: 10, description: '10% off on renewal — retention campaign' },
    { code: 'UPGRD30', discountType: 'percentage', discountValue: 30, description: '30% off on plan upgrade — push Essential → Premium' },
    { code: 'PUNJAB500', discountType: 'flat', discountValue: 500, description: '₹500 off for Punjab customers — state launch promotion' },
    { code: 'MANDAL100', discountType: 'flat', discountValue: 1000, description: '₹1,000 off for Marathi Mandal members — community members' },
  ],
  transactions: [
    { id: 'TXN-001', date: '09 Jun 2026', description: 'Referral Credit - John D.', amount: 1500, type: 'credit' },
    { id: 'TXN-002', date: '15 Jun 2026', description: 'Add-on Purchase - Parent Care Gold', amount: 9999, type: 'debit' },
  ]
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    addInvoice: (state, action) => {
      state.invoices.unshift(action.payload);
    },
    addTransaction: (state, action) => {
      state.transactions.unshift(action.payload);
      if (action.payload.type === 'credit') state.walletCredits += action.payload.amount;
      else state.walletCredits -= action.payload.amount;
    },
    redeemCredits: (state, action) => {
      state.walletCredits -= action.payload;
    },
  },
});

export const { addInvoice, addTransaction, redeemCredits } = walletSlice.actions;
export default walletSlice.reducer;
