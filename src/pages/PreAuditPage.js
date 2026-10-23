import React, { useState, useRef, useEffect } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';

import { makeStyles } from '@material-ui/styles';
import { Grid, Paper, Tab } from '@material-ui/core';
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
  PublishedComponent,
} from '@openimis/fe-core';

import {
  MODULE_NAME,
  RIGHT_RUN_PRE_AUDIT,
  ROUTE_REF_GROUP,
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
  VERIFICATION_STATUS,
  PRE_AUDIT_TAB_OVERVIEW,
  PRE_AUDIT_TAB_ACCOUNTS,
  PRE_AUDIT_TAB_COMPLIANCE,
  PRE_AUDIT_TAB_DUPLICATES,
} from '../constants';
import { fetchPaymentAccounts, runPreAudit, runBatchPreAudit } from '../actions';
import PaymentAccountFilter from '../components/PaymentAccountFilter';
import PreAuditOverview from '../components/preAudit/PreAuditOverview';
import PreAuditCompliance from '../components/preAudit/PreAuditCompliance';
import PreAuditDuplicates from '../components/preAudit/PreAuditDuplicates';
import { FilterExtrasProvider, withFilterExtras } from '../utils/filterExtras';
import { defaultPageStyles } from '../utils/styles';

const VERIFIED_FILTER = `verificationStatus: ${VERIFICATION_STATUS.VERIFIED}`;

const AccountFilterPane = withFilterExtras(PaymentAccountFilter);

const useStyles = makeStyles((theme) => ({
  ...defaultPageStyles(theme),
  paper: theme.paper.paper,
  tableTitle: theme.table.title,
  tabs: { display: 'flex', alignItems: 'center' },
  selectedTab: { borderBottom: '4px solid white' },
  unselectedTab: { borderBottom: '4px solid transparent' },
  windowForm: { padding: theme.spacing(2) },
}));

const PRE_AUDIT_REASON_CODES = [
  'NOT_VERIFIED', 'NOT_PRIMARY', 'NO_BENEFICIARY', 'BENEFICIARY_INACTIVE',
  'INVALID_MOBILE_NUMBER', 'FIRST_PAYMENT_CHECK_DUE',
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

  const [pendingAudit, setPendingAudit] = useState(null);
  const [batchPending, setBatchPending] = useState(false);
  const [location, setLocation] = useState(null);
  const [paymentWindow, setPaymentWindow] = useState(null);
  const [activeTab, setActiveTab] = useState(PRE_AUDIT_TAB_OVERVIEW);
  const isSelected = (tab) => tab === activeTab;
  const tabStyle = (tab) => (isSelected(tab) ? classes.selectedTab : classes.unselectedTab);
  const onTabChange = (_, tab) => setActiveTab(tab);
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
    return () => confirmed && clearConfirm(null);
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
  const selectionActions = [{
    label: 'tasafPayment.button.runPreAudit',
    enabled: (selection) => selection.length > 0 && !submittingMutation && canRun,
    action: (selection) => setPendingAudit(selection),
  }];
  const searcherActions = [
    {
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
      <Paper className={classes.paper}>
        <Grid container className={classes.windowForm}>
          <Grid item xs={12} md={4}>
            <PublishedComponent
              pubRef="paymentCycle.PaymentCyclePicker"
              withLabel
              label={formatMessage('preAudit.window')}
              value={paymentWindow}
              onChange={(value) => setPaymentWindow(value)}
            />
          </Grid>
        </Grid>
      </Paper>
      <Paper className={classes.paper}>
        <Grid container className={`${classes.tableTitle} ${classes.tabs}`}>
          <Tab
            onChange={onTabChange}
            className={tabStyle(PRE_AUDIT_TAB_OVERVIEW)}
            selected={isSelected(PRE_AUDIT_TAB_OVERVIEW)}
            value={PRE_AUDIT_TAB_OVERVIEW}
            label={formatMessage('preAudit.tab.overview')}
          />
          <Tab
            onChange={onTabChange}
            className={tabStyle(PRE_AUDIT_TAB_ACCOUNTS)}
            selected={isSelected(PRE_AUDIT_TAB_ACCOUNTS)}
            value={PRE_AUDIT_TAB_ACCOUNTS}
            label={formatMessage('preAudit.tab.accounts')}
          />
          <Tab
            onChange={onTabChange}
            className={tabStyle(PRE_AUDIT_TAB_COMPLIANCE)}
            selected={isSelected(PRE_AUDIT_TAB_COMPLIANCE)}
            value={PRE_AUDIT_TAB_COMPLIANCE}
            label={formatMessage('preAudit.tab.compliance')}
          />
          <Tab
            onChange={onTabChange}
            className={tabStyle(PRE_AUDIT_TAB_DUPLICATES)}
            selected={isSelected(PRE_AUDIT_TAB_DUPLICATES)}
            value={PRE_AUDIT_TAB_DUPLICATES}
            label={formatMessage('preAudit.tab.duplicates')}
          />
        </Grid>
        <PublishedComponent
          pubRef="policyHolder.TabPanel"
          module={MODULE_NAME}
          index={PRE_AUDIT_TAB_OVERVIEW}
          value={activeTab}
        >
          <PreAuditOverview paymentWindow={paymentWindow} />
        </PublishedComponent>
        <PublishedComponent
          pubRef="policyHolder.TabPanel"
          module={MODULE_NAME}
          index={PRE_AUDIT_TAB_COMPLIANCE}
          value={activeTab}
        >
          {isSelected(PRE_AUDIT_TAB_COMPLIANCE) && <PreAuditCompliance paymentWindow={paymentWindow} />}
        </PublishedComponent>
        <PublishedComponent
          pubRef="policyHolder.TabPanel"
          module={MODULE_NAME}
          index={PRE_AUDIT_TAB_DUPLICATES}
          value={activeTab}
        >
          {isSelected(PRE_AUDIT_TAB_DUPLICATES) && <PreAuditDuplicates paymentWindow={paymentWindow} />}
        </PublishedComponent>
      </Paper>
      <div hidden={!isSelected(PRE_AUDIT_TAB_ACCOUNTS)}>
        <FilterExtrasProvider value={{
          showStatusFilter: false, showPreAuditFilter: true, showLocationFilter: true, location, onChangeLocation: setLocation,
        }}
        >
          <Searcher
            module={MODULE_NAME}
            FilterPane={AccountFilterPane}
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
            actions={selectionActions}
            enableActionButtons
            searcherActions={searcherActions}
            searcherActionsPosition="header-right"
          />
        </FilterExtrasProvider>
      </div>
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
