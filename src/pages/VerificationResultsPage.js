import React, { useState, useRef, useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';

import { makeStyles } from '@material-ui/styles';
import { Button, IconButton, Paper, Typography } from '@material-ui/core';
import RefreshIcon from '@material-ui/icons/Refresh';
import VerifiedUserIcon from '@material-ui/icons/VerifiedUser';
import CodeIcon from '@material-ui/icons/Code';

import {
  Helmet,
  Searcher,
  useModulesManager,
  useTranslations,
  useHistory,
  historyPush,
  coreConfirm,
  clearConfirm,
  journalize,
} from '@openimis/fe-core';

import {
  MODULE_NAME,
  RIGHT_RUN_VERIFICATION,
  RIGHT_APPROVE_ACCOUNTS,
  RIGHT_ACCOUNT_CORRECTION,
  ROUTE_REF_ACCOUNT_CORRECTION,
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
  VERIFICATION_STATUS,
  TAB_PENDING,
  TAB_REVIEW,
  TAB_SUCCESS,
  TAB_FAILED,
  TAB_GEPG,
} from '../constants';
import {
  fetchPaymentAccounts,
  fetchDashboardCounts,
  runVerification,
  runBatchVerification,
  approvePaymentAccounts,
  fetchVerificationPreview,
  reviewPaymentAccount,
  fetchGepgRequests,
  fetchVerificationOutcome,
} from '../actions';
import { ACTION_TYPE } from '../reducer';
import VerificationPayloadDialog from '../components/VerificationPayloadDialog';
import VerificationReviewDialog from '../components/VerificationReviewDialog';
import VerificationOutcomeDialog from '../components/VerificationOutcomeDialog';
import { matchReasonText } from '../utils/verification';
import PaymentAccountFilter from '../components/PaymentAccountFilter';
import { FilterExtrasProvider, withFilterExtras } from '../utils/filterExtras';
import StatusBadge from '../components/StatusBadge';
import VerificationTabs from '../components/VerificationTabs';
import GepgRequestsTable from '../components/GepgRequestsTable';
import { defaultPageStyles } from '../utils/styles';

// 6 columns, so the shared equal-width rule applies.
const AccountFilterPane = withFilterExtras(PaymentAccountFilter);

const useStyles = makeStyles((theme) => ({
  ...defaultPageStyles(theme),
  paper: theme.paper.paper,
  gepg: { '& table': { tableLayout: 'auto' } },
  gepgBar: { display: 'flex', justifyContent: 'flex-end', padding: theme.spacing(1, 1, 0) },
  empty: { padding: theme.spacing(2) },
  selectionNote: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
    gap: theme.spacing(1), padding: theme.spacing(1, 2), margin: theme.spacing(0, 0, 1),
  },
}));

// The list's filters as the Searcher sends them ('fspType: "BANK"', 'locationId: 12'),
// mapped to runBatchVerification's inputs so "Verify all matching" sends that exact list.
const BATCH_FILTER_KEYS = {
  fspType: 'fspType',
  fspName_Icontains: 'fspNameIcontains',
  accountNumber_Icontains: 'accountNumberIcontains',
  locationId: 'locationId',
};
const PAYLOAD_SAMPLE_ROWS = 20;
const MUTATION_SUCCESS = 2;

function batchFiltersFrom(params) {
  const out = {};
  (params || []).forEach((p) => {
    const m = /^(\w+):\s*"?(.*?)"?$/.exec(String(p).trim());
    if (m && BATCH_FILTER_KEYS[m[1]] && m[2] !== '') out[BATCH_FILTER_KEYS[m[1]]] = m[2];
  });
  return out;
}

function VerificationResultsPage({
  fetchPaymentAccounts,
  fetchDashboardCounts,
  runVerification,
  runBatchVerification,
  approvePaymentAccounts,
  fetchVerificationPreview,
  reviewPaymentAccount,
  fetchGepgRequests,
  fetchVerificationOutcome,
  gepgRequests,
  fetchingVerificationPreview,
  verificationPreview,
  errorVerificationPreview,
  fetchingPaymentAccounts,
  fetchedPaymentAccounts,
  errorPaymentAccounts,
  paymentAccounts,
  paymentAccountsPageInfo,
  paymentAccountsTotalCount,
  dashboardCounts,
  submittingMutation,
  mutation,
  coreConfirm,
  clearConfirm,
  confirmed,
  journalize,
}) {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const rights = useSelector((store) => store.core?.user?.i_user?.rights ?? []);
  const history = useHistory();

  // Pending first: an operator's day starts with work not yet sent, not with results.
  const [activeTab, setActiveTab] = useState(
    () => (new URLSearchParams(history.location.search).get('verification') === 'gepg' ? TAB_GEPG : TAB_PENDING),
  );
  const [outcome, setOutcome] = useState(null);
  const [selectionNote, setSelectionNote] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [location, setLocation] = useState(null);
  const [batchFilters, setBatchFilters] = useState({});
  const [showPayload, setShowPayload] = useState(false);
  const [reviewed, setReviewed] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const prevSubmittingMutationRef = useRef();
  // Without a filter "all matching" would mean every pending account in the country.
  const hasBatchFilter = Object.keys(batchFilters).length > 0;
  // Human summary of what "Verify all matching" will send, for the confirm and the journal.
  const describeBatchFilters = () => {
    const parts = [];
    if (batchFilters.fspType) parts.push(formatMessage(`paymentAccount.fspType.${batchFilters.fspType}`));
    if (batchFilters.fspNameIcontains) parts.push(`FSP “${batchFilters.fspNameIcontains}”`);
    if (batchFilters.accountNumberIcontains) parts.push(`account “${batchFilters.accountNumberIcontains}”`);
    if (batchFilters.locationId) parts.push(location?.name || `area ${batchFilters.locationId}`);
    return parts.join(' · ');
  };

  const handleTabChange = (_, tab) => {
    setActiveTab(tab);
    setSelectionNote(null);
    // The remount below resets the Searcher's filters; clear the picker with them so it
    // never shows an area that is no longer being filtered on.
    setLocation(null);
    setBatchFilters({});
  };


  const isPending = activeTab === TAB_PENDING;
  const isReview = activeTab === TAB_REVIEW;
  const isSuccess = activeTab === TAB_SUCCESS;
  let statusFilter;
  if (isPending) statusFilter = 'verificationStatusIn: [PENDING, PENDING_MUSE]';
  else if (isReview) statusFilter = `verificationStatus: ${VERIFICATION_STATUS.MANUAL}`;
  else if (isSuccess) statusFilter = `verificationStatus: ${VERIFICATION_STATUS.VERIFIED}`;
  else statusFilter = `verificationStatus: ${VERIFICATION_STATUS.FAILED}`;
  const showsNames = isReview || activeTab === TAB_FAILED;

  const passedCount = dashboardCounts?.accounts?.[VERIFICATION_STATUS.VERIFIED] ?? 0;
  const failedCount = dashboardCounts?.accounts?.[VERIFICATION_STATUS.FAILED] ?? 0;
  const manualCount = dashboardCounts?.accounts?.[VERIFICATION_STATUS.MANUAL] ?? 0;
  const pendingCount = (dashboardCounts?.accounts?.[VERIFICATION_STATUS.PENDING] ?? 0)
    + (dashboardCounts?.accounts?.[VERIFICATION_STATUS.PENDING_MUSE] ?? 0);

  useEffect(() => {
    fetchDashboardCounts();
    fetchGepgRequests();
  }, [fetchDashboardCounts, refreshKey]);

  useEffect(() => {
    if (!pendingAction) return;
    const { type, accounts } = pendingAction;
    const count = accounts.length;
    if (type === 'send' || type === 'resend' || type === 'recheck') {
      coreConfirm(
        formatMessage(`verificationResults.${type}.confirm.title`),
        formatMessageWithValues(`verificationResults.${type}.confirm.message`, { count }),
      );
    } else if (type === 'batch' || type === 'recheckBatch') {
      coreConfirm(
        formatMessage(`verificationResults.${type}.confirm.title`),
        formatMessageWithValues(`verificationResults.${type}.confirm.message`, {
          count: paymentAccountsTotalCount ?? 0,
          filters: describeBatchFilters(),
        }),
      );
    } else if (type === 'approve' || type === 'reject') {
      coreConfirm(
        formatMessage(`${type}.confirm.title`),
        formatMessageWithValues(`${type}.confirm.message`, { count }),
      );
    }
  }, [pendingAction]);

  useEffect(() => {
    if (!pendingAction) return;
    if (confirmed) {
      const { type, accounts } = pendingAction;
      const uuids = accounts.map((a) => a.uuid);
      if (type === 'send' || type === 'resend') {
        runVerification(uuids, formatMessageWithValues('mutation.runVerificationLabel', { count: uuids.length }));
      } else if (type === 'recheck') {
        runVerification(uuids, formatMessageWithValues('mutation.recheckLabel', { count: uuids.length }), true);
      } else if (type === 'batch' && hasBatchFilter) {
        // Every matching account on all pages; the backend rebuilds the query from the filters.
        runBatchVerification(
          batchFilters,
          formatMessageWithValues('mutation.runBatchVerificationLabel', { filters: describeBatchFilters() }),
        );
      } else if (type === 'recheckBatch' && hasBatchFilter) {
        runBatchVerification(
          { ...batchFilters, beforeFirstPayment: true },
          formatMessageWithValues('mutation.recheckBatchLabel', { filters: describeBatchFilters() }),
        );
      } else if (type === 'approve' || type === 'reject') {
        approvePaymentAccounts(
          uuids,
          type === 'approve',
          '',
          formatMessage(type === 'approve' ? 'mutation.approveLabel' : 'mutation.rejectLabel'),
        );
      }
      setPendingAction(null);
    }
    if (confirmed !== null) setPendingAction(null);
    return () => confirmed && clearConfirm(null);
  }, [confirmed]);

  useEffect(() => {
    if (prevSubmittingMutationRef.current && !submittingMutation) {
      journalize(mutation);
      fetchGepgRequests();
      if ([ACTION_TYPE.RUN_VERIFICATION, ACTION_TYPE.RUN_BATCH_VERIFICATION].includes(mutation?.actionType)) {
        fetchVerificationOutcome(mutation.clientMutationId).then((result) => {
          if (result) setOutcome(result);
        });
      }
    }
  }, [submittingMutation]);
  useEffect(() => { prevSubmittingMutationRef.current = submittingMutation; });

  const latest = (row) => row.verificationAttempts?.[0] || {};
  const nameHeaders = () => [
    formatMessage('paymentAccount.accountNumber'),
    formatMessage('paymentAccount.fspName'),
    formatMessage('review.expectedName'),
    formatMessage('review.returnedName'),
    formatMessage('review.score'),
    formatMessage('review.reason'),
  ];
  const nameFormatters = () => [
    (row) => row.accountNumber,
    (row) => row.fspName,
    (row) => latest(row).expectedName || row.recipientName || '-',
    (row) => latest(row).returnedName || '-',
    (row) => (latest(row).matchScore != null ? `${latest(row).matchScore}%` : '-'),
    (row) => matchReasonText(latest(row), formatMessage, formatMessageWithValues) || row.lastFailureReason || '-',
  ];

  const headers = () => [
    formatMessage('paymentAccount.accountNumber'),
    formatMessage('review.expectedName'),
    formatMessage('review.household'),
    formatMessage('paymentAccount.fspType'),
    formatMessage('paymentAccount.fspName'),
    formatMessage('paymentAccount.verificationStatus'),
  ];

  const itemFormatters = () => [
    (row) => row.accountNumber,
    (row) => row.recipientName || '-',
    (row) => row.groupBeneficiary?.group?.code || '-',
    (row) => formatMessage(`paymentAccount.fspType.${row.fspType}`),
    (row) => row.fspName,
    (row) => <StatusBadge status={row.verificationStatus} />,
  ];

  const successHeaders = () => [...headers().slice(0, 5), formatMessage('paymentAccount.firstPaymentCheck')];
  const successFormatters = () => [
    ...itemFormatters().slice(0, 5),
    (row) => (row.firstPaymentCheck ? formatMessage(`paymentAccount.firstPaymentCheck.${row.firstPaymentCheck}`) : '-'),
  ];

  const canOpenCorrection = !!modulesManager.getRef(ROUTE_REF_ACCOUNT_CORRECTION)
    && rights.includes(RIGHT_ACCOUNT_CORRECTION);
  const openCorrection = (row, newTab = false) => {
    if (row.verificationStatus !== VERIFICATION_STATUS.FAILED) return;
    historyPush(modulesManager, history, ROUTE_REF_ACCOUNT_CORRECTION, [row.uuid], newTab);
  };

  const canReview = rights.includes(RIGHT_APPROVE_ACCOUNTS);
  const decideReview = async (account, approved, notes) => {
    const label = formatMessage(approved ? 'mutation.approveLabel' : 'mutation.rejectLabel');
    const log = await reviewPaymentAccount(account.uuid, approved, notes, label);
    if (log?.status !== MUTATION_SUCCESS) return log?.error ? String(log.error) : formatMessage('review.failed');
    setReviewed(null);
    setRefreshKey((k) => k + 1);
    return null;
  };

  const canVerify = rights.includes(RIGHT_RUN_VERIFICATION);
  const canDecide = rights.includes(RIGHT_APPROVE_ACCOUNTS);
  const withStatus = (selection, status) => selection.filter((a) => a.verificationStatus === status);
  const actOnSelection = (type, selection) => {
    let accounts;
    let note = null;
    if (type === 'send') {
      accounts = withStatus(selection, VERIFICATION_STATUS.PENDING);
      const inFlight = withStatus(selection, VERIFICATION_STATUS.PENDING_MUSE).length;
      if (inFlight) {
        note = formatMessageWithValues(
          accounts.length ? 'verificationResults.selection.someInFlight' : 'verificationResults.selection.allInFlight',
          { count: inFlight, sendable: accounts.length },
        );
      }
    } else if (type === 'resend') {
      accounts = withStatus(selection, VERIFICATION_STATUS.FAILED);
    } else if (type === 'approve' || type === 'reject') {
      accounts = withStatus(selection, VERIFICATION_STATUS.MANUAL);
    } else {
      accounts = selection.filter((a) => a.firstPaymentCheck === 'DUE');
      if (!accounts.length) note = formatMessage('verificationResults.selection.noneDue');
    }
    setSelectionNote(note);
    if (accounts.length) setPendingAction({ type, accounts });
  };
  const selectionAction = (type, label, allowed) => ({
    label,
    enabled: (selection) => allowed && selection.length > 0 && !submittingMutation,
    action: (selection) => actOnSelection(type, selection),
  });
  let selectionActions = [];
  if (isPending) selectionActions = [selectionAction('send', 'tasafPayment.button.sendToMuse', canVerify)];
  else if (isReview) {
    selectionActions = [
      selectionAction('approve', 'tasafPayment.button.confirmMatch', canDecide),
      selectionAction('reject', 'tasafPayment.button.reject', canDecide),
    ];
  } else if (isSuccess) {
    selectionActions = [selectionAction('recheck', 'tasafPayment.button.recheckBeforePayment', canVerify)];
  } else selectionActions = [selectionAction('resend', 'tasafPayment.button.sendToMuse', canVerify)];

  const pendingActions = [
    {
      label: formatMessage('button.showPayload'),
      icon: <CodeIcon />,
      onClick: () => { fetchVerificationPreview(batchFilters, PAYLOAD_SAMPLE_ROWS); setShowPayload(true); },
      authorized: canVerify && hasBatchFilter,
    },
    {
      label: formatMessageWithValues('button.verifyAllMatching', { count: paymentAccountsTotalCount ?? 0 }),
      icon: <VerifiedUserIcon />,
      onClick: () => setPendingAction({ type: 'batch', accounts: [] }),
      authorized: !submittingMutation && canVerify && hasBatchFilter,
    },
  ];

  const successActions = [
    {
      label: formatMessage('button.showPayload'),
      icon: <CodeIcon />,
      onClick: () => {
        fetchVerificationPreview({ ...batchFilters, beforeFirstPayment: true }, PAYLOAD_SAMPLE_ROWS);
        setShowPayload(true);
      },
      authorized: canVerify && hasBatchFilter,
    },
    {
      label: formatMessage('button.recheckAllMatching'),
      icon: <VerifiedUserIcon />,
      onClick: () => setPendingAction({ type: 'recheckBatch', accounts: [] }),
      authorized: !submittingMutation && canVerify && hasBatchFilter,
    },
  ];

  let searcherActions = [];
  if (isPending) searcherActions = pendingActions;
  else if (isSuccess) searcherActions = successActions;

  let tableHeaders = headers;
  let tableFormatters = itemFormatters;
  if (showsNames) { tableHeaders = nameHeaders; tableFormatters = nameFormatters; }
  else if (isSuccess) { tableHeaders = successHeaders; tableFormatters = successFormatters; }

  const verificationTabs = {
    activeTab,
    onChange: handleTabChange,
    passedValue: TAB_SUCCESS,
    failedValue: TAB_FAILED,
    passedCount,
    failedCount,
    manualCount,
    pendingCount,
    gepgCount: (gepgRequests || []).length,
  };

  if (activeTab === TAB_GEPG) {
    return (
      <div className={classes.page}>
        <Helmet title={formatMessage('verificationResults.page.title')} />
        <Paper className={`${classes.paper} ${classes.gepg}`}>
          <VerificationTabs tabs={verificationTabs} />
          <div className={classes.gepgBar}>
            <IconButton size="small" onClick={() => fetchGepgRequests()} title={formatMessage('gepg.requests.refresh')}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </div>
          <GepgRequestsTable requests={gepgRequests || []} emptyClassName={classes.empty} />
        </Paper>
      </div>
    );
  }

  return (
    <div className={classes.page}>
      <Helmet title={formatMessage('verificationResults.page.title')} />
      {selectionNote && (
        <Paper className={classes.selectionNote}>
          <Typography variant="body2">{selectionNote}</Typography>
          {!submittingMutation && (
            <Button size="small" color="primary" onClick={() => handleTabChange(null, TAB_GEPG)}>
              {formatMessage('verificationResults.selection.openRequests')}
            </Button>
          )}
        </Paper>
      )}
      <FilterExtrasProvider value={{
        showStatusFilter: false, showLocationFilter: true, location, onChangeLocation: setLocation, verificationTabs,
      }}
      >
        <Searcher
          key={`${activeTab}-${refreshKey}`}
          module={MODULE_NAME}
          FilterPane={AccountFilterPane}
          fetch={(params) => {
            setBatchFilters(batchFiltersFrom(params));
            return fetchPaymentAccounts([...(params || []), statusFilter]);
          }}
          items={paymentAccounts}
          itemsPageInfo={paymentAccountsPageInfo}
          fetchingItems={fetchingPaymentAccounts}
          fetchedItems={fetchedPaymentAccounts}
          errorItems={errorPaymentAccounts}
          tableTitle={formatMessageWithValues('searcher.results', { totalCount: paymentAccountsTotalCount })}
          headers={tableHeaders}
          itemFormatters={tableFormatters}
          rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
          defaultPageSize={DEFAULT_PAGE_SIZE}
          rowIdentifier={(row) => row.id}
          onDoubleClick={isReview ? (row) => setReviewed(row)
            : (activeTab === TAB_FAILED && canOpenCorrection ? openCorrection : undefined)}
          withSelection="multiple"
          actions={selectionActions}
          enableActionButtons
          searcherActions={searcherActions}
          searcherActionsPosition="header-right"
        />
      </FilterExtrasProvider>
      <VerificationOutcomeDialog
        outcome={outcome}
        onClose={() => setOutcome(null)}
        onOpenRequests={() => { setOutcome(null); handleTabChange(null, TAB_GEPG); }}
      />
      <VerificationReviewDialog
        account={reviewed}
        onClose={() => setReviewed(null)}
        onDecide={decideReview}
        canDecide={canReview}
      />
      <VerificationPayloadDialog
        open={showPayload}
        onClose={() => setShowPayload(false)}
        preview={verificationPreview}
        fetching={fetchingVerificationPreview}
        error={errorVerificationPreview}
        sampleRows={PAYLOAD_SAMPLE_ROWS}
      />
    </div>
  );
}

const mapStateToProps = (state) => ({
  fetchingPaymentAccounts: state.tasafPayment.fetchingPaymentAccounts,
  fetchedPaymentAccounts: state.tasafPayment.fetchedPaymentAccounts,
  errorPaymentAccounts: state.tasafPayment.errorPaymentAccounts,
  paymentAccounts: state.tasafPayment.paymentAccounts,
  paymentAccountsPageInfo: state.tasafPayment.paymentAccountsPageInfo,
  paymentAccountsTotalCount: state.tasafPayment.paymentAccountsTotalCount,
  dashboardCounts: state.tasafPayment.dashboardCounts,
  gepgRequests: state.tasafPayment.gepgRequests,
  fetchingVerificationPreview: state.tasafPayment.fetchingVerificationPreview,
  verificationPreview: state.tasafPayment.verificationPreview,
  errorVerificationPreview: state.tasafPayment.errorVerificationPreview,
  submittingMutation: state.tasafPayment.submittingMutation,
  mutation: state.tasafPayment.mutation,
  confirmed: state.core.confirmed,
});

const mapDispatchToProps = (dispatch) => bindActionCreators(
  {
    fetchPaymentAccounts,
    fetchDashboardCounts,
    runVerification,
    runBatchVerification,
    approvePaymentAccounts,
    fetchVerificationPreview,
    reviewPaymentAccount,
    fetchGepgRequests,
    fetchVerificationOutcome,
    journalize,
    coreConfirm,
    clearConfirm,
  },
  dispatch,
);

export default connect(mapStateToProps, mapDispatchToProps)(VerificationResultsPage);
