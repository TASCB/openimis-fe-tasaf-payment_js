import React, { useState, useRef, useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';

import { makeStyles } from '@material-ui/styles';
import FactCheckIcon from '@material-ui/icons/PlaylistAddCheck';
import DoneAllIcon from '@material-ui/icons/DoneAll';

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
  RIGHT_RUN_PRE_AUDIT,
  ROUTE_REF_GROUP,
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
  VERIFICATION_STATUS,
} from '../constants';
import { fetchPaymentAccounts, runPreAudit, runBatchPreAudit } from '../actions';
import PaymentAccountFilter from '../components/PaymentAccountFilter';
import { defaultPageStyles } from '../utils/styles';

const VERIFIED_FILTER = `verificationStatus: ${VERIFICATION_STATUS.VERIFIED}`;

const useStyles = makeStyles((theme) => defaultPageStyles(theme));

const PRE_AUDIT_REASON_CODES = [
  'NOT_VERIFIED', 'NOT_PRIMARY', 'NO_BENEFICIARY', 'BENEFICIARY_INACTIVE',
];

function rawPreAuditReasons(row) {
  const raw = row?.jsonExt;
  if (!raw) return [];
  try {
    const ext = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const reasons = ext?.pre_audit_failures;
    return Array.isArray(reasons) ? reasons : [];
  } catch (error) {
    return [];
  }
}

function PreAuditPage({
  fetchPaymentAccounts,
  runPreAudit,
  runBatchPreAudit,
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
  const history = useHistory();

  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [pendingAudit, setPendingAudit] = useState(null);
  const [batchPending, setBatchPending] = useState(false);
  const [location, setLocation] = useState(null);
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
    if (batchPending) {
      coreConfirm(
        formatMessage('preAudit.batch.confirm.title'),
        location
          ? formatMessageWithValues('preAudit.batch.confirm.message', {
            location: location.name,
          })
          : formatMessage('batch.needsArea'),
      );
    }
  }, [batchPending]);

  useEffect(() => {
    if (pendingAudit && confirmed) {
      runPreAudit(
        pendingAudit.map((a) => a.uuid),
        formatMessageWithValues('mutation.runPreAuditLabel', { count: pendingAudit.length }),
      );
      setPendingAudit(null);
    }
    if (batchPending && confirmed && location) {
      runBatchPreAudit(
        { locationId: location?.id, rerun: true },
        formatMessageWithValues('mutation.runBatchPreAuditLabel', { location: location?.name ?? '' }),
      );
      setBatchPending(false);
    }
    if (confirmed !== null) { setPendingAudit(null); setBatchPending(false); }
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
    formatMessage('paymentAccount.preAuditStatus'),
    formatMessage('paymentAccount.preAuditReason'),
  ];

  const itemFormatters = () => [
    (row) => row.accountNumber,
    (row) => row.accountName ?? '',
    (row) => formatMessage(`paymentAccount.fspType.${row.fspType}`),
    (row) => row.fspName,
    // The keys exist (paymentAccount.preAuditStatus.PASSED/FAILED/PENDING); rendering the
    // bare enum here left an untranslated value in a translated table.
    (row) => (row.preAuditStatus
      ? formatMessage(`paymentAccount.preAuditStatus.${row.preAuditStatus}`)
      : '-'),
    // The reasons were always computed and stored; they were simply never displayed,
    // so a FAILED row read as a verdict with no evidence behind it.
    (row) => {
      const reasons = rawPreAuditReasons(row).map((r) => (
        PRE_AUDIT_REASON_CODES.includes(r) ? formatMessage(`preAudit.reason.${r}`) : r
      ));
      return reasons.length ? reasons.join('; ') : '-';
    },
  ];

  const groupUuidOf = (row) => row?.groupBeneficiary?.group?.uuid ?? null;
  const canOpenGroup = !!modulesManager.getRef(ROUTE_REF_GROUP);
  const openGroup = (row, newTab = false) => {
    const uuid = groupUuidOf(row);
    if (!uuid) return;
    historyPush(modulesManager, history, ROUTE_REF_GROUP, [uuid], newTab);
  };

  const canRun = rights.includes(RIGHT_RUN_PRE_AUDIT);
  const canAct = selectedAccounts.length > 0 && !submittingMutation && canRun;
  const searcherActions = [
    {
      label: formatMessage('button.runPreAudit'),
      icon: <FactCheckIcon />,
      onClick: () => setPendingAudit(selectedAccounts),
      authorized: canAct,
    },
    {
      // Area-scoped -- see the note on the verification tab for why this is a labelled
      // button beside the Area (PAA) filter and not a Fab.
      label: location
        ? formatMessageWithValues('button.preAuditAreaNamed', { location: location.name })
        : formatMessage('button.preAuditArea'),
      icon: <DoneAllIcon />,
      onClick: () => setBatchPending(true),
      authorized: !submittingMutation && canRun,
    },
  ];

  return (
    <div className={classes.page}>
      <Helmet title={formatMessage('preAudit.page.title')} />
      <Searcher
        module={MODULE_NAME}
        FilterPane={(props) => (
          <PaymentAccountFilter
            {...props}
            showStatusFilter={false}
            showPreAuditFilter
            showLocationFilter
            location={location}
            onChangeLocation={setLocation}
          />
        )}
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
        onDoubleClick={canOpenGroup ? openGroup : undefined}
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
  submittingMutation: state.tasafPayment.submittingMutation,
  mutation: state.tasafPayment.mutation,
  confirmed: state.core.confirmed,
});

const mapDispatchToProps = (dispatch) => bindActionCreators(
  { fetchPaymentAccounts, runPreAudit, runBatchPreAudit, journalize, coreConfirm, clearConfirm },
  dispatch,
);

export default connect(mapStateToProps, mapDispatchToProps)(PreAuditPage);
