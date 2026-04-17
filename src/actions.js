/* eslint-disable max-len */
import {
  decodeId,
  formatGQLString,
  formatMutation,
  formatPageQueryWithCount,
  graphql,
} from '@openimis/fe-core';
import { ACTION_TYPE } from './reducer';

// ─── Projections ─────────────────────────────────────────────────────────────

export const PAYMENT_ACCOUNT_PROJECTION = () => [
  'id',
  'uuid',
  'accountNumber',
  'accountName',
  'fspType',
  'fspName',
  'verificationStatus',
  'museVerificationReference',
  'preAuditStatus',
  'activeCheckStatus',
  'isPrimary',
  'jsonExt',
  'isDeleted',
  'dateCreated',
  'dateUpdated',
  'groupBeneficiary { id uuid }',
];

export const MUSE_VERIFICATION_RECORD_PROJECTION = () => [
  'id',
  'uuid',
  'museReference',
  'verificationType',
  'result',
  'failureReason',
  'receivedAt',
  'paymentAccount { id uuid accountNumber }',
];

export const PAYLIST_PROJECTION = () => [
  'id',
  'uuid',
  'batchType',
  'status',
  'generatedAt',
  'approvedAt',
  'submittedAt',
  'museBatchReference',
  'itemCount',
  'payroll { id }',
  'paymentCycle { id }',
];

export const PAYLIST_ITEM_PROJECTION = () => [
  'id',
  'uuid',
  'amount',
  'status',
  'museReference',
  'returnReason',
  'finalStatus',
  'paymentAccount { id uuid accountNumber fspType fspName }',
  'benefitConsumption { id }',
];

export const RETURN_FEEDBACK_PROJECTION = () => [
  'id',
  'uuid',
  'feedbackType',
  'reasonCode',
  'reasonDescription',
  'receivedAt',
  'paylistItem { id uuid paylist { id uuid } }',
];

// ─── GQL string builder ───────────────────────────────────────────────────────

const formatPaymentAccountGQL = (account) => `
  ${account?.id ? `id: "${account.id}"` : ''}
  ${account?.groupBeneficiary ? `groupBeneficiaryId: "${decodeId(account.groupBeneficiary.id)}"` : ''}
  ${account?.accountNumber ? `accountNumber: "${formatGQLString(account.accountNumber)}"` : ''}
  ${account?.accountName ? `accountName: "${formatGQLString(account.accountName)}"` : ''}
  ${account?.fspType ? `fspType: "${account.fspType}"` : ''}
  ${account?.fspName ? `fspName: "${formatGQLString(account.fspName)}"` : ''}
  ${account?.isPrimary !== undefined ? `isPrimary: ${account.isPrimary}` : ''}
  ${account?.jsonExt ? `jsonExt: ${JSON.stringify(JSON.stringify(account.jsonExt))}` : ''}
`;

// ─── Payment Account queries ──────────────────────────────────────────────────

export function fetchPaymentAccounts(params) {
  const payload = formatPageQueryWithCount(
    'paymentAccount',
    params,
    PAYMENT_ACCOUNT_PROJECTION(),
  );
  return graphql(payload, ACTION_TYPE.SEARCH_PAYMENT_ACCOUNTS);
}

export function fetchPaymentAccount(uuid) {
  const payload = formatPageQueryWithCount(
    'paymentAccount',
    [`uuid: "${uuid}"`],
    PAYMENT_ACCOUNT_PROJECTION(),
  );
  return graphql(payload, ACTION_TYPE.GET_PAYMENT_ACCOUNT);
}

export function clearPaymentAccount() {
  return (dispatch) => {
    dispatch({ type: `${ACTION_TYPE.GET_PAYMENT_ACCOUNT}_CLEAR` });
  };
}

// ─── MUSE verification record queries ────────────────────────────────────────

export function fetchMuseVerificationRecords(params) {
  const payload = formatPageQueryWithCount(
    'museVerificationRecord',
    params,
    MUSE_VERIFICATION_RECORD_PROJECTION(),
  );
  return graphql(payload, ACTION_TYPE.SEARCH_MUSE_VERIFICATION_RECORDS);
}

// ─── Paylist queries ──────────────────────────────────────────────────────────

export function fetchPaylists(params) {
  const payload = formatPageQueryWithCount(
    'paylist',
    params,
    PAYLIST_PROJECTION(),
  );
  return graphql(payload, ACTION_TYPE.SEARCH_PAYLISTS);
}

export function fetchPaylistItems(params) {
  const payload = formatPageQueryWithCount(
    'paylistItem',
    params,
    PAYLIST_ITEM_PROJECTION(),
  );
  return graphql(payload, ACTION_TYPE.SEARCH_PAYLIST_ITEMS);
}

// ─── Return feedback queries ──────────────────────────────────────────────────

export function fetchReturnFeedback(params) {
  const payload = formatPageQueryWithCount(
    'returnFeedback',
    params,
    RETURN_FEEDBACK_PROJECTION(),
  );
  return graphql(payload, ACTION_TYPE.SEARCH_RETURN_FEEDBACK);
}

// ─── PaymentAccount mutations ─────────────────────────────────────────────────

export function createPaymentAccount(account, clientMutationLabel) {
  const mutation = formatMutation(
    'createPaymentAccount',
    formatPaymentAccountGQL(account),
    clientMutationLabel,
  );
  return graphql(mutation.payload, [ACTION_TYPE.MUTATION, ACTION_TYPE.CREATE_PAYMENT_ACCOUNT]);
}

export function updatePaymentAccount(account, clientMutationLabel) {
  const mutation = formatMutation(
    'updatePaymentAccount',
    formatPaymentAccountGQL(account),
    clientMutationLabel,
  );
  return graphql(mutation.payload, [ACTION_TYPE.MUTATION, ACTION_TYPE.UPDATE_PAYMENT_ACCOUNT]);
}

export function deletePaymentAccount(account, clientMutationLabel) {
  const mutation = formatMutation(
    'deletePaymentAccount',
    `ids: ["${account.uuid}"]`,
    clientMutationLabel,
  );
  return graphql(mutation.payload, [ACTION_TYPE.MUTATION, ACTION_TYPE.DELETE_PAYMENT_ACCOUNT]);
}

// ─── Verification mutations ───────────────────────────────────────────────────

export function runVerification(accountUuids, clientMutationLabel) {
  const ids = accountUuids.map((id) => `"${id}"`).join(', ');
  const mutation = formatMutation('runVerification', `accountUuids: [${ids}]`, clientMutationLabel);
  return graphql(mutation.payload, [ACTION_TYPE.MUTATION, ACTION_TYPE.RUN_VERIFICATION]);
}

export function runBatchVerification(filters, clientMutationLabel) {
  const parts = [];
  if (filters.benefitPlanId) parts.push(`benefitPlanId: "${filters.benefitPlanId}"`);
  if (filters.fspType) parts.push(`fspType: "${filters.fspType}"`);
  if (filters.rerun !== undefined) parts.push(`rerun: ${filters.rerun}`);
  const mutation = formatMutation('runBatchVerification', parts.join(', '), clientMutationLabel);
  return graphql(mutation.payload, [ACTION_TYPE.MUTATION, ACTION_TYPE.RUN_BATCH_VERIFICATION]);
}

export function approvePaymentAccounts(accountUuids, approved, reviewNotes, clientMutationLabel) {
  const ids = accountUuids.map((id) => `"${id}"`).join(', ');
  const mutation = formatMutation(
    'approvePaymentAccounts',
    `accountUuids: [${ids}], approved: ${approved}${reviewNotes ? `, reviewNotes: "${formatGQLString(reviewNotes)}"` : ''}`,
    clientMutationLabel,
  );
  return graphql(mutation.payload, [ACTION_TYPE.MUTATION, ACTION_TYPE.APPROVE_ACCOUNTS]);
}

export function resubmitFailedAccounts(accountUuids, clientMutationLabel) {
  const ids = accountUuids.map((id) => `"${id}"`).join(', ');
  const mutation = formatMutation('resubmitFailedAccounts', `accountUuids: [${ids}]`, clientMutationLabel);
  return graphql(mutation.payload, [ACTION_TYPE.MUTATION, ACTION_TYPE.RESUBMIT_FAILED_ACCOUNTS]);
}

export function routeToCorrection(accountUuids, notes, clientMutationLabel) {
  const ids = accountUuids.map((id) => `"${id}"`).join(', ');
  const mutation = formatMutation(
    'routeToCorrection',
    `accountUuids: [${ids}]${notes ? `, notes: "${formatGQLString(notes)}"` : ''}`,
    clientMutationLabel,
  );
  return graphql(mutation.payload, [ACTION_TYPE.MUTATION, ACTION_TYPE.ROUTE_TO_CORRECTION]);
}

// ─── Pre-audit mutations ──────────────────────────────────────────────────────

export function runPreAudit(accountUuids, clientMutationLabel) {
  const ids = accountUuids.map((id) => `"${id}"`).join(', ');
  const mutation = formatMutation('runPreAudit', `accountUuids: [${ids}]`, clientMutationLabel);
  return graphql(mutation.payload, [ACTION_TYPE.MUTATION, ACTION_TYPE.RUN_PRE_AUDIT]);
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function fetchDashboardCounts() {
  // Single aliased GQL query — one network request for all 10 counts
  const payload = `{
    acctPending:  paymentAccount(verificationStatus: 0) { totalCount }
    acctVerified: paymentAccount(verificationStatus: 1) { totalCount }
    acctFailed:   paymentAccount(verificationStatus: 2) { totalCount }
    acctManual:   paymentAccount(verificationStatus: 3) { totalCount }
    acctMuse:     paymentAccount(verificationStatus: 4) { totalCount }
    plDraft:    paylist(status: "DRAFT")            { totalCount }
    plPending:  paylist(status: "PENDING_APPROVAL") { totalCount }
    plApproved: paylist(status: "APPROVED")         { totalCount }
    plSubmitted:paylist(status: "SUBMITTED")        { totalCount }
    plClosed:   paylist(status: "CLOSED")           { totalCount }
  }`;
  return graphql(payload, ACTION_TYPE.FETCH_DASHBOARD_COUNTS);
}

// ─── Paylist mutations ────────────────────────────────────────────────────────

export function generatePaylist(payrollId, batchType, paymentCycleId, locationId, clientMutationLabel) {
  const parts = [
    `payrollId: ${payrollId}`,
    `batchType: "${batchType}"`,
  ];
  if (paymentCycleId) parts.push(`paymentCycleId: ${paymentCycleId}`);
  if (locationId) parts.push(`locationId: ${locationId}`);
  const mutation = formatMutation('generatePaylist', parts.join(', '), clientMutationLabel);
  return graphql(mutation.payload, [ACTION_TYPE.MUTATION, ACTION_TYPE.GENERATE_PAYLIST]);
}

export function approvePaylist(paylistUuid, clientMutationLabel) {
  const mutation = formatMutation('approvePaylist', `paylistUuid: "${paylistUuid}"`, clientMutationLabel);
  return graphql(mutation.payload, [ACTION_TYPE.MUTATION, ACTION_TYPE.APPROVE_PAYLIST]);
}

export function submitPaylist(paylistUuid, clientMutationLabel) {
  const mutation = formatMutation('submitPaylist', `paylistUuid: "${paylistUuid}"`, clientMutationLabel);
  return graphql(mutation.payload, [ACTION_TYPE.MUTATION, ACTION_TYPE.SUBMIT_PAYLIST]);
}
