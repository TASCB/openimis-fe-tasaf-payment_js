import React, { useState, useRef, useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';

import { makeStyles } from '@material-ui/styles';
import SendIcon from '@material-ui/icons/Send';
import AssignmentReturnIcon from '@material-ui/icons/AssignmentReturn';

import {
  Helmet,
  Searcher,
  useModulesManager,
  useTranslations,
  coreConfirm,
  clearConfirm,
  journalize,
} from '@openimis/fe-core';

import {
  MODULE_NAME,
  RIGHT_RUN_VERIFICATION,
  RIGHT_APPROVE_ACCOUNTS,
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
  VERIFICATION_STATUS,
  TAB_PASSED,
  TAB_FAILED,
} from '../constants';
import {
  fetchPaymentAccounts,
  fetchDashboardCounts,
  runVerification,
  routeToCorrection,
} from '../actions';
import PaymentAccountFilter from '../components/PaymentAccountFilter';
import StatusBadge from '../components/StatusBadge';

const useStyles = makeStyles((theme) => ({
  page: theme.page,
}));

function VerificationResultsPage({
  fetchPaymentAccounts,
  fetchDashboardCounts,
  runVerification,
  routeToCorrection,
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

  const [activeTab, setActiveTab] = useState(TAB_PASSED);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const prevSubmittingMutationRef = useRef();

  const handleTabChange = (_, tab) => { setActiveTab(tab); setSelectedAccounts([]); };

  const tabStatus = activeTab === TAB_PASSED
    ? VERIFICATION_STATUS.VERIFIED
    : VERIFICATION_STATUS.FAILED;
  const passedCount = dashboardCounts?.accounts?.[VERIFICATION_STATUS.VERIFIED] ?? 0;
  const failedCount = dashboardCounts?.accounts?.[VERIFICATION_STATUS.FAILED] ?? 0;

  useEffect(() => {
    fetchDashboardCounts();
  }, [fetchDashboardCounts]);

  useEffect(() => {
    if (!pendingAction) return;
    const { type, accounts } = pendingAction;
    const count = accounts.length;
    if (type === 'resend') {
      coreConfirm(
        formatMessage('verificationResults.resend.confirm.title'),
        formatMessageWithValues('verificationResults.resend.confirm.message', { count }),
      );
    } else if (type === 'routeCorrection') {
      coreConfirm(
        formatMessage('verificationResults.routeCorrection.confirm.title'),
        formatMessageWithValues('verificationResults.routeCorrection.confirm.message', { count }),
      );
    }
  }, [pendingAction]);

  useEffect(() => {
    if (!pendingAction) return;
    if (confirmed) {
      const { type, accounts } = pendingAction;
      const uuids = accounts.map((a) => a.uuid);
      if (type === 'resend') {
        runVerification(uuids, formatMessageWithValues('mutation.runVerificationLabel', { count: uuids.length }));
      } else if (type === 'routeCorrection') {
        routeToCorrection(uuids, '', formatMessage('mutation.routeToCorrectionLabel'));
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
    formatMessage('paymentAccount.museVerificationReference'),
    formatMessage('paymentAccount.verificationStatus'),
  ];

  const itemFormatters = () => [
    (row) => row.accountNumber,
    (row) => row.accountName ?? '',
    (row) => formatMessage(`paymentAccount.fspType.${row.fspType}`),
    (row) => row.fspName,
    (row) => row.museVerificationReference ?? '-',
    (row) => <StatusBadge status={row.verificationStatus} />,
  ];

  const canAct = selectedAccounts.length > 0 && !submittingMutation;
  const searcherActions = [
    {
      label: formatMessage('button.sendToMuse'),
      icon: <SendIcon />,
      onClick: () => setPendingAction({ type: 'resend', accounts: selectedAccounts }),
      authorized: rights.includes(RIGHT_RUN_VERIFICATION) && canAct,
    },
    {
      label: formatMessage('button.routeToCorrection'),
      icon: <AssignmentReturnIcon />,
      onClick: () => setPendingAction({ type: 'routeCorrection', accounts: selectedAccounts }),
      authorized: activeTab === TAB_FAILED && rights.includes(RIGHT_APPROVE_ACCOUNTS) && canAct,
    },
  ];

  return (
    <div className={classes.page}>
      <Helmet title={formatMessage('verificationResults.page.title')} />
      <Searcher
        module={MODULE_NAME}
        FilterPane={(props) => (
          <PaymentAccountFilter
            {...props}
            showStatusFilter={false}
            verificationTabs={{
              activeTab,
              onChange: handleTabChange,
              passedValue: TAB_PASSED,
              failedValue: TAB_FAILED,
              passedCount,
              failedCount,
            }}
          />
        )}
        fetch={(params) => fetchPaymentAccounts([...(params || []), `verificationStatus: ${tabStatus}`])}
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
    routeToCorrection,
    journalize,
    coreConfirm,
    clearConfirm,
  },
  dispatch,
);

export default connect(mapStateToProps, mapDispatchToProps)(VerificationResultsPage);
