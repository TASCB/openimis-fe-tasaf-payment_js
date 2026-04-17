import React, { useState, useRef, useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';

import { Button, Tooltip, Box } from '@material-ui/core';
import FactCheckIcon from '@material-ui/icons/PlaylistAddCheck';

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
  RIGHT_RUN_PRE_AUDIT,
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
  VERIFICATION_STATUS,
} from '../constants';
import { fetchPaymentAccounts, runPreAudit } from '../actions';
import PaymentAccountFilter from '../components/PaymentAccountFilter';
import StatusBadge from '../components/StatusBadge';

const VERIFIED_FILTER = `verificationStatus: ${VERIFICATION_STATUS.VERIFIED}`;

function PreAuditPage({
  fetchPaymentAccounts,
  runPreAudit,
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
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const rights = useSelector((store) => store.core?.user?.i_user?.rights ?? []);

  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [pendingAudit, setPendingAudit] = useState(null);
  const prevSubmittingMutationRef = useRef();

  useEffect(() => {
    if (pendingAudit) {
      coreConfirm(
        formatMessage('preAudit.confirm.title'),
        formatMessageWithValues('preAudit.confirm.message', { count: pendingAudit.length }),
      );
    }
  }, [pendingAudit]);

  useEffect(() => {
    if (pendingAudit && confirmed) {
      runPreAudit(
        pendingAudit.map((a) => a.uuid),
        formatMessageWithValues('mutation.runPreAuditLabel', { count: pendingAudit.length }),
      );
      setPendingAudit(null);
    }
    if (pendingAudit && confirmed !== null) setPendingAudit(null);
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
    formatMessage('paymentAccount.preAuditStatus'),
  ];

  const itemFormatters = () => [
    (row) => row.accountNumber,
    (row) => row.accountName ?? '',
    (row) => formatMessage(`paymentAccount.fspType.${row.fspType}`),
    (row) => row.fspName,
    (row) => <StatusBadge status={row.verificationStatus} />,
    (row) => row.preAuditStatus ?? '-',
  ];

  const canAct = selectedAccounts.length > 0 && !submittingMutation && rights.includes(RIGHT_RUN_PRE_AUDIT);

  return (
    <div>
      <Box mb={1}>
        <Tooltip title={formatMessage('button.runPreAudit')}>
          <span>
            <Button
              variant="contained"
              color="primary"
              startIcon={<FactCheckIcon />}
              disabled={!canAct}
              onClick={() => setPendingAudit(selectedAccounts)}
            >
              {formatMessage('button.runPreAudit')}
            </Button>
          </span>
        </Tooltip>
      </Box>
      <Searcher
        module={MODULE_NAME}
        FilterPane={(props) => <PaymentAccountFilter {...props} showStatusFilter={false} showPreAuditFilter />}
        fetch={(params) => fetchPaymentAccounts([...(params || []), VERIFIED_FILTER])}
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
  { fetchPaymentAccounts, runPreAudit, journalize, coreConfirm, clearConfirm },
  dispatch,
);

export default connect(mapStateToProps, mapDispatchToProps)(PreAuditPage);
