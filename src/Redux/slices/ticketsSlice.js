import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  tickets: [
    { id: 'TKT-1001', service: 'Parent Wellness Visit', vendor: 'CarePlus Services', status: 'In Progress', date: '12 Jul 2026', priority: 'Standard' },
    { id: 'TKT-1002', service: 'Property Inspection', vendor: 'Inspector Pro', status: 'Assigned', date: '14 Jul 2026', priority: 'Standard' },
    { id: 'TKT-1003', service: 'Medicine Delivery', vendor: 'QuickPharm', status: 'Completed', date: '08 Jul 2026', priority: 'Express' },
    { id: 'TKT-1004', service: 'Plumbing Repair', vendor: 'FixIt Services', status: 'New', date: '15 Jul 2026', priority: 'Emergency' },
    { id: 'TKT-1005', service: 'Document - 7/12 Extract', vendor: 'DocRunner Agency', status: 'Completed', date: '05 Jul 2026', priority: 'Standard' },
  ]
};

const ticketsSlice = createSlice({
  name: 'tickets',
  initialState,
  reducers: {
    addTicket: (state, action) => {
      state.tickets.unshift(action.payload);
    },
    updateTicketStatus: (state, action) => {
      const { id, status } = action.payload;
      const ticket = state.tickets.find(t => t.id === id);
      if (ticket) ticket.status = status;
    },
  },
});

export const { addTicket, updateTicketStatus } = ticketsSlice.actions;
export default ticketsSlice.reducer;
