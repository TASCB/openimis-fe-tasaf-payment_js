import React, { useState, useRef, useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';

import { Button } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import CancelIcon from '@material-ui/icons/Cancel';

import {
  Searcher,
  useModulesManager,
  useTranslations,
  coreConfirm,
  clearConfirm,
  journalize,
} from '@openimis/fe-core';

import {
  MODULE_NAME,
  RIGHT_APPROVE_ACCOUNTS,
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
  VERIFICATION_STATUS,
} from '../constants';
import { fetchPaymentAccounts, approvePaymentAccounts } from '../actions';
import PaymentAccountFilter from '../components/PaymentAccountFilter';
import StatusBadge from '../components/StatusBadge';

const useStyles = makeStyles((theme) => ({
  actions: { display: 'flex', gap: theme.spacing(1), marginBottom: theme.spacing(1) },
}));

const MANUAL_FILTER = `verificationStatus: ${VERIFICATION_STATUS.MANUAL}`;

function AccountApprovalPage({
  fetchPaymentAccounts,
  approvePaymentAccounts,
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

  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const prevSubmittingMutationRef = useRef();

  const openConfirmDialog = (approved) => {
    const key = approved ? 'approve' : 'reject';
    coreConfirm(
      formatMessage(`${key}.confirm.title`),
      formatMessageWithValues(`${key}.confirm.message`, { count: selectedAccounts.length }),
    );
    setPendingAction({ approved });
  };

  useEffect(() => {
    if (pendingAction && confirmed) {
      approvePaymentAccounts(
        selectedAccounts.map((a) => a.uuid),
        pendingAction.approved,
        '',
        formatMessage(pendingAction.approved ? 'mutation.approveLabel' : 'mutation.rejectLabel'),
      );
      setPendingAction(null);
    }
    if (pendingAction && confirmed !== null) {
      setPendingAction(null);
    }
    return () => confirmed !== null && clearConfirm(false);
  }, [confirmed]);

  useEffect(() => {
    if (prevSubmittingMutationRef.current && !submittingMutation) {
      journalize(mutation);
    }
  }, [submittingMutation]);

  useEffect(() => {
    prevSubmittingMutationRef.current = submittingMutation;
  });

  const headers = () => [
    formatMessage('paymentAccount.accountNumber'),
    formatMessage('paymentAccount.accountName'),
    formatMessage('paymentAccount.fspName'),
    formatMessage('paymentAccount.museVerificationReference'),
    formatMessage('paymentAccount.verificationStatus'),
  ];

  const itemFormatters = () => [
    (row) => row.accountNumber,
    (row) => row.accountName ?? '',
    (row) => row.fspName,
    (row) => row.museVerificationReference ?? '-',
    (row) => <StatusBadge status={row.verificationStatus} />,
  ];

  const canAct = selectedAccounts.length > 0 && !submittingMutation
    && rights.includes(RIGHT_APPROVE_ACCOUNTS);

  return (
    <div>
      <div className={classes.actions}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<CheckCircleIcon />}
          onClick={() => openConfirmDialog(true)}
          disabled={!canAct}
        >
          {formatMessage('button.approve')}
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          startIcon={<CancelIcon />}
          onClick={() => openConfirmDialog(false)}
          disabled={!canAct}
        >
          {formatMessage('button.reject')}
        </Button>
      </div>
      <Searcher
        module={MODULE_NAME}
        FilterPane={(props) => <PaymentAccountFilter {...props} showStatusFilter={false} />}
        fetch={(params) => fetchPaymentAccounts([...(params || []), MANUAL_FILTER])}
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
  submittingMutation: state.tasafPayment.submittingMutation,
  mutation: state.tasafPayment.mutation,
  confirmed: state.core.confirmed,
});

const mapDispatchToProps = (dispatch) => bindActionCreators(
  { fetchPaymentAccounts, approvePaymentAccounts, journalize, coreConfirm, clearConfirm },
  dispatch,
);

export default connect(mapStateToProps, mapDispatchToProps)(AccountApprovalPage);
