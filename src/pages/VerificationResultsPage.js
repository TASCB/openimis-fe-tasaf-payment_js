import React, { useState, useRef, useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';

import { makeStyles } from '@material-ui/styles';
import SendIcon from '@material-ui/icons/Send';
import VerifiedUserIcon from '@material-ui/icons/VerifiedUser';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import CancelIcon from '@material-ui/icons/Cancel';

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
  TAB_SUCCESS,
  TAB_FAILED,
} from '../constants';
import {
  fetchPaymentAccounts,
  fetchDashboardCounts,
  runVerification,
  runBatchVerification,
  approvePaymentAccounts,
} from '../actions';
import PaymentAccountFilter from '../components/PaymentAccountFilter';
import StatusBadge from '../components/StatusBadge';
import { defaultPageStyles } from '../utils/styles';

// 6 columns, so the shared equal-width rule applies.
const useStyles = makeStyles(defaultPageStyles);

function VerificationResultsPage({
  fetchPaymentAccounts,
  fetchDashboardCounts,
  runVerification,
  runBatchVerification,
  approvePaymentAccounts,
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
  const [activeTab, setActiveTab] = useState(TAB_PENDING);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const [location, setLocation] = useState(null);
  const prevSubmittingMutationRef = useRef();

  const handleTabChange = (_, tab) => {
    setActiveTab(tab);
    setSelectedAccounts([]);
    // The remount below resets the Searcher's filters; clear the picker with them so it
    // never shows an area that is no longer being filtered on.
    setLocation(null);
  };


  const isPending = activeTab === TAB_PENDING;
  const isSuccess = activeTab === TAB_SUCCESS;
  let statusFilter;
  if (isPending) statusFilter = 'verificationStatusIn: [PENDING, PENDING_MUSE]';
  else if (isSuccess) statusFilter = `verificationStatus: ${VERIFICATION_STATUS.VERIFIED}`;
  else statusFilter = 'verificationStatusIn: [FAILED, MANUAL]';

  const passedCount = dashboardCounts?.accounts?.[VERIFICATION_STATUS.VERIFIED] ?? 0;
  const failedCount = dashboardCounts?.accounts?.[VERIFICATION_STATUS.FAILED] ?? 0;
  const manualCount = dashboardCounts?.accounts?.[VERIFICATION_STATUS.MANUAL] ?? 0;
  const pendingCount = (dashboardCounts?.accounts?.[VERIFICATION_STATUS.PENDING] ?? 0)
    + (dashboardCounts?.accounts?.[VERIFICATION_STATUS.PENDING_MUSE] ?? 0);

  useEffect(() => {
    fetchDashboardCounts();
  }, [fetchDashboardCounts]);

  useEffect(() => {
    if (!pendingAction) return;
    const { type, accounts } = pendingAction;
    const count = accounts.length;
    if (type === 'send' || type === 'resend') {
      coreConfirm(
        formatMessage(`verificationResults.${type}.confirm.title`),
        formatMessageWithValues(`verificationResults.${type}.confirm.message`, { count }),
      );
    } else if (type === 'batch') {
      coreConfirm(
        formatMessage('verificationResults.batch.confirm.title'),
        location
          ? formatMessageWithValues('verificationResults.batch.confirm.message', {
            location: location.name,
          })
          : formatMessage('batch.needsArea'),
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
      } else if (type === 'batch' && location) {
        // Dispatches everything still PENDING in this PAA, not just the loaded page --
        // the backend rebuilds the queryset from the filter and fans out over Celery.
        runBatchVerification(
          { locationId: location?.id },
          formatMessageWithValues('mutation.runBatchVerificationLabel', { location: location?.name ?? '' }),
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
    return () => confirmed !== null && clearConfirm(false);
  }, [confirmed]);

  useEffect(() => {
    if (prevSubmittingMutationRef.current && !submittingMutation) journalize(mutation);
  }, [submittingMutation]);
  useEffect(() => { prevSubmittingMutationRef.current = submittingMutation; });

  const headers = () => [
    formatMessage('paymentAccount.accountNumber'),
    formatMessage('paymentAccount.accountName'),
    formatMessage('paymentAccount.fspType'),
    formatMessage('paymentAccount.fspName'),
    formatMessage('paymentAccount.verificationStatus'),
    formatMessage('paymentAccount.failureReason'),
  ];

  const itemFormatters = () => [
    (row) => row.accountNumber,
    (row) => row.accountName ?? '',
    (row) => formatMessage(`paymentAccount.fspType.${row.fspType}`),
    (row) => row.fspName,
    (row) => <StatusBadge status={row.verificationStatus} />,
    (row) => row.lastFailureReason ?? '-',
  ];

  const canOpenCorrection = !!modulesManager.getRef(ROUTE_REF_ACCOUNT_CORRECTION)
    && rights.includes(RIGHT_ACCOUNT_CORRECTION);
  const openCorrection = (row, newTab = false) => {
    if (row.verificationStatus !== VERIFICATION_STATUS.FAILED) return;
    historyPush(modulesManager, history, ROUTE_REF_ACCOUNT_CORRECTION, [row.uuid], newTab);
  };

  const canAct = !submittingMutation;
  const withStatus = (status) => (canAct
    ? selectedAccounts.filter((a) => a.verificationStatus === status)
    : []);
  const manualSelected = withStatus(VERIFICATION_STATUS.MANUAL);
  const failedSelected = withStatus(VERIFICATION_STATUS.FAILED);
  // PENDING_MUSE is already in flight; re-sending it would duplicate the request, so it is
  // excluded from the subset rather than blocking the whole action.
  const unsentSelected = withStatus(VERIFICATION_STATUS.PENDING);
  // Success accounts are done — re-verifying them is wrong, and they qualify for payment
  // automatically through paylist generation, so the Success tab offers no send action.
    const failedActions = [
    {
      // A borderline name match an officer can clear without a field visit.
      label: formatMessage('button.confirmMatch'),
      icon: <CheckCircleIcon />,
      onClick: () => setPendingAction({ type: 'approve', accounts: manualSelected }),
      authorized: manualSelected.length > 0 && rights.includes(RIGHT_APPROVE_ACCOUNTS),
    },
    {
      label: formatMessage('button.reject'),
      icon: <CancelIcon />,
      onClick: () => setPendingAction({ type: 'reject', accounts: manualSelected }),
      authorized: manualSelected.length > 0 && rights.includes(RIGHT_APPROVE_ACCOUNTS),
    },
    {
      label: formatMessage('button.sendToMuse'),
      icon: <SendIcon />,
      onClick: () => setPendingAction({ type: 'resend', accounts: failedSelected }),
      authorized: failedSelected.length > 0 && rights.includes(RIGHT_RUN_VERIFICATION),
    },
  ];
  const canVerify = rights.includes(RIGHT_RUN_VERIFICATION);
  const pendingActions = [
    {
      label: formatMessage('button.sendToMuse'),
      icon: <SendIcon />,
      onClick: () => setPendingAction({ type: 'send', accounts: unsentSelected }),
      authorized: unsentSelected.length > 0 && canVerify,
    },
    {
      label: location
        ? formatMessageWithValues('button.verifyAreaNamed', { location: location.name })
        : formatMessage('button.verifyArea'),
      icon: <VerifiedUserIcon />,
      onClick: () => setPendingAction({ type: 'batch', accounts: [] }),
      authorized: !submittingMutation && canVerify,
    },
  ];

  let searcherActions;
  if (isPending) searcherActions = pendingActions;
  else if (isSuccess) searcherActions = [];
  else searcherActions = failedActions;

  return (
    <div className={classes.page}>
      <Helmet title={formatMessage('verificationResults.page.title')} />
      <Searcher
        key={activeTab}
        module={MODULE_NAME}
        FilterPane={(props) => (
          <PaymentAccountFilter
            {...props}
            showStatusFilter={false}
            showLocationFilter
            location={location}
            onChangeLocation={setLocation}
            verificationTabs={{
              activeTab,
              onChange: handleTabChange,
              passedValue: TAB_SUCCESS,
              failedValue: TAB_FAILED,
              passedCount,
              failedCount,
              manualCount,
              pendingCount,
            }}
          />
        )}
        fetch={(params) => fetchPaymentAccounts([...(params || []), statusFilter])}
        items={paymentAccounts}
        itemsPageInfo={paymentAccountsPageInfo}
        fetchingItems={fetchingPaymentAccounts}
        fetchedItems={fetchedPaymentAccounts}
        errorItems={errorPaymentAccounts}
        tableTitle={formatMessageWithValues('searcher.results', { totalCount: paymentAccountsTotalCount })}
        headers={headers}
        itemFormatters={itemFormatters}
        rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
        defaultPageSize={DEFAULT_PAGE_SIZE}
        rowIdentifier={(row) => row.id}
        onDoubleClick={!isSuccess && canOpenCorrection ? openCorrection : undefined}
        withSelection="multiple"
        onChangeSelection={setSelectedAccounts}
        enableActionButtons
        searcherActions={searcherActions}
        searcherActionsPosition="header-right"
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
    journalize,
    coreConfirm,
    clearConfirm,
  },
  dispatch,
);

export default connect(mapStateToProps, mapDispatchToProps)(VerificationResultsPage);
