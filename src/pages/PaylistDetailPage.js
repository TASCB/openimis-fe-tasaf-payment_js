import React, { useEffect, useRef, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';

import {
  Paper, Button, IconButton, Tooltip, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import SendIcon from '@material-ui/icons/Send';
import PictureAsPdfIcon from '@material-ui/icons/PictureAsPdf';
import CodeIcon from '@material-ui/icons/Code';
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
} from '@openimis/fe-core';
// Reuse the payroll module's PDF helpers — the MUSE dispatch paylist is built
// from the underlying payroll, but the export lives here on the TASAF surface.
import { exportPaylistPdf, buildPaylistPayload } from '@openimis/fe-payroll';

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
  fetchPaylistItems, approvePaylist, submitPaylist, fetchPaylistForExport, fetchMusePaylistPreview,
} from '../actions';
import StatusChip from '../components/StatusChip';
import MusePayloadDialog from '../components/MusePayloadDialog';
import { defaultPageStyles } from '../utils/styles';

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
  paperHeaderAction: theme.paper.action,
  titleRow: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing(1) },
  subtitle: { color: theme.palette.grey[600] },
  museReply: { color: theme.palette.grey[700], padding: theme.spacing(1, 2) },
  actions: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', marginLeft: 'auto',
  },
}));

const PAYLIST_STATUS_COLOR = '#9e9e9e';
const SUBMITTABLE = [PAYLIST_STATUS.APPROVED, PAYLIST_STATUS.REJECTED];

// Status chips are monochrome: a status is a state, not an alarm.
const ITEM_STATUS_COLORS = {
  PENDING:   '#9e9e9e',
  PROCESSED: '#9e9e9e',
  UNAPPLIED: '#9e9e9e',
};

function PaylistDetailPage({
  match,
  fetchPaylistItems,
  approvePaylist,
  submitPaylist,
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

  useEffect(() => {
    if (prevSubmittingMutationRef.current && !submittingMutation) {
      journalize(mutation);
      if (paylistUuid) fetchPaylistForExport(paylistUuid);
    }
  }, [submittingMutation]);
  useEffect(() => { prevSubmittingMutationRef.current = submittingMutation; });

  // Load the paylist + its payroll so the PDF export is ready on demand.
  useEffect(() => {
    if (paylistUuid) fetchPaylistForExport(paylistUuid);
  }, [paylistUuid]);

  const exportPayroll = paylistExport?.payroll;
  const status = paylistExport?.status;
  const canApprove = status === PAYLIST_STATUS.PENDING_APPROVAL;
  const canSubmit = SUBMITTABLE.includes(status);
  const back = () => (history.length > 1
    ? history.goBack()
    : history.push(`/${modulesManager.getRef('tasafPayment.route.workspace')}?tab=${WS_TAB_PAYLISTS}`));
  const handleExportPdf = () => {
    if (exportPayroll) exportPaylistPdf(buildPaylistPayload(exportPayroll));
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
    return () => confirmed !== null && clearConfirm(false);
  }, [confirmed]);

  const handleApprove = () => {
    pendingActionRef.current = 'approve';
    coreConfirm(formatMessage('paylist.approve.confirm.title'), formatMessage('paylist.approve.confirm.message'));
  };

  const handleSubmit = () => {
    pendingActionRef.current = 'submit';
    coreConfirm(formatMessage('paylist.submit.confirm.title'), formatMessage('paylist.submit.confirm.message'));
  };

  const headers = () => [
    formatMessage('paylistItem.accountNumber'),
    formatMessage('paylistItem.fspName'),
    formatMessage('paylistItem.fspType'),
    formatMessage('paylistItem.amount'),
    formatMessage('paylistItem.status'),
    formatMessage('paylistItem.museReference'),
  ];

  const itemFormatters = () => [
    (row) => row.paymentAccount?.accountNumber ?? '-',
    (row) => row.paymentAccount?.fspName ?? '-',
    (row) => row.paymentAccount?.fspType
      ? formatMessage(`paymentAccount.fspType.${row.paymentAccount.fspType}`) : '-',
    (row) => row.amount ?? '-',
    (row) => (
      <StatusChip
        label={formatMessage(`paylistItem.status.${row.status}`)}
        color={ITEM_STATUS_COLORS[row.status]}
      />
    ),
    (row) => row.museReference ?? '-',
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
              {paylistExport
                ? formatMessageWithValues('paylist.detail.heading', {
                  batchType: formatMessage(`paylist.batchType.${paylistExport.batchType}`),
                  destination: formatMessage(`paylist.destination.${paylistExport.destination}`),
                })
                : formatMessage('paylist.detail.loading')}
            </Typography>
            {!!status && (
              <StatusChip label={formatMessage(`paylist.status.${status}`)} color={PAYLIST_STATUS_COLOR} />
            )}
            {!!paylistExport?.museBatchReference && (
              <Typography variant="body2" className={classes.subtitle}>{paylistExport.museBatchReference}</Typography>
            )}
          </div>
          <div className={classes.actions}>
            {rights.includes(RIGHT_PAYLIST_SEARCH) && (
              <span className={classes.paperHeaderAction}>
                <Button color="primary" startIcon={<CodeIcon />}
                  onClick={() => { fetchMusePaylistPreview(paylistUuid, 20); setShowMusePreview(true); }}>
                  {formatMessage('button.musePreview')}
                </Button>
              </span>
            )}
            {rights.includes(RIGHT_PAYLIST_SEARCH) && (
              <span className={classes.paperHeaderAction}>
                <Button color="primary" startIcon={<PictureAsPdfIcon />}
                  disabled={fetchingPaylistExport || !exportPayroll} onClick={handleExportPdf}>
                  {formatMessage('button.exportPaylistPdf')}
                </Button>
              </span>
            )}
            {rights.includes(RIGHT_APPROVE_PAYLIST) && (
              <Tooltip title={canApprove ? '' : formatMessage('paylist.detail.approveNotAllowed')}>
                <span className={classes.paperHeaderAction}>
                  <Button variant="contained" color="primary" startIcon={<CheckCircleIcon />}
                    disabled={submittingMutation || !canApprove} onClick={handleApprove}>
                    {formatMessage('button.approvePaylist')}
                  </Button>
                </span>
              </Tooltip>
            )}
            {rights.includes(RIGHT_SUBMIT_PAYLIST) && (
              <Tooltip title={canSubmit ? '' : formatMessage('paylist.detail.submitNotAllowed')}>
                <span className={classes.paperHeaderAction}>
                  <Button variant="contained" color="primary" startIcon={<SendIcon />}
                    disabled={submittingMutation || !canSubmit} onClick={handleSubmit}>
                    {formatMessage('button.submitPaylist')}
                  </Button>
                </span>
              </Tooltip>
            )}
          </div>
        </div>
        {!!paylistExport?.museStatusDesc && (
          <Typography variant="body2" className={classes.museReply}>
            {formatMessageWithValues('paylist.detail.museReply', { text: paylistExport.museStatusDesc })}
          </Typography>
        )}
      </Paper>

      <Searcher
        module={MODULE_NAME}
        fetch={(params) => fetchPaylistItems([...(params || []), `paylistUuid: "${paylistUuid}"`])}
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
      />
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
    fetchPaylistItems, approvePaylist, submitPaylist, fetchPaylistForExport, fetchMusePaylistPreview,
    journalize, coreConfirm, clearConfirm,
  },
  dispatch,
);

export default connect(mapStateToProps, mapDispatchToProps)(PaylistDetailPage);
