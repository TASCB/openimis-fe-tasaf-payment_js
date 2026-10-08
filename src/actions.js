/* eslint-disable max-len */
import {
  decodeId,
  formatGQLString,
  formatMutation,
  formatPageQueryWithCount,
  graphql,
} from '@openimis/fe-core';
import { ACTION_TYPE } from './reducer';
import { ERROR, REQUEST, SUCCESS } from './utils/action-type';

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
  'museStatusDesc',
  'museStatusAt',
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
  'payeeCode',
  'paymentAccount { id uuid accountNumber fspType fspName groupBeneficiary { id group { id code } } }',
  'benefitConsumption { id code }',
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
export const PAYLIST_HEADER_PROJECTION = () => [
  'id',
  'uuid',
  'batchType',
  'destination',
  'status',
  'museBatchReference',
  'museStatusDesc',
  'museMsgId',
  'summary',
  'lastSubmit',
];

export const PAYLIST_EXPORT_PROJECTION = () => [
  ...PAYLIST_HEADER_PROJECTION(),
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

// ─── FSP providers and MUSE settings ─────────────────────────────────────────

export function fetchFspProviders() {
  return graphql(
    'query { fspProviders { uuid fspCode name bandCount bankName fspType bic names hasBands accounts missing pending } }',
    ACTION_TYPE.FETCH_FSP_PROVIDERS,
  );
}

export function fetchMuseSettings() {
  return graphql(
    `query {
      museSettings { institutionCode payerAccount subBudgetClass unappliedSubBudgetClass paymentDesc
        isStp glAccounts environment dateUpdated }
      museReadiness { serverEnvironment settingsEnvironment environmentMismatch }
    }`,
    ACTION_TYPE.FETCH_MUSE_SETTINGS,
  );
}

function mutate(name, args, actionType, clientMutationLabel) {
  const mutation = formatMutation(name, args, clientMutationLabel);
  return graphql(
    mutation.payload,
    [REQUEST(ACTION_TYPE.MUTATION), SUCCESS(actionType), ERROR(ACTION_TYPE.MUTATION)],
    { actionType, clientMutationId: mutation.clientMutationId, clientMutationLabel },
  );
}

export function deleteFsp(fspCode, clientMutationLabel) {
  return mutate('deleteFsp', `fspCode: "${formatGQLString(fspCode)}"`, ACTION_TYPE.DELETE_FSP, clientMutationLabel);
}

export function saveFspProfile(p, clientMutationLabel) {
  const q = (v) => `"${formatGQLString(v ?? '')}"`;
  return mutate('saveFspProfile',
    `fspCode: ${q(p.fspCode)}, bankName: ${q(p.bankName)}, fspType: ${q(p.fspType)}, bic: ${q(p.bic)}`
    + `${p.reason ? `, reason: ${q(p.reason)}` : ''}`,
    ACTION_TYPE.SAVE_FSP_PROFILE, clientMutationLabel);
}

export function saveMuseSettings(s, clientMutationLabel, reason = '') {
  const q = (v) => `"${formatGQLString(v ?? '')}"`;
  const blank = (v) => v === '' || v === null || v === undefined;
  const args = [
    `institutionCode: ${q(s.institutionCode)}`,
    `payerAccount: ${q(s.payerAccount)}`,
    ...(blank(s.subBudgetClass) ? [] : [`subBudgetClass: ${parseInt(s.subBudgetClass, 10)}`]),
    ...(blank(s.unappliedSubBudgetClass) ? [] : [`unappliedSubBudgetClass: ${parseInt(s.unappliedSubBudgetClass, 10)}`]),
    `paymentDesc: ${q(s.paymentDesc)}`,
    `isStp: ${!!s.isStp}`,
    `glAccounts: ${q(JSON.stringify(s.glAccounts || []))}`,
    ...(reason.trim() ? [`reason: ${q(reason.trim())}`] : []),
  ].join(', ');
  return mutate('saveMuseSettings', args, ACTION_TYPE.SAVE_MUSE_SETTINGS, clientMutationLabel);
}

export function fetchMuseChanges() {
  return graphql('query { museChangeRequests }', ACTION_TYPE.FETCH_MUSE_CHANGES);
}

function museChangeMutation(name, changeId, comment, clientMutationLabel) {
  const args = [`changeId: "${changeId}"`]
    .concat(comment ? [`comment: "${formatGQLString(comment)}"`] : []).join(', ');
  return mutate(name, args, ACTION_TYPE.MUSE_CHANGE_DECISION, clientMutationLabel);
}

export const approveMuseChange = (id, comment, label) => museChangeMutation('approveMuseChange', id, comment, label);
export const rejectMuseChange = (id, comment, label) => museChangeMutation('rejectMuseChange', id, comment, label);
export const cancelMuseChange = (id, comment, label) => museChangeMutation('cancelMuseChange', id, comment, label);

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

export function fetchGenerationPreview(payrollId, batchType, destination, fspCode) {
  const args = [`payrollId: "${payrollId}"`, `batchType: "${batchType}"`]
    .concat(destination ? [`destination: "${destination}"`] : [])
    .concat(fspCode ? [`fspCode: "${fspCode}"`] : []).join(', ');
  return graphql(`{ paylistGenerationPreview(${args}) }`, ACTION_TYPE.GENERATION_PREVIEW);
}

export function fetchPayrolls(params = []) {
  const payload = formatPageQueryWithCount(
    'payroll',
    params,
    PAYROLL_PICKER_PROJECTION(),
  );
  return graphql(payload, ACTION_TYPE.SEARCH_PAYROLLS);
}

// uuid === id for HistoryModels, and the `id` exact filter accepts the raw UUID.
export function fetchPaylistHeader(paylistUuid) {
  const payload = formatPageQueryWithCount('paylist', [`id: "${paylistUuid}"`], PAYLIST_HEADER_PROJECTION());
  return graphql(payload, ACTION_TYPE.GET_PAYLIST_HEADER);
}

// One paylist with its rich payroll, for the paylist PDF export.
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
  return graphql(
    mutation.payload,
    [REQUEST(ACTION_TYPE.MUTATION), SUCCESS(ACTION_TYPE.CREATE_PAYMENT_ACCOUNT), ERROR(ACTION_TYPE.MUTATION)],
    { actionType: ACTION_TYPE.CREATE_PAYMENT_ACCOUNT, clientMutationId: mutation.clientMutationId, clientMutationLabel },
  );
}

export function updatePaymentAccount(account, clientMutationLabel) {
  const mutation = formatMutation(
    'updatePaymentAccount',
    formatPaymentAccountGQL(account),
    clientMutationLabel,
  );
  return graphql(
    mutation.payload,
    [REQUEST(ACTION_TYPE.MUTATION), SUCCESS(ACTION_TYPE.UPDATE_PAYMENT_ACCOUNT), ERROR(ACTION_TYPE.MUTATION)],
    { actionType: ACTION_TYPE.UPDATE_PAYMENT_ACCOUNT, clientMutationId: mutation.clientMutationId, clientMutationLabel },
  );
}

export function deletePaymentAccount(account, clientMutationLabel) {
  const mutation = formatMutation(
    'deletePaymentAccount',
    `ids: ["${account.uuid}"]`,
    clientMutationLabel,
  );
  return graphql(
    mutation.payload,
    [REQUEST(ACTION_TYPE.MUTATION), SUCCESS(ACTION_TYPE.DELETE_PAYMENT_ACCOUNT), ERROR(ACTION_TYPE.MUTATION)],
    { actionType: ACTION_TYPE.DELETE_PAYMENT_ACCOUNT, clientMutationId: mutation.clientMutationId, clientMutationLabel },
  );
}

// ─── Verification mutations ───────────────────────────────────────────────────

export function runVerification(accountUuids, clientMutationLabel) {
  const ids = accountUuids.map((id) => `"${id}"`).join(', ');
  const mutation = formatMutation('runVerification', `accountUuids: [${ids}]`, clientMutationLabel);
  return graphql(
    mutation.payload,
    [REQUEST(ACTION_TYPE.MUTATION), SUCCESS(ACTION_TYPE.RUN_VERIFICATION), ERROR(ACTION_TYPE.MUTATION)],
    { actionType: ACTION_TYPE.RUN_VERIFICATION, clientMutationId: mutation.clientMutationId, clientMutationLabel },
  );
}

export function runBatchVerification(filters, clientMutationLabel) {
  const parts = [];
  if (filters.benefitPlanId) parts.push(`benefitPlanId: "${filters.benefitPlanId}"`);
  if (filters.fspType) parts.push(`fspType: "${filters.fspType}"`);
  if (filters.fspNameIcontains) parts.push(`fspNameIcontains: "${formatGQLString(filters.fspNameIcontains)}"`);
  if (filters.accountNumberIcontains) {
    parts.push(`accountNumberIcontains: "${formatGQLString(filters.accountNumberIcontains)}"`);
  }
  // Location is the legacy integer PK, so unquoted.
  if (filters.locationId) parts.push(`locationId: ${filters.locationId}`);
  if (filters.rerun !== undefined) parts.push(`rerun: ${filters.rerun}`);
  const mutation = formatMutation('runBatchVerification', parts.join(', '), clientMutationLabel);
  return graphql(
    mutation.payload,
    [REQUEST(ACTION_TYPE.MUTATION), SUCCESS(ACTION_TYPE.RUN_BATCH_VERIFICATION), ERROR(ACTION_TYPE.MUTATION)],
    { actionType: ACTION_TYPE.RUN_BATCH_VERIFICATION, clientMutationId: mutation.clientMutationId, clientMutationLabel },
  );
}

export function approvePaymentAccounts(accountUuids, approved, reviewNotes, clientMutationLabel) {
  const ids = accountUuids.map((id) => `"${id}"`).join(', ');
  const mutation = formatMutation(
    'approvePaymentAccounts',
    `accountUuids: [${ids}], approved: ${approved}${reviewNotes ? `, reviewNotes: "${formatGQLString(reviewNotes)}"` : ''}`,
    clientMutationLabel,
  );
  return graphql(
    mutation.payload,
    [REQUEST(ACTION_TYPE.MUTATION), SUCCESS(ACTION_TYPE.APPROVE_ACCOUNTS), ERROR(ACTION_TYPE.MUTATION)],
    { actionType: ACTION_TYPE.APPROVE_ACCOUNTS, clientMutationId: mutation.clientMutationId, clientMutationLabel },
  );
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
  return graphql(
    mutation.payload,
    [REQUEST(ACTION_TYPE.MUTATION), SUCCESS(ACTION_TYPE.RUN_BATCH_PRE_AUDIT), ERROR(ACTION_TYPE.MUTATION)],
    { actionType: ACTION_TYPE.RUN_BATCH_PRE_AUDIT, clientMutationId: mutation.clientMutationId, clientMutationLabel },
  );
}

export function runPreAudit(accountUuids, clientMutationLabel) {
  const ids = accountUuids.map((id) => `"${id}"`).join(', ');
  const mutation = formatMutation('runPreAudit', `accountUuids: [${ids}]`, clientMutationLabel);
  return graphql(
    mutation.payload,
    [REQUEST(ACTION_TYPE.MUTATION), SUCCESS(ACTION_TYPE.RUN_PRE_AUDIT), ERROR(ACTION_TYPE.MUTATION)],
    { actionType: ACTION_TYPE.RUN_PRE_AUDIT, clientMutationId: mutation.clientMutationId, clientMutationLabel },
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function fetchMusePaylistPreview(paylistUuid, sampleRows = 20) {
  return graphql(
    `{ paylistMusePreview(paylistUuid: "${paylistUuid}", sampleRows: ${sampleRows}) }`,
    ACTION_TYPE.MUSE_PAYLIST_PREVIEW,
  );
}

// Read-only: the GovESB messages "Verify all matching" would publish for these filters.
export function fetchVerificationPreview(filters, sampleRows = 20) {
  const args = [`sampleRows: ${sampleRows}`];
  if (filters.fspType) args.push(`fspType: "${filters.fspType}"`);
  if (filters.fspNameIcontains) args.push(`fspNameIcontains: "${formatGQLString(filters.fspNameIcontains)}"`);
  if (filters.accountNumberIcontains) {
    args.push(`accountNumberIcontains: "${formatGQLString(filters.accountNumberIcontains)}"`);
  }
  if (filters.locationId) args.push(`locationId: ${filters.locationId}`);
  return graphql(`{ verificationBatchPreview(${args.join(', ')}) }`, ACTION_TYPE.VERIFICATION_PREVIEW);
}

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
  payrollId, batchType, paymentCycleId, destination, clientMutationLabel, fspCode,
) {
  // payrollId / paymentCycleId are UUIDs and destination is a String, so all quoted.
  const parts = [
    `payrollId: "${payrollId}"`,
    `batchType: "${batchType}"`,
  ];
  if (paymentCycleId) parts.push(`paymentCycleId: "${paymentCycleId}"`);
  if (destination) parts.push(`destination: "${destination}"`);
  if (fspCode) parts.push(`fspCode: "${fspCode}"`);
  const mutation = formatMutation('generatePaylist', parts.join(', '), clientMutationLabel);
  return graphql(
    mutation.payload,
    [REQUEST(ACTION_TYPE.MUTATION), SUCCESS(ACTION_TYPE.GENERATE_PAYLIST), ERROR(ACTION_TYPE.MUTATION)],
    { actionType: ACTION_TYPE.GENERATE_PAYLIST, clientMutationId: mutation.clientMutationId, clientMutationLabel },
  );
}

const MUTATION_LOG_QUERY = (clientMutationId) => `query { mutationLogs(clientMutationId: "${clientMutationId}") `
  + '{ edges { node { status error } } } }';
const MUTATION_RECEIVED = 0;
const MUTATION_POLL_ATTEMPTS = 60;

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

async function waitForMutationLog(dispatch, clientMutationId) {
  for (let attempt = 0; attempt < MUTATION_POLL_ATTEMPTS; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop
    const response = await dispatch(graphql(MUTATION_LOG_QUERY(clientMutationId), ACTION_TYPE.PAYLIST_ACTION_LOG));
    const log = response?.payload?.data?.mutationLogs?.edges?.[0]?.node;
    if (response?.error || (log && log.status !== MUTATION_RECEIVED)) return log || null;
    // eslint-disable-next-line no-await-in-loop
    await sleep(Math.min(250 * (attempt + 1), 2000));
  }
  return null;
}

function runPaylistAction(kind, paylistUuid, clientMutationLabel) {
  const mutation = formatMutation(kind, `paylistUuid: "${paylistUuid}"`, clientMutationLabel);
  const meta = { kind, paylistUuid, clientMutationId: mutation.clientMutationId, clientMutationLabel };
  return async (dispatch) => {
    dispatch({ type: REQUEST(ACTION_TYPE.PAYLIST_ACTION), meta });
    const sent = await dispatch(graphql(mutation.payload, ACTION_TYPE.PAYLIST_ACTION_SEND, meta));
    if (!sent || sent.error) {
      dispatch({ type: ERROR(ACTION_TYPE.PAYLIST_ACTION), payload: sent?.payload, meta });
      return;
    }
    const log = await waitForMutationLog(dispatch, meta.clientMutationId);
    dispatch({ type: SUCCESS(ACTION_TYPE.PAYLIST_ACTION), payload: log, meta });
  };
}

export const approvePaylist = (paylistUuid, label) => runPaylistAction('approvePaylist', paylistUuid, label);
export const submitPaylist = (paylistUuid, label) => runPaylistAction('submitPaylist', paylistUuid, label);

export function fetchPaylistMuseLog(paylistUuid) {
  const payload = `{ paylistMuseLog(paylistUuid: "${paylistUuid}", limit: 200) {
    createdAt direction transactionType status attemptNumber msgId museReference esbRequestId
    httpStatusCode itemCount amount benefitCode errorMessage responseBody museFeedback } }`;
  return graphql(payload, ACTION_TYPE.PAYLIST_MUSE_LOG);
}

export function fetchPaylistFspOptions(paylistUuid) {
  return graphql(
    `{ paylistFspOptions(paylistUuid: "${paylistUuid}") { fspCode name names accounts } }`,
    ACTION_TYPE.PAYLIST_FSP_OPTIONS,
  );
}

export function exportPaylistItems(paylistUuid, filterArgs) {
  const args = [`paylistUuid: "${paylistUuid}"`, ...filterArgs];
  return graphql(`{ paylistItemsExport(${args.join(', ')}) }`, ACTION_TYPE.EXPORT_PAYLIST_ITEMS);
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
