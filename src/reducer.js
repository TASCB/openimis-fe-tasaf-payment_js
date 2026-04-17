/* eslint-disable default-param-last */

import {
  dispatchMutationErr,
  dispatchMutationReq,
  dispatchMutationResp,
  formatGraphQLError,
  formatServerError,
  pageInfo,
  parseData,
  decodeId,
} from '@openimis/fe-core';
import { CLEAR, ERROR, REQUEST, SUCCESS } from './utils/action-type';

export const ACTION_TYPE = {
  MUTATION: 'TASAF_PAYMENT_MUTATION',
  // Account CRUD
  CREATE_PAYMENT_ACCOUNT:   'TASAF_PAYMENT_MUTATION_CREATE_ACCOUNT',
  UPDATE_PAYMENT_ACCOUNT:   'TASAF_PAYMENT_MUTATION_UPDATE_ACCOUNT',
  DELETE_PAYMENT_ACCOUNT:   'TASAF_PAYMENT_MUTATION_DELETE_ACCOUNT',
  // Verification
  RUN_VERIFICATION:         'TASAF_PAYMENT_MUTATION_RUN_VERIFICATION',
  RUN_BATCH_VERIFICATION:   'TASAF_PAYMENT_MUTATION_RUN_BATCH_VERIFICATION',
  APPROVE_ACCOUNTS:         'TASAF_PAYMENT_MUTATION_APPROVE_ACCOUNTS',
  RESUBMIT_FAILED_ACCOUNTS: 'TASAF_PAYMENT_MUTATION_RESUBMIT_FAILED',
  ROUTE_TO_CORRECTION:      'TASAF_PAYMENT_MUTATION_ROUTE_TO_CORRECTION',
  // Pre-audit
  RUN_PRE_AUDIT:            'TASAF_PAYMENT_MUTATION_RUN_PRE_AUDIT',
  // Paylist
  GENERATE_PAYLIST:         'TASAF_PAYMENT_MUTATION_GENERATE_PAYLIST',
  APPROVE_PAYLIST:          'TASAF_PAYMENT_MUTATION_APPROVE_PAYLIST',
  SUBMIT_PAYLIST:           'TASAF_PAYMENT_MUTATION_SUBMIT_PAYLIST',
  // Queries
  SEARCH_PAYMENT_ACCOUNTS:        'TASAF_PAYMENT_ACCOUNTS',
  GET_PAYMENT_ACCOUNT:            'TASAF_PAYMENT_GET_ACCOUNT',
  SEARCH_MUSE_VERIFICATION_RECORDS: 'TASAF_PAYMENT_MUSE_VERIFICATION_RECORDS',
  SEARCH_PAYLISTS:                'TASAF_PAYMENT_PAYLISTS',
  SEARCH_PAYLIST_ITEMS:           'TASAF_PAYMENT_PAYLIST_ITEMS',
  SEARCH_RETURN_FEEDBACK:         'TASAF_PAYMENT_RETURN_FEEDBACK',
  // Dashboard
  FETCH_DASHBOARD_COUNTS:         'TASAF_PAYMENT_DASHBOARD_COUNTS',
};

export const MUTATION_SERVICE = {
  PAYMENT_ACCOUNT: {
    CREATE: 'createPaymentAccount',
    UPDATE: 'updatePaymentAccount',
    DELETE: 'deletePaymentAccount',
  },
  VERIFICATION: {
    RUN:              'runVerification',
    RUN_BATCH:        'runBatchVerification',
    APPROVE:          'approvePaymentAccounts',
    RESUBMIT_FAILED:  'resubmitFailedAccounts',
    ROUTE_CORRECTION: 'routeToCorrection',
  },
  PRE_AUDIT: {
    RUN: 'runPreAudit',
  },
  PAYLIST: {
    GENERATE: 'generatePaylist',
    APPROVE:  'approvePaylist',
    SUBMIT:   'submitPaylist',
  },
};

const STORE_STATE = {
  submittingMutation: false,
  mutation: {},

  // Payment accounts
  fetchingPaymentAccounts: false,
  fetchedPaymentAccounts: false,
  errorPaymentAccounts: null,
  paymentAccounts: [],
  paymentAccountsPageInfo: {},
  paymentAccountsTotalCount: 0,

  fetchingPaymentAccount: false,
  fetchedPaymentAccount: false,
  paymentAccount: null,
  errorPaymentAccount: null,

  // MUSE verification records
  fetchingMuseVerificationRecords: false,
  fetchedMuseVerificationRecords: false,
  errorMuseVerificationRecords: null,
  museVerificationRecords: [],
  museVerificationRecordsPageInfo: {},
  museVerificationRecordsTotalCount: 0,

  // Paylists
  fetchingPaylists: false,
  fetchedPaylists: false,
  errorPaylists: null,
  paylists: [],
  paylistsPageInfo: {},
  paylistsTotalCount: 0,

  // Paylist items
  fetchingPaylistItems: false,
  fetchedPaylistItems: false,
  errorPaylistItems: null,
  paylistItems: [],
  paylistItemsPageInfo: {},
  paylistItemsTotalCount: 0,

  // Return feedback
  fetchingReturnFeedback: false,
  fetchedReturnFeedback: false,
  errorReturnFeedback: null,
  returnFeedback: [],
  returnFeedbackPageInfo: {},
  returnFeedbackTotalCount: 0,

  // Dashboard counts
  fetchingDashboard: false,
  fetchedDashboard: false,
  errorDashboard: null,
  dashboardCounts: { accounts: {}, paylists: {} },
};

function reducer(state = STORE_STATE, action) {
  switch (action.type) {

    // ─── Payment Accounts ───────────────────────────────────────────────────
    case REQUEST(ACTION_TYPE.SEARCH_PAYMENT_ACCOUNTS):
      return {
        ...state,
        fetchingPaymentAccounts: true,
        fetchedPaymentAccounts: false,
        paymentAccounts: [],
        errorPaymentAccounts: null,
        paymentAccountsPageInfo: {},
        paymentAccountsTotalCount: 0,
      };
    case SUCCESS(ACTION_TYPE.SEARCH_PAYMENT_ACCOUNTS):
      return {
        ...state,
        fetchingPaymentAccounts: false,
        fetchedPaymentAccounts: true,
        paymentAccounts: parseData(action.payload.data.paymentAccount)?.map((a) => ({
          ...a,
          id: decodeId(a.id),
        })),
        paymentAccountsPageInfo: pageInfo(action.payload.data.paymentAccount),
        paymentAccountsTotalCount: action.payload.data.paymentAccount?.totalCount ?? 0,
        errorPaymentAccounts: formatGraphQLError(action.payload),
      };
    case ERROR(ACTION_TYPE.SEARCH_PAYMENT_ACCOUNTS):
      return { ...state, fetchingPaymentAccounts: false, errorPaymentAccounts: formatServerError(action.payload) };

    case REQUEST(ACTION_TYPE.GET_PAYMENT_ACCOUNT):
      return { ...state, fetchingPaymentAccount: true, fetchedPaymentAccount: false, paymentAccount: null, errorPaymentAccount: null };
    case SUCCESS(ACTION_TYPE.GET_PAYMENT_ACCOUNT):
      return {
        ...state,
        fetchingPaymentAccount: false,
        fetchedPaymentAccount: true,
        paymentAccount: parseData(action.payload.data.paymentAccount)?.map((a) => ({ ...a, id: decodeId(a.id) }))?.[0],
        errorPaymentAccount: formatGraphQLError(action.payload),
      };
    case ERROR(ACTION_TYPE.GET_PAYMENT_ACCOUNT):
      return { ...state, fetchingPaymentAccount: false, errorPaymentAccount: formatServerError(action.payload) };
    case CLEAR(ACTION_TYPE.GET_PAYMENT_ACCOUNT):
      return { ...state, fetchingPaymentAccount: false, fetchedPaymentAccount: false, paymentAccount: null, errorPaymentAccount: null };

    // ─── MUSE Verification Records ──────────────────────────────────────────
    case REQUEST(ACTION_TYPE.SEARCH_MUSE_VERIFICATION_RECORDS):
      return { ...state, fetchingMuseVerificationRecords: true, fetchedMuseVerificationRecords: false, museVerificationRecords: [], errorMuseVerificationRecords: null };
    case SUCCESS(ACTION_TYPE.SEARCH_MUSE_VERIFICATION_RECORDS):
      return {
        ...state,
        fetchingMuseVerificationRecords: false,
        fetchedMuseVerificationRecords: true,
        museVerificationRecords: parseData(action.payload.data.museVerificationRecord)?.map((r) => ({ ...r, id: decodeId(r.id) })),
        museVerificationRecordsPageInfo: pageInfo(action.payload.data.museVerificationRecord),
        museVerificationRecordsTotalCount: action.payload.data.museVerificationRecord?.totalCount ?? 0,
        errorMuseVerificationRecords: formatGraphQLError(action.payload),
      };
    case ERROR(ACTION_TYPE.SEARCH_MUSE_VERIFICATION_RECORDS):
      return { ...state, fetchingMuseVerificationRecords: false, errorMuseVerificationRecords: formatServerError(action.payload) };

    // ─── Paylists ───────────────────────────────────────────────────────────
    case REQUEST(ACTION_TYPE.SEARCH_PAYLISTS):
      return { ...state, fetchingPaylists: true, fetchedPaylists: false, paylists: [], errorPaylists: null };
    case SUCCESS(ACTION_TYPE.SEARCH_PAYLISTS):
      return {
        ...state,
        fetchingPaylists: false,
        fetchedPaylists: true,
        paylists: parseData(action.payload.data.paylist)?.map((p) => ({ ...p, id: decodeId(p.id) })),
        paylistsPageInfo: pageInfo(action.payload.data.paylist),
        paylistsTotalCount: action.payload.data.paylist?.totalCount ?? 0,
        errorPaylists: formatGraphQLError(action.payload),
      };
    case ERROR(ACTION_TYPE.SEARCH_PAYLISTS):
      return { ...state, fetchingPaylists: false, errorPaylists: formatServerError(action.payload) };

    // ─── Paylist Items ──────────────────────────────────────────────────────
    case REQUEST(ACTION_TYPE.SEARCH_PAYLIST_ITEMS):
      return { ...state, fetchingPaylistItems: true, fetchedPaylistItems: false, paylistItems: [], errorPaylistItems: null };
    case SUCCESS(ACTION_TYPE.SEARCH_PAYLIST_ITEMS):
      return {
        ...state,
        fetchingPaylistItems: false,
        fetchedPaylistItems: true,
        paylistItems: parseData(action.payload.data.paylistItem)?.map((i) => ({ ...i, id: decodeId(i.id) })),
        paylistItemsPageInfo: pageInfo(action.payload.data.paylistItem),
        paylistItemsTotalCount: action.payload.data.paylistItem?.totalCount ?? 0,
        errorPaylistItems: formatGraphQLError(action.payload),
      };
    case ERROR(ACTION_TYPE.SEARCH_PAYLIST_ITEMS):
      return { ...state, fetchingPaylistItems: false, errorPaylistItems: formatServerError(action.payload) };

    // ─── Return Feedback ────────────────────────────────────────────────────
    case REQUEST(ACTION_TYPE.SEARCH_RETURN_FEEDBACK):
      return { ...state, fetchingReturnFeedback: true, fetchedReturnFeedback: false, returnFeedback: [], errorReturnFeedback: null };
    case SUCCESS(ACTION_TYPE.SEARCH_RETURN_FEEDBACK):
      return {
        ...state,
        fetchingReturnFeedback: false,
        fetchedReturnFeedback: true,
        returnFeedback: parseData(action.payload.data.returnFeedback)?.map((f) => ({ ...f, id: decodeId(f.id) })),
        returnFeedbackPageInfo: pageInfo(action.payload.data.returnFeedback),
        returnFeedbackTotalCount: action.payload.data.returnFeedback?.totalCount ?? 0,
        errorReturnFeedback: formatGraphQLError(action.payload),
      };
    case ERROR(ACTION_TYPE.SEARCH_RETURN_FEEDBACK):
      return { ...state, fetchingReturnFeedback: false, errorReturnFeedback: formatServerError(action.payload) };

    // ─── Dashboard ─────────────────────────────────────────────────────────
    case REQUEST(ACTION_TYPE.FETCH_DASHBOARD_COUNTS):
      return { ...state, fetchingDashboard: true, fetchedDashboard: false, errorDashboard: null };
    case SUCCESS(ACTION_TYPE.FETCH_DASHBOARD_COUNTS):
      return {
        ...state,
        fetchingDashboard: false,
        fetchedDashboard: true,
        dashboardCounts: {
          accounts: {
            0: action.payload.data.acctPending?.totalCount ?? 0,      // PENDING
            1: action.payload.data.acctVerified?.totalCount ?? 0,     // VERIFIED
            2: action.payload.data.acctFailed?.totalCount ?? 0,       // FAILED
            3: action.payload.data.acctManual?.totalCount ?? 0,       // MANUAL
            4: action.payload.data.acctMuse?.totalCount ?? 0,         // PENDING_MUSE
          },
          paylists: {
            DRAFT:            action.payload.data.plDraft?.totalCount ?? 0,
            PENDING_APPROVAL: action.payload.data.plPending?.totalCount ?? 0,
            APPROVED:         action.payload.data.plApproved?.totalCount ?? 0,
            SUBMITTED:        action.payload.data.plSubmitted?.totalCount ?? 0,
            CLOSED:           action.payload.data.plClosed?.totalCount ?? 0,
          },
        },
        errorDashboard: formatGraphQLError(action.payload),
      };
    case ERROR(ACTION_TYPE.FETCH_DASHBOARD_COUNTS):
      return { ...state, fetchingDashboard: false, errorDashboard: formatServerError(action.payload) };

    // ─── Mutations ──────────────────────────────────────────────────────────
    case REQUEST(ACTION_TYPE.MUTATION):
      return dispatchMutationReq(state, action);
    case ERROR(ACTION_TYPE.MUTATION):
      return dispatchMutationErr(state, action);
    case SUCCESS(ACTION_TYPE.CREATE_PAYMENT_ACCOUNT):
      return dispatchMutationResp(state, MUTATION_SERVICE.PAYMENT_ACCOUNT.CREATE, action);
    case SUCCESS(ACTION_TYPE.UPDATE_PAYMENT_ACCOUNT):
      return dispatchMutationResp(state, MUTATION_SERVICE.PAYMENT_ACCOUNT.UPDATE, action);
    case SUCCESS(ACTION_TYPE.DELETE_PAYMENT_ACCOUNT):
      return dispatchMutationResp(state, MUTATION_SERVICE.PAYMENT_ACCOUNT.DELETE, action);
    case SUCCESS(ACTION_TYPE.RUN_VERIFICATION):
      return dispatchMutationResp(state, MUTATION_SERVICE.VERIFICATION.RUN, action);
    case SUCCESS(ACTION_TYPE.RUN_BATCH_VERIFICATION):
      return dispatchMutationResp(state, MUTATION_SERVICE.VERIFICATION.RUN_BATCH, action);
    case SUCCESS(ACTION_TYPE.APPROVE_ACCOUNTS):
      return dispatchMutationResp(state, MUTATION_SERVICE.VERIFICATION.APPROVE, action);
    case SUCCESS(ACTION_TYPE.RESUBMIT_FAILED_ACCOUNTS):
      return dispatchMutationResp(state, MUTATION_SERVICE.VERIFICATION.RESUBMIT_FAILED, action);
    case SUCCESS(ACTION_TYPE.ROUTE_TO_CORRECTION):
      return dispatchMutationResp(state, MUTATION_SERVICE.VERIFICATION.ROUTE_CORRECTION, action);
    case SUCCESS(ACTION_TYPE.RUN_PRE_AUDIT):
      return dispatchMutationResp(state, MUTATION_SERVICE.PRE_AUDIT.RUN, action);
    case SUCCESS(ACTION_TYPE.GENERATE_PAYLIST):
      return dispatchMutationResp(state, MUTATION_SERVICE.PAYLIST.GENERATE, action);
    case SUCCESS(ACTION_TYPE.APPROVE_PAYLIST):
      return dispatchMutationResp(state, MUTATION_SERVICE.PAYLIST.APPROVE, action);
    case SUCCESS(ACTION_TYPE.SUBMIT_PAYLIST):
      return dispatchMutationResp(state, MUTATION_SERVICE.PAYLIST.SUBMIT, action);

    default:
      return state;
  }
}

export default reducer;
