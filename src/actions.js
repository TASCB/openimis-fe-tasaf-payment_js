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
  'lastFailureReason',
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
  'groupBeneficiary { id uuid group { id uuid } }',
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
  'destination',
  'status',
  'generatedAt',
  'approvedAt',
  'submittedAt',
  'museBatchReference',
  'itemCount',
  'batchGroup',
  'batchSequence',
  'batchTotal',
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

export const PAYROLL_PICKER_PROJECTION = () => [
  'id',
  'name',
  'status',
  'paymentCycle { id code }',
];

// Paylist + its rich payroll, shaped for payroll/buildPaylistPayload (PDF export).
// The payroll FK resolves to payroll's PayrollGQLType, so benefitConsumption etc. are available.
export const PAYLIST_EXPORT_PROJECTION = () => [
  'id',
  'uuid',
  'payroll { id name paymentMethod '
    + 'paymentCycle { code startDate endDate } '
    + 'paymentPoint { id name location { id name parent { id name parent { id name } } } } '
    + 'benefitConsumption { id status code amount jsonExt '
    + 'individual { firstName lastName } '
    + 'benefitAttachment { bill { id code amountTotal } } } }',
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

// ─── Withdrawal charges (tariff table) ────────────────────────────────────────

const WITHDRAWAL_CHARGE_PROJECTION = () => [
  'id', 'uuid', 'fspCode', 'lowerAmount', 'upperAmount', 'withdrawal',
  'effectiveFrom', 'effectiveTo',
];

export function fetchWithdrawalCharges(params) {
  const payload = formatPageQueryWithCount('withdrawalCharge', params, WITHDRAWAL_CHARGE_PROJECTION());
  return graphql(payload, ACTION_TYPE.SEARCH_WITHDRAWAL_CHARGES);
}

// Configured vs unconfigured ranges per FSP -- drives the coverage panel.
export function fetchFspCoverage() {
  const payload = `query { fspCoverage { fspCode bands lowest highest coversFromZero
    gaps { rangeFrom rangeTo } overlaps { rangeFrom rangeTo } } }`;
  return graphql(payload, ACTION_TYPE.FETCH_FSP_COVERAGE);
}

export function saveWithdrawalCharge(charge, clientMutationLabel) {
  const mutation = formatMutation('saveWithdrawalCharge', formatChargeGQL(charge), clientMutationLabel);
  return graphql(mutation.payload, ['TASAF_PAYMENT_MUTATION_REQ',
    'TASAF_PAYMENT_SAVE_WITHDRAWAL_CHARGE_RESP', 'TASAF_PAYMENT_MUTATION_ERR'],
  { clientMutationId: mutation.clientMutationId, clientMutationLabel });
}

export function deleteWithdrawalCharges(uuids, clientMutationLabel) {
  const mutation = formatMutation('deleteWithdrawalCharge',
    `uuids: [${uuids.map((u) => `"${u}"`).join(',')}]`, clientMutationLabel);
  return graphql(mutation.payload, ['TASAF_PAYMENT_MUTATION_REQ',
    'TASAF_PAYMENT_DELETE_WITHDRAWAL_CHARGE_RESP', 'TASAF_PAYMENT_MUTATION_ERR'],
  { clientMutationId: mutation.clientMutationId, clientMutationLabel });
}

export function importWithdrawalCharges(csvContent, replace, clientMutationLabel) {
  // JSON.stringify escapes newlines and quotes so the CSV survives as a GraphQL string literal.
  const args = `csvContent: ${JSON.stringify(csvContent)}, replace: ${!!replace}`;
  const mutation = formatMutation('importWithdrawalCharges', args, clientMutationLabel);
  return graphql(mutation.payload, ['TASAF_PAYMENT_MUTATION_REQ',
    'TASAF_PAYMENT_IMPORT_WITHDRAWAL_CHARGES_RESP', 'TASAF_PAYMENT_MUTATION_ERR'],
  { clientMutationId: mutation.clientMutationId, clientMutationLabel });
}

function formatChargeGQL(c) {
  const parts = [
    `fspCode: "${c.fspCode}"`,
    `lowerAmount: ${c.lowerAmount}`,
    `upperAmount: ${c.upperAmount}`,
    `withdrawal: ${c.withdrawal}`,
  ];
  if (c.uuid) parts.push(`uuid: "${c.uuid}"`);
  if (c.effectiveFrom) parts.push(`effectiveFrom: "${c.effectiveFrom}"`);
  if (c.effectiveTo) parts.push(`effectiveTo: "${c.effectiveTo}"`);
  return parts.join(', ');
}

// ─── FSP mappings (display name -> tariff code) ───────────────────────────────

export function fetchFspMappings(params) {
  const payload = formatPageQueryWithCount('fspMapping', params,
    ['id', 'uuid', 'fspName', 'fspCode']);
  return graphql(payload, ACTION_TYPE.SEARCH_FSP_MAPPINGS);
}

export function fetchFspBandSet(fspCode) {
  return graphql(`query { fspBandSet(fspCode: "${fspCode}") { id uuid lowerAmount upperAmount withdrawal effectiveFrom } }`,
    ACTION_TYPE.FETCH_FSP_BAND_SET);
}

// The whole tariff for one FSP goes in one action -- a half-applied set misprices payments.
export function saveFspCharges(fspCode, bands, effectiveFrom, clientMutationLabel) {
  const rows = bands.map((b) => `{lowerAmount: ${b.lowerAmount}, upperAmount: ${b.upperAmount}, withdrawal: ${b.withdrawal}}`).join(', ');
  const args = [`fspCode: "${fspCode}"`, `bands: [${rows}]`]
    .concat(effectiveFrom ? [`effectiveFrom: "${effectiveFrom}"`] : []).join(', ');
  const mutation = formatMutation('saveFspCharges', args, clientMutationLabel);
  return graphql(mutation.payload, ['TASAF_PAYMENT_MUTATION_REQ',
    'TASAF_PAYMENT_SAVE_FSP_CHARGES_RESP', 'TASAF_PAYMENT_MUTATION_ERR'],
  { clientMutationId: mutation.clientMutationId, clientMutationLabel });
}

export function fetchKnownFsps() {
  return graphql('query { knownFsps { fspCode fspName onAccounts hasBands } }',
    ACTION_TYPE.FETCH_KNOWN_FSPS);
}

export function fetchUnmappedFsps() {
  return graphql('query { unmappedFsps { fspName resolvedCode } }',
    ACTION_TYPE.FETCH_UNMAPPED_FSPS);
}

export function saveFspMapping(m, clientMutationLabel) {
  const args = [`fspName: "${m.fspName}"`, `fspCode: "${m.fspCode}"`]
    .concat(m.uuid ? [`uuid: "${m.uuid}"`] : []).join(', ');
  const mutation = formatMutation('saveFspMapping', args, clientMutationLabel);
  return graphql(mutation.payload, ['TASAF_PAYMENT_MUTATION_REQ',
    'TASAF_PAYMENT_SAVE_FSP_MAPPING_RESP', 'TASAF_PAYMENT_MUTATION_ERR'],
  { clientMutationId: mutation.clientMutationId, clientMutationLabel });
}

export function deleteFspMappings(uuids, clientMutationLabel) {
  const mutation = formatMutation('deleteFspMapping',
    `uuids: [${uuids.map((u) => `"${u}"`).join(',')}]`, clientMutationLabel);
  return graphql(mutation.payload, ['TASAF_PAYMENT_MUTATION_REQ',
    'TASAF_PAYMENT_DELETE_FSP_MAPPING_RESP', 'TASAF_PAYMENT_MUTATION_ERR'],
  { clientMutationId: mutation.clientMutationId, clientMutationLabel });
}

// ─── Payroll query (read-only, generation stepper) ─────────────────────────────

export function fetchPayrolls(params = []) {
  const payload = formatPageQueryWithCount(
    'payroll',
    params,
    PAYROLL_PICKER_PROJECTION(),
  );
  return graphql(payload, ACTION_TYPE.SEARCH_PAYROLLS);
}

// Fetch one paylist (with its rich payroll) for the paylist PDF export.
// uuid === id for HistoryModels, and the `id` exact filter accepts the raw UUID.
export function fetchPaylistForExport(paylistUuid) {
  const payload = formatPageQueryWithCount(
    'paylist',
    [`id: "${paylistUuid}"`],
    PAYLIST_EXPORT_PROJECTION(),
  );
  return graphql(payload, ACTION_TYPE.GET_PAYLIST_EXPORT);
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
  // Location is the legacy integer PK, so unquoted.
  if (filters.locationId) parts.push(`locationId: ${filters.locationId}`);
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

// ─── Pre-audit mutations ──────────────────────────────────────────────────────

export function runBatchPreAudit(filters, clientMutationLabel) {
  const parts = [];
  if (filters.benefitPlanId) parts.push(`benefitPlanId: "${filters.benefitPlanId}"`);
  if (filters.fspType) parts.push(`fspType: "${filters.fspType}"`);
  // Location is the legacy integer PK, so unquoted.
  if (filters.locationId) parts.push(`locationId: ${filters.locationId}`);
  if (filters.rerun !== undefined) parts.push(`rerun: ${filters.rerun}`);
  const mutation = formatMutation('runBatchPreAudit', parts.join(', '), clientMutationLabel);
  return graphql(mutation.payload, [ACTION_TYPE.MUTATION, ACTION_TYPE.RUN_BATCH_PRE_AUDIT]);
}

export function runPreAudit(accountUuids, clientMutationLabel) {
  const ids = accountUuids.map((id) => `"${id}"`).join(', ');
  const mutation = formatMutation('runPreAudit', `accountUuids: [${ids}]`, clientMutationLabel);
  return graphql(mutation.payload, [ACTION_TYPE.MUTATION, ACTION_TYPE.RUN_PRE_AUDIT]);
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function fetchDashboardCounts() {
  // Single backend-aggregated summary: per-status counts for accounts, plus
  // per-paylist-status counts, beneficiaries and summed amounts, and two totals.
  const payload = `{
    paymentDashboardSummary {
      accounts { status count }
      paylists { status count beneficiaries amount }
      totalAccounts
      totalPaylists
      inProcessAmount
      paidAmount
    }
  }`;
  return graphql(payload, ACTION_TYPE.FETCH_DASHBOARD_COUNTS);
}

// ─── Paylist mutations ────────────────────────────────────────────────────────

export function generatePaylist(
  payrollId, batchType, paymentCycleId, locationId, destination, clientMutationLabel,
) {
  // payrollId / paymentCycleId are UUIDs and destination is a String, so all quoted;
  // locationId is an integer PK.
  const parts = [
    `payrollId: "${payrollId}"`,
    `batchType: "${batchType}"`,
  ];
  if (paymentCycleId) parts.push(`paymentCycleId: "${paymentCycleId}"`);
  if (locationId) parts.push(`locationId: ${locationId}`);
  if (destination) parts.push(`destination: "${destination}"`);
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

// ─── Reports (read-only, auditor tab) ──────────────────────────────────────────

export function fetchEpaymentSummaryByFsp(paymentCycleUuid, destination) {
  const args = [];
  if (paymentCycleUuid) args.push(`paymentCycleId: "${paymentCycleUuid}"`);
  if (destination) args.push(`destination: "${destination}"`);
  const ROW = `epaymentCode households withdrawalCharges pctPayment childGrant disabilityGrant
    pwpPayment eiPayment hasChild primaryStudent secondaryStudent componentTotal totalPaid items`;
  const payload = `{
    epaymentSummaryByFsp${args.length ? `(${args.join(', ')})` : ''} {
      rows { ${ROW} }
      totals { ${ROW} }
    }
  }`;
  return graphql(payload, ACTION_TYPE.FETCH_EPAYMENT_SUMMARY);
}

export function exportEpaymentSummaryByFsp(paymentCycleUuid, destination) {
  const args = [];
  if (paymentCycleUuid) args.push(`paymentCycleId: "${paymentCycleUuid}"`);
  if (destination) args.push(`destination: "${destination}"`);
  const payload = `{ epaymentSummaryByFspExport${args.length ? `(${args.join(', ')})` : ''} }`;
  return graphql(payload, ACTION_TYPE.EXPORT_EPAYMENT_SUMMARY);
}

// Items behind one FSP row of the e-Payment summary — the auditor drill-down.
export const EPAYMENT_FSP_ITEM_PROJECTION = () => [
  'id', 'uuid', 'status', 'amount', 'netAmount', 'chargeAmount',
  'settledAt', 'museReference', 'returnReason',
  'paymentAccount { uuid accountNumber accountName fspName fspType }',
  'benefitConsumption { code amount jsonExt individual { firstName lastName } }',
  'paylist { uuid batchType destination }',
];

export function fetchEpaymentFspItems(params = []) {
  const payload = formatPageQueryWithCount(
    'epaymentFspItems',
    params,
    EPAYMENT_FSP_ITEM_PROJECTION(),
  );
  return graphql(payload, ACTION_TYPE.SEARCH_EPAYMENT_FSP_ITEMS);
}

// One beneficiary's full payment history — the third drill-down level.
export function fetchEpaymentBeneficiaryItems(params = []) {
  const payload = formatPageQueryWithCount(
    'epaymentBeneficiaryItems',
    params,
    [
      'id', 'uuid', 'status', 'amount', 'netAmount', 'chargeAmount',
      'settledAt', 'museReference', 'returnReason',
      'benefitConsumption { code amount jsonExt dateDue }',
      'paylist { uuid batchType destination status }',
    ],
  );
  return graphql(payload, ACTION_TYPE.SEARCH_EPAYMENT_BENEFICIARY_ITEMS);
}
