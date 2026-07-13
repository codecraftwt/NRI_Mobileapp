import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTicketQuote,
  fetchTicketCoupons,
  applyTicketCoupon,
  clearAppliedCoupon,
  resetTicketBooking,
  submitTicket,
  payForTicket,
  verifyTicketPayment,
} from '../Redux/slices/ticketBookingSlice';

// On-demand booking-time pricing for CreateTicket: quote (base + addons +
// express surcharge + coupon discount) and the coupon list/apply flow.
export function useTicketBooking() {
  const dispatch = useDispatch();
  const quote = useSelector(state => state.ticketBooking.quote);
  const quoteLoading = useSelector(state => state.ticketBooking.quoteStatus === 'loading');
  const quoteFailed = useSelector(state => state.ticketBooking.quoteStatus === 'failed');
  const quoteError = useSelector(state => state.ticketBooking.quoteError);

  const coupons = useSelector(state => state.ticketBooking.coupons);
  const couponsLoading = useSelector(state => state.ticketBooking.couponsStatus === 'loading');
  const couponsFailed = useSelector(state => state.ticketBooking.couponsStatus === 'failed');

  const appliedCoupon = useSelector(state => state.ticketBooking.appliedCoupon);
  const couponApplyLoading = useSelector(state => state.ticketBooking.couponApplyStatus === 'loading');
  const couponApplyError = useSelector(state => state.ticketBooking.couponApplyError);

  const submitLoading = useSelector(state => state.ticketBooking.submitStatus === 'loading');
  const payLoading = useSelector(state => state.ticketBooking.payStatus === 'loading');
  const verifyLoading = useSelector(state => state.ticketBooking.verifyStatus === 'loading');

  return {
    quote,
    quoteLoading,
    quoteFailed,
    quoteError,
    fetchQuote: (params) => dispatch(fetchTicketQuote(params)),

    coupons,
    couponsLoading,
    couponsFailed,
    fetchCoupons: (params) => dispatch(fetchTicketCoupons(params)),

    appliedCoupon,
    couponApplyLoading,
    couponApplyError,
    applyCoupon: (params) => dispatch(applyTicketCoupon(params)),
    clearCoupon: () => dispatch(clearAppliedCoupon()),

    submitLoading,
    submitTicket: (params) => dispatch(submitTicket(params)),

    payLoading,
    payForTicket: (params) => dispatch(payForTicket(params)),

    verifyLoading,
    verifyPayment: (params) => dispatch(verifyTicketPayment(params)),

    reset: () => dispatch(resetTicketBooking()),
  };
}
