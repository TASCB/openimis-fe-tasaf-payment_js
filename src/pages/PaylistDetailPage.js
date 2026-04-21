import React, { useEffect, useRef } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';

import { Paper, Grid, Button, Box, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import SendIcon from '@material-ui/icons/Send';

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
  RIGHT_APPROVE_PAYLIST,
  RIGHT_SUBMIT_PAYLIST,
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
  PAYLIST_STATUS,
} from '../constants';
import { fetchPaylistItems, approvePaylist, submitPaylist } from '../actions';
import StatusChip from '../components/StatusChip';
import { defaultPageStyles } from '../utils/styles';

const useStyles = makeStyles((theme) => ({
  ...defaultPageStyles(theme),
  paper: theme.paper.paper,
  header: { padding: theme.spacing(2), borderBottom: `1px solid ${theme.palette.divider}` },
  actions: { display: 'flex', gap: theme.spacing(1), padding: theme.spacing(1, 2) },
}));

const ITEM_STATUS_COLORS = {
  PENDING:   '#9e9e9e',
  PROCESSED: '#4caf50',
  RETURNED:  '#f44336',
  UNAPPLIED: '#ff9800',
};

function PaylistDetailPage({
  match,
  fetchPaylistItems,
  approvePaylist,
  submitPaylist,
  fetchingPaylistItems,
  fetchedPaylistItems,
  errorPaylistItems,
  paylistItems,
  paylistItemsPageInfo,
  paylistItemsTotalCount,
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

  const paylistUuid = match?.params?.paylist_uuid;
  const prevSubmittingMutationRef = useRef();
  const pendingActionRef = useRef(null);

  useEffect(() => {
    if (prevSubmittingMutationRef.current && !submittingMutation) journalize(mutation);
  }, [submittingMutation]);
  useEffect(() => { prevSubmittingMutationRef.current = submittingMutation; });

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
        <Grid container className={classes.header} justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {formatMessageWithValues('paylist.detail.title', { uuid: paylistUuid })}
          </Typography>
        </Grid>

        <Box className={classes.actions}>
          {rights.includes(RIGHT_APPROVE_PAYLIST) && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<CheckCircleIcon />}
              disabled={submittingMutation}
              onClick={handleApprove}
            >
              {formatMessage('button.approvePaylist')}
            </Button>
          )}
          {rights.includes(RIGHT_SUBMIT_PAYLIST) && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<SendIcon />}
              disabled={submittingMutation}
              onClick={handleSubmit}
            >
              {formatMessage('button.submitPaylist')}
            </Button>
          )}
        </Box>

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
      </Paper>
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
  submittingMutation: state.tasafPayment.submittingMutation,
  mutation: state.tasafPayment.mutation,
  confirmed: state.core.confirmed,
});

const mapDispatchToProps = (dispatch) => bindActionCreators(
  { fetchPaylistItems, approvePaylist, submitPaylist, journalize, coreConfirm, clearConfirm },
  dispatch,
);

export default connect(mapStateToProps, mapDispatchToProps)(PaylistDetailPage);
