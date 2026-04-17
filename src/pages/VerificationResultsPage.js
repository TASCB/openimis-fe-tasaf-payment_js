import React, { useState, useRef, useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';

import { Paper, Grid, Button, Tooltip, Box } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import SendIcon from '@material-ui/icons/Send';
import AssignmentReturnIcon from '@material-ui/icons/AssignmentReturn';

import {
  Contributions,
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
  TASAF_PAYMENT_TABS_LABEL_CONTRIBUTION_KEY,
  TAB_PASSED,
  TAB_FAILED,
} from '../constants';
import {
  fetchPaymentAccounts,
  runVerification,
  routeToCorrection,
} from '../actions';
import PaymentAccountFilter from '../components/PaymentAccountFilter';
import StatusBadge from '../components/StatusBadge';

const useStyles = makeStyles((theme) => ({
  paper: theme.paper.paper,
  tableTitle: theme.table.title,
  tabs: {
    display: 'flex',
    alignItems: 'center',
  },
  selectedTab: {
    borderBottom: '4px solid white',
  },
  unselectedTab: {
    borderBottom: '4px solid transparent',
  },
  actions: {
    display: 'flex',
    gap: theme.spacing(1),
    padding: theme.spacing(1, 0),
  },
}));

function VerificationResultsPage({
  fetchPaymentAccounts,
  runVerification,
  routeToCorrection,
  fetchingPaymentAccounts,
  fetchedPaymentAccounts,
  errorPaymentAccounts,
  paymentAccounts,
  paymentAccountsPageInfo,
  paymentAccountsTotalCount,
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

  const isSelected = (tab) => tab === activeTab;
  const tabStyle = (tab) => (isSelected(tab) ? classes.selectedTab : classes.unselectedTab);
  const handleTabChange = (_, tab) => { setActiveTab(tab); setSelectedAccounts([]); };

  const tabStatus = activeTab === TAB_PASSED
    ? VERIFICATION_STATUS.VERIFIED
    : VERIFICATION_STATUS.FAILED;

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

  return (
    <Paper className={classes.paper}>
      <Grid container className={`${classes.tableTitle} ${classes.tabs}`}>
        <Contributions
          contributionKey={TASAF_PAYMENT_TABS_LABEL_CONTRIBUTION_KEY}
          value={activeTab}
          onChange={handleTabChange}
          isSelected={isSelected}
          tabStyle={tabStyle}
          modulesManager={modulesManager}
        />
      </Grid>

      <Box className={classes.actions}>
        {rights.includes(RIGHT_RUN_VERIFICATION) && (
          <Tooltip title={formatMessage('button.sendToMuse')}>
            <span>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SendIcon />}
                disabled={!canAct}
                onClick={() => setPendingAction({ type: 'resend', accounts: selectedAccounts })}
              >
                {formatMessage('button.sendToMuse')}
              </Button>
            </span>
          </Tooltip>
        )}
        {activeTab === TAB_FAILED && rights.includes(RIGHT_APPROVE_ACCOUNTS) && (
          <Tooltip title={formatMessage('button.routeToCorrection')}>
            <span>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<AssignmentReturnIcon />}
                disabled={!canAct}
                onClick={() => setPendingAction({ type: 'routeCorrection', accounts: selectedAccounts })}
              >
                {formatMessage('button.routeToCorrection')}
              </Button>
            </span>
          </Tooltip>
        )}
      </Box>

      <Searcher
        module={MODULE_NAME}
        FilterPane={(props) => <PaymentAccountFilter {...props} showStatusFilter={false} />}
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
      />
    </Paper>
  );
}

const mapStateToProps = (state) => ({
  fetchingPaymentAccounts: state.tasafPayment.fetchingPaymentAccounts,
  fetchedPaymentAccounts: state.tasafPayment.fetchedPaymentAccounts,
  errorPaymentAccounts: state.tasafPayment.errorPaymentAccounts,
  paymentAccounts: state.tasafPayment.paymentAccounts,
  paymentAccountsPageInfo: state.tasafPayment.paymentAccountsPageInfo,
  paymentAccountsTotalCount: state.tasafPayment.paymentAccountsTotalCount,
  submittingMutation: state.tasafPayment.submittingMutation,
  mutation: state.tasafPayment.mutation,
  confirmed: state.core.confirmed,
});

const mapDispatchToProps = (dispatch) => bindActionCreators(
  {
    fetchPaymentAccounts,
    runVerification,
    routeToCorrection,
    journalize,
    coreConfirm,
    clearConfirm,
  },
  dispatch,
);

export default connect(mapStateToProps, mapDispatchToProps)(VerificationResultsPage);
