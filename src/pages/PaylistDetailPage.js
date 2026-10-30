import React, { useEffect, useRef, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';

import {
  Paper, IconButton, Tooltip, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';

import {
  Helmet,
  Searcher,
  useHistory,
  useModulesManager,
  useTranslations,
  coreConfirm,
  clearConfirm,
  journalize,
  downloadExport,
} from '@openimis/fe-core';
// Reuse the payroll module's PDF helpers — the MUSE dispatch paylist is built
// from the underlying payroll, but the export lives here on the TASAF surface.
import { exportPaylistPdf } from '@openimis/fe-payroll';
import buildPaylistPdfPayload from '../utils/paylistPdf';

import {
  MODULE_NAME,
  RIGHT_APPROVE_PAYLIST,
  RIGHT_SUBMIT_PAYLIST,
  RIGHT_PAYLIST_SEARCH,
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
  PAYLIST_STATUS,
  WS_TAB_PAYLISTS,
} from '../constants';
import {
  fetchPaylistItems, approvePaylist, submitPaylist, fetchPaylistHeader, fetchPaylistForExport, fetchMusePaylistPreview,
  fetchPaylistMuseLog, fetchPaylistFspOptions, exportPaylistItems,
} from '../actions';
import StatusChip from '../components/StatusChip';
import ReturnedPaymentDialog from '../components/ReturnedPaymentDialog';
import MusePayloadDialog from '../components/MusePayloadDialog';
import PaylistItemFilter from '../components/PaylistItemFilter';
import { FilterExtrasProvider, withFilterExtras } from '../utils/filterExtras';
import PaylistSummary from '../components/PaylistSummary';
import PaylistActionNotice from '../components/PaylistActionNotice';
import MuseLogPanel from '../components/MuseLogPanel';
import MuseRejectionPanel from '../components/MuseRejectionPanel';
import { PAYLIST_ITEMS_ACTIONS_KEY, PaylistActionsContext } from '../components/PaylistItemsActions';
import { defaultPageStyles } from '../utils/styles';

const ItemFilterPane = withFilterExtras(PaylistItemFilter);

const useStyles = makeStyles((theme) => ({
  ...defaultPageStyles(theme),
  paper: { ...theme.paper.paper, margin: 0, marginBottom: theme.spacing(2) },
  paperHeader: {
    ...theme.paper.header,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: theme.spacing(1),
    paddingRight: theme.spacing(1),
  },
  titleRow: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing(1) },
  subtitle: { color: theme.palette.grey[600] },
  museReply: { color: theme.palette.grey[700], padding: theme.spacing(1, 2) },
}));

const PAYLIST_STATUS_COLOR = '#9e9e9e';
const EXPORT_FILTER = /^(hhid|payeeCode|payeeName|benefitCode|accountNumber|fspName|fspCode|locationId|status):\s*(.*)$/;
const toExportArg = (param) => {
  const match = EXPORT_FILTER.exec(param);
  if (!match) return null;
  const [, key, value] = match;
  if (key === 'status') return `status: "${value.replace(/"/g, '')}"`;
  return `${key}: ${value}`;
};
const SUBMITTABLE = [PAYLIST_STATUS.APPROVED, PAYLIST_STATUS.REJECTED];

// Status chips are monochrome: a status is a state, not an alarm.
const ITEM_STATUS_COLORS = {
  PENDING:   '#9e9e9e',
  PROCESSED: '#9e9e9e',
  UNAPPLIED: '#9e9e9e',
  WITHDRAWN: '#9e9e9e',
};

function PaylistDetailPage({
  match,
  fetchPaylistItems,
  approvePaylist,
  submitPaylist,
  fetchPaylistHeader,
  fetchPaylistForExport,
  fetchMusePaylistPreview,
  fetchingMusePreview,
  musePreview,
  errorMusePreview,
  fetchingPaylistItems,
  fetchedPaylistItems,
  errorPaylistItems,
  paylistItems,
  paylistItemsPageInfo,
  paylistItemsTotalCount,
  paylistHeader,
  paylistActionResult,
  paylistMuseLog,
  fetchingPaylistMuseLog,
  fetchPaylistMuseLog,
  paylistFspOptions,
  fetchPaylistFspOptions,
  paylistItemsExport,
  fetchingPaylistItemsExport,
  exportPaylistItems,
  downloadExport,
  paylistExport,
  fetchingPaylistExport,
  submittingMutation,
  mutation,
  coreConfirm,
  clearConfirm,
  confirmed,
  journalize,
}) {
  const classes = useStyles();
  const history = useHistory();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const rights = useSelector((store) => store.core?.user?.i_user?.rights ?? []);

  const paylistUuid = match?.params?.paylist_uuid;
  const prevSubmittingMutationRef = useRef();
  const pendingActionRef = useRef(null);
  const [showMusePreview, setShowMusePreview] = useState(false);
  const [location, setLocation] = useState(null);
  const [exportRequested, setExportRequested] = useState(false);
  const [returnedItem, setReturnedItem] = useState(null);
  const itemParamsRef = useRef([]);

  const fetchItems = (params) => {
    itemParamsRef.current = params || [];
    fetchPaylistItems([...(params || []), `paylistUuid: "${paylistUuid}"`]);
  };
  const reload = () => {
    fetchPaylistHeader(paylistUuid);
    fetchPaylistMuseLog(paylistUuid);
  };

  useEffect(() => {
    if (prevSubmittingMutationRef.current && !submittingMutation) {
      journalize(mutation);
      if (paylistUuid) {
        reload();
        fetchItems(itemParamsRef.current);
      }
    }
  }, [submittingMutation]);
  useEffect(() => { prevSubmittingMutationRef.current = submittingMutation; });

  useEffect(() => {
    if (paylistUuid) {
      reload();
      fetchPaylistFspOptions(paylistUuid);
    }
  }, [paylistUuid]);

  useEffect(() => {
    if (paylistItemsExport) {
      downloadExport(paylistItemsExport, `${formatMessage('paylistItem.export.filename')}.csv`, 'csv')();
    }
  }, [paylistItemsExport]);
  const handleExportItems = () => {
    exportPaylistItems(paylistUuid, itemParamsRef.current.map(toExportArg).filter(Boolean));
  };

  const exportData = paylistExport?.uuid === paylistUuid ? paylistExport : null;
  useEffect(() => {
    if (exportRequested && exportData) {
      setExportRequested(false);
      exportPaylistPdf(buildPaylistPdfPayload(exportData));
    }
  }, [exportRequested, exportData]);

  const paylist = paylistHeader?.uuid === paylistUuid ? paylistHeader : null;
  const status = paylist?.status;
  const canApprove = status === PAYLIST_STATUS.PENDING_APPROVAL;
  const isResend = status === PAYLIST_STATUS.REJECTED;
  const canSubmit = SUBMITTABLE.includes(status) && !(isResend && paylist?.pendingCount === 0)
    && !paylist?.lastSubmit?.sending;
  const back = () => (history.length > 1
    ? history.goBack()
    : history.push(`/${modulesManager.getRef('tasafPayment.route.workspace')}?tab=${WS_TAB_PAYLISTS}`));
  const handleExportPdf = () => {
    if (exportData) {
      exportPaylistPdf(buildPaylistPdfPayload(exportData));
    } else {
      setExportRequested(true);
      fetchPaylistForExport(paylistUuid);
    }
  };

  useEffect(() => {
    if (confirmed && pendingActionRef.current) {
      const action = pendingActionRef.current;
      if (action === 'approve') {
        approvePaylist(paylistUuid, formatMessage('mutation.approvePaylistLabel'));
      } else if (action === 'submit') {
        submitPaylist(paylistUuid, formatMessage('mutation.submitPaylistLabel'));
      }
      pendingActionRef.current = null;
    }
    if (confirmed !== null) pendingActionRef.current = null;
    return () => confirmed && clearConfirm(null);
  }, [confirmed]);

  const handleApprove = () => {
    pendingActionRef.current = 'approve';
    coreConfirm(formatMessage('paylist.approve.confirm.title'), formatMessage('paylist.approve.confirm.message'));
  };

  const handleSubmit = () => {
    pendingActionRef.current = 'submit';
    if (isResend) {
      coreConfirm(
        formatMessage('paylist.resend.confirm.title'),
        formatMessageWithValues('paylist.resend.confirm.message', {
          count: paylist?.pendingCount ?? 0, withdrawn: paylist?.withdrawnCount ?? 0,
        }),
      );
    } else {
      coreConfirm(formatMessage('paylist.submit.confirm.title'), formatMessage('paylist.submit.confirm.message'));
    }
  };
  const openAccountCorrection = (accountUuid) => history.push(
    `/${modulesManager.getRef('caseManagement.route.accountCorrection')}/${accountUuid}`,
  );

  const actionsContext = {
    t: formatMessage,
    canSearch: rights.includes(RIGHT_PAYLIST_SEARCH),
    canExport: !fetchingPaylistExport && !!paylist,
    onMusePreview: () => { fetchMusePaylistPreview(paylistUuid, 20); setShowMusePreview(true); },
    onExport: handleExportPdf,
    onExportItems: handleExportItems,
    exportingItems: fetchingPaylistItemsExport,
    approve: { visible: rights.includes(RIGHT_APPROVE_PAYLIST), allowed: canApprove, onClick: handleApprove },
    submit: {
      visible: rights.includes(RIGHT_SUBMIT_PAYLIST),
      allowed: canSubmit,
      onClick: handleSubmit,
      label: isResend ? formatMessageWithValues('button.resendPaylist', { count: paylist?.pendingCount ?? 0 }) : null,
    },
    submitting: submittingMutation,
  };

  const headers = () => [
    formatMessage('paylistItem.hhid'),
    formatMessage('paylistItem.payeeCode'),
    formatMessage('paylistItem.benefitCode'),
    formatMessage('paylistItem.accountNumber'),
    formatMessage('paylistItem.fspName'),
    formatMessage('paylistItem.amount'),
    formatMessage('paylistItem.status'),
  ];

  const itemFormatters = () => [
    (row) => row.paymentAccount?.groupBeneficiary?.group?.code ?? '-',
    (row) => (row.payeeCode ? <span style={{ fontFamily: 'monospace' }}>{row.payeeCode}</span> : '-'),
    (row) => row.benefitConsumption?.code ?? '-',
    (row) => row.paymentAccount?.accountNumber ?? '-',
    (row) => row.paymentAccount?.fspName ?? '-',
    (row) => row.amount ?? '-',
    (row) => (
      <StatusChip
        label={formatMessage(`paylistItem.status.${row.status}`)}
        color={ITEM_STATUS_COLORS[row.status]}
      />
    ),
  ];

  return (
    <div className={classes.page}>
      <Helmet title={formatMessageWithValues('paylist.detail.title', { uuid: paylistUuid })} />
      <Paper className={classes.paper}>
        <div className={classes.paperHeader}>
          <div className={classes.titleRow}>
            <Tooltip title={formatMessage('button.back')}>
              <IconButton onClick={back}><ChevronLeftIcon /></IconButton>
            </Tooltip>
            <Typography variant="h6">
              {paylist
                ? formatMessageWithValues('paylist.detail.heading', {
                  batchType: paylist.paymentType === 'UNAPPLIED'
                    ? formatMessageWithValues('paylist.unappliedResend', {
                      batchType: formatMessage(`paylist.batchType.${paylist.batchType}`),
                    })
                    : formatMessage(`paylist.batchType.${paylist.batchType}`),
                  destination: formatMessage(`paylist.destination.${paylist.destination}`),
                })
                : formatMessage('paylist.detail.loading')}
            </Typography>
            {!!status && (
              <StatusChip label={formatMessage(`paylist.status.${status}`)} color={PAYLIST_STATUS_COLOR} />
            )}
            {!!paylist?.museBatchReference && (
              <Typography variant="body2" className={classes.subtitle}>{paylist.museBatchReference}</Typography>
            )}
          </div>
        </div>
        <PaylistSummary t={formatMessage} summary={paylist?.summary} />
        <PaylistActionNotice
          t={formatMessage}
          tv={formatMessageWithValues}
          running={submittingMutation}
          runningKind={mutation?.kind || 'submitPaylist'}
          result={paylistActionResult?.kind && mutation?.paylistUuid === paylistUuid ? paylistActionResult : null}
          lastSubmit={paylist?.lastSubmit}
        />
        {!!paylist?.museStatusDesc && (
          <Typography variant="body2" className={classes.museReply}>
            {formatMessageWithValues('paylist.detail.museReply', { text: paylist.museStatusDesc })}
          </Typography>
        )}
        <MuseRejectionPanel
          t={formatMessage}
          tv={formatMessageWithValues}
          rejections={paylist?.museRejections}
          hold={paylist?.withdrawnHold}
          onOpenAccount={openAccountCorrection}
        />
      </Paper>

      <PaylistActionsContext.Provider value={actionsContext}>
        <FilterExtrasProvider value={{ location, onChangeLocation: setLocation, fspOptions: paylistFspOptions }}>
          <Searcher
            module={MODULE_NAME}
            FilterPane={ItemFilterPane}
            fetch={fetchItems}
            items={paylistItems}
            itemsPageInfo={paylistItemsPageInfo}
            fetchingItems={fetchingPaylistItems}
            fetchedItems={fetchedPaylistItems}
            errorItems={errorPaylistItems}
            tableTitle={formatMessageWithValues('paylistItem.searcher.results', { totalCount: paylistItemsTotalCount })}
            headers={headers}
            itemFormatters={itemFormatters}
            rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
            defaultPageSize={DEFAULT_PAGE_SIZE}
            rowIdentifier={(row) => row.id}
            actionsContributionKey={PAYLIST_ITEMS_ACTIONS_KEY}
            onDoubleClick={(row) => row.resolution && setReturnedItem(row)}
          />
        </FilterExtrasProvider>
        <ReturnedPaymentDialog item={returnedItem} onClose={() => setReturnedItem(null)} />
      </PaylistActionsContext.Provider>
      {paylist?.destination === 'MUSE' && (
        <MuseLogPanel
          t={formatMessage}
          rows={paylistMuseLog}
          fetching={fetchingPaylistMuseLog}
          onRefresh={() => fetchPaylistMuseLog(paylistUuid)}
        />
      )}
      <MusePayloadDialog
        open={showMusePreview}
        onClose={() => setShowMusePreview(false)}
        preview={musePreview}
        fetching={fetchingMusePreview}
        error={errorMusePreview}
      />
    </div>
  );
}

const mapStateToProps = (state) => ({
  fetchingPaylistItems: state.tasafPayment.fetchingPaylistItems,
  fetchedPaylistItems: state.tasafPayment.fetchedPaylistItems,
  errorPaylistItems: state.tasafPayment.errorPaylistItems,
  paylistItems: state.tasafPayment.paylistItems,
  paylistItemsPageInfo: state.tasafPayment.paylistItemsPageInfo,
  paylistItemsTotalCount: state.tasafPayment.paylistItemsTotalCount,
  paylistHeader: state.tasafPayment.paylistHeader,
  paylistActionResult: state.tasafPayment.paylistActionResult,
  paylistMuseLog: state.tasafPayment.paylistMuseLog,
  fetchingPaylistMuseLog: state.tasafPayment.fetchingPaylistMuseLog,
  paylistFspOptions: state.tasafPayment.paylistFspOptions,
  paylistItemsExport: state.tasafPayment.paylistItemsExport,
  fetchingPaylistItemsExport: state.tasafPayment.fetchingPaylistItemsExport,
  paylistExport: state.tasafPayment.paylistExport,
  fetchingPaylistExport: state.tasafPayment.fetchingPaylistExport,
  fetchingMusePreview: state.tasafPayment.fetchingMusePreview,
  musePreview: state.tasafPayment.musePreview,
  errorMusePreview: state.tasafPayment.errorMusePreview,
  submittingMutation: state.tasafPayment.submittingMutation,
  mutation: state.tasafPayment.mutation,
  confirmed: state.core.confirmed,
});

const mapDispatchToProps = (dispatch) => bindActionCreators(
  {
    fetchPaylistItems, approvePaylist, submitPaylist, fetchPaylistHeader, fetchPaylistForExport,
    fetchMusePaylistPreview, fetchPaylistMuseLog, fetchPaylistFspOptions, exportPaylistItems, downloadExport,
    journalize, coreConfirm, clearConfirm,
  },
  dispatch,
);

export default connect(mapStateToProps, mapDispatchToProps)(PaylistDetailPage);
