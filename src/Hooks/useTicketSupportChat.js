import { useState, useCallback, useEffect } from 'react';
import { getTicketSupportChat, sendTicketSupportChat } from '../Api/ticketApi';
import { escalateSupportTicket } from '../Api/supportTicketApi';

// Mimics the .unwrap() convenience RTK thunks expose, so callers written
// against the Redux-backed hooks (useSupportTicketDetail/useCustomPlanDetail)
// work unchanged against this plain-state hook.
function withUnwrap(promise) {
  promise.unwrap = () => promise;
  return promise;
}

// The job-linked support chat — GET/POST /customer/tickets/{ticket}/support-chat
// — the same thread the assigned vendor sees via
// /vendor/jobs/{ticket}/support-chat, including document requests. This is a
// separate backend resource from the general helpdesk Support Ticket flow
// (useSupportTicketDetail, /customer/support-tickets), which doesn't carry
// document-request data even when it happens to share a chat id.
export function useTicketSupportChat(ticketId) {
  const [chat, setChat] = useState(null);
  const [replies, setReplies] = useState([]);
  const [status, setStatus] = useState(ticketId ? 'loading' : 'succeeded');
  const [replyStatus, setReplyStatus] = useState('idle');
  const [escalateStatus, setEscalateStatus] = useState('idle');

  const load = useCallback(async () => {
    if (!ticketId) return;
    try {
      const res = await getTicketSupportChat(ticketId);
      setChat(res.chat);
      setReplies(res.replies);
      setStatus('succeeded');
    } catch (e) {
      setStatus('failed');
    }
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  const doReply = async (message) => {
    setReplyStatus('loading');
    try {
      const res = await sendTicketSupportChat(ticketId, message);
      await load();
      setReplyStatus('succeeded');
      return res;
    } catch (error) {
      setReplyStatus('failed');
      throw error;
    }
  };

  const doEscalate = async () => {
    setEscalateStatus('loading');
    try {
      const res = await escalateSupportTicket(chat?.id);
      await load();
      setEscalateStatus('succeeded');
      return res;
    } catch (error) {
      setEscalateStatus('failed');
      throw error;
    }
  };

  return {
    detail: chat,
    replies,
    loading: status === 'loading',
    failed: status === 'failed',
    retry: load,
    reply: (message) => withUnwrap(doReply(message)),
    replyLoading: replyStatus === 'loading',
    escalate: () => withUnwrap(doEscalate()),
    escalateLoading: escalateStatus === 'loading',
    // Custom Plan proposals never appear on a job chat — this is only here so
    // the shared screen can destructure a consistent shape.
    acceptPlan: () => withUnwrap(Promise.resolve(null)),
  };
}
