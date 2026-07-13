import { useDispatch, useSelector } from 'react-redux';
import {
  validateMembershipCoupon,
  checkoutMembership,
  verifyMembershipPayment,
  clearCouponResult,
  resetCheckoutStatus,
} from '../Redux/slices/membershipSlice';

// On-demand actions for the buy/renew/upgrade-membership flow — coupon
// validation, starting checkout (returns a gateway order/checkout_url), and
// confirming a completed gateway payment.
export function useMembershipCheckout() {
  const dispatch = useDispatch();

  const couponResult = useSelector(state => state.membership.couponResult);
  const couponLoading = useSelector(state => state.membership.couponStatus === 'loading');
  const couponError = useSelector(state => state.membership.couponError);

  const checkoutLoading = useSelector(state => state.membership.checkoutStatus === 'loading');
  const checkoutError = useSelector(state => state.membership.checkoutError);

  const verifyLoading = useSelector(state => state.membership.verifyStatus === 'loading');
  const verifyError = useSelector(state => state.membership.verifyError);

  return {
    couponResult,
    couponLoading,
    couponError,
    validateCoupon: (params) => dispatch(validateMembershipCoupon(params)),
    clearCoupon: () => dispatch(clearCouponResult()),

    checkoutLoading,
    checkoutError,
    checkout: (params) => dispatch(checkoutMembership(params)),

    verifyLoading,
    verifyError,
    verifyPayment: (params) => dispatch(verifyMembershipPayment(params)),

    reset: () => dispatch(resetCheckoutStatus()),
  };
}
