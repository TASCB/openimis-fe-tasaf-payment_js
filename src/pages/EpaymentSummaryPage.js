import React, { useEffect, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  Button, Grid, Paper, Typography, Divider,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import GetAppIcon from '@material-ui/icons/GetApp';
import {
  Helmet, ProgressOrError, Table, useModulesManager, useTranslations, downloadExport,
} from '@openimis/fe-core';

import { MODULE_NAME, RIGHT_REPORTS } from '../constants';
import { fetchEpaymentSummaryByFsp, exportEpaymentSummaryByFsp } from '../actions';
import EpaymentFspItemsPage from './EpaymentFspItemsPage';

const useStyles = makeStyles((theme) => ({
  page: { padding: theme.spacing(2) },
  title: { marginBottom: theme.spacing(2) },
  cards: { marginBottom: theme.spacing(2) },
  card: { padding: 20, height: '100%' },
  cardLabel: { color: theme.palette.primary.main },
  band: {
    ...theme.table.title,
    padding: theme.spacing(1, 2),
    marginTop: theme.spacing(2),
  },
  tableWrap: { overflowX: 'auto' },
  totalCell: { fontWeight: 600 },
  codeButton: { padding: 0, minWidth: 0, textTransform: 'none', fontWeight: 500 },
  actions: { marginTop: theme.spacing(2) },
  note: { color: theme.palette.text.secondary, display: 'block' },
}));

const TOTAL_KEY = '__total__';
const int = (v) => (v ?? 0).toLocaleString();
const money = (v) => (v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

function EpaymentSummaryPage({
  epaymentSummary, fetchingEpaymentSummary, errorEpaymentSummary, fetchEpaymentSummaryByFsp,
  epaymentSummaryExport, fetchingEpaymentSummaryExport, exportEpaymentSummaryByFsp, downloadExport,
}) {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  // makeTabPanel passes no props, so rights come from the store.
  const rights = useSelector((store) => store.core?.user?.i_user?.rights ?? []);
  const [selectedCode, setSelectedCode] = useState(null);

  useEffect(() => { fetchEpaymentSummaryByFsp(); }, []);

  // The resolver writes the file and returns its name; downloadExport fetches it.
  useEffect(() => {
    if (epaymentSummaryExport) {
      downloadExport(
        epaymentSummaryExport,
        `${formatMessage('report.epaymentByFsp.filename')}.csv`,
        'csv',
      )();
    }
  }, [epaymentSummaryExport]);

  if (!rights.includes(RIGHT_REPORTS)) return null;

  if (selectedCode) {
    return (
      <EpaymentFspItemsPage
        epaymentCode={selectedCode}
        onBack={() => setSelectedCode(null)}
      />
    );
  }

  const rows = epaymentSummary?.rows ?? [];
  const totals = epaymentSummary?.totals ?? null;

  // Rides along as the last item so it scrolls with the body; bolded via the sentinel.
  const items = totals ? [...rows, { ...totals, epaymentCode: TOTAL_KEY }] : rows;

  const cards = [
    ['report.card.households', int(totals?.households)],
    ['report.card.totalPaid', money(totals?.totalPaid)],
    ['report.card.withdrawalCharges', money(totals?.withdrawalCharges)],
  ];

  const columns = [
    ['report.col.households', 'households', int],
    ['report.col.withdrawalCharges', 'withdrawalCharges', money],
    ['report.col.pctPayment', 'pctPayment', money],
    ['report.col.childGrant', 'childGrant', money],
    ['report.col.disabilityGrant', 'disabilityGrant', money],
    ['report.col.pwpPayment', 'pwpPayment', money],
    ['report.col.eiPayment', 'eiPayment', money],
    ['report.col.hasChild', 'hasChild', int],
    ['report.col.primaryStudent', 'primaryStudent', int],
    ['report.col.secondaryStudent', 'secondaryStudent', int],
    ['report.col.totalPaid', 'totalPaid', money],
  ];

  const isTotal = (row) => row.epaymentCode === TOTAL_KEY;
  const cell = (row, text) => (
    isTotal(row) ? <span className={classes.totalCell}>{text}</span> : text
  );

  const headers = () => [
    formatMessage('report.col.epaymentCode'),
    ...columns.map(([label]) => formatMessage(label)),
  ];

  const itemFormatters = () => [
    (row) => (isTotal(row)
      ? <span className={classes.totalCell}>{formatMessage('report.total')}</span>
      : (
        <Button
          size="small"
          color="primary"
          className={classes.codeButton}
          onClick={() => setSelectedCode(row.epaymentCode)}
        >
          {row.epaymentCode}
        </Button>
      )),
    ...columns.map(([, field, fmt]) => (row) => cell(row, fmt(row[field]))),
  ];

  const aligns = ['left', ...columns.map(() => 'right')];

  return (
    <div className={classes.page}>
      <Helmet title={formatMessage('report.epaymentByFsp.title')} />
      <Typography variant="h6" className={classes.title}>
        {formatMessage('report.epaymentByFsp.title')}
      </Typography>

      <ProgressOrError progress={fetchingEpaymentSummary} error={errorEpaymentSummary} />

      {!fetchingEpaymentSummary && (
        <>
          <Grid container spacing={2} className={classes.cards}>
            {cards.map(([label, value]) => (
              <Grid item xs={12} sm={4} key={label}>
                <Paper elevation={3} className={classes.card}>
                  <Typography variant="h6" gutterBottom className={classes.cardLabel}>
                    {formatMessage(label)}
                  </Typography>
                  <Typography variant="body1">{value}</Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <div className={classes.band}>
            <Typography variant="h6">
              {formatMessageWithValues('report.epaymentByFsp.count', { count: rows.length })}
            </Typography>
          </div>

          <Paper className={classes.tableWrap}>
            <Table
              module={MODULE_NAME}
              headers={headers()}
              itemFormatters={itemFormatters()}
              items={items}
              aligns={aligns}
              withPagination={false}
              onDoubleClick={(row) => !isTotal(row) && setSelectedCode(row.epaymentCode)}
            />
          </Paper>

          <div className={classes.actions}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<GetAppIcon />}
              disabled={fetchingEpaymentSummaryExport || !rows.length}
              onClick={() => exportEpaymentSummaryByFsp()}
            >
              {formatMessage('report.export')}
            </Button>
          </div>

          <Divider style={{ margin: '16px 0' }} />
          <Typography variant="caption" className={classes.note}>
            {formatMessage('report.epaymentByFsp.drillHint')}
          </Typography>
          <Typography variant="caption" className={classes.note}>
            {formatMessage('report.epaymentByFsp.scope')}
          </Typography>
          <Typography variant="caption" className={classes.note}>
            {formatMessage('report.epaymentByFsp.capNote')}
          </Typography>
          <Typography variant="caption" className={classes.note}>
            {formatMessage('report.epaymentByFsp.pwpNote')}
          </Typography>
        </>
      )}
    </div>
  );
}

const mapStateToProps = (state) => ({
  epaymentSummary: state.tasafPayment.epaymentSummary,
  fetchingEpaymentSummary: state.tasafPayment.fetchingEpaymentSummary,
  errorEpaymentSummary: state.tasafPayment.errorEpaymentSummary,
  epaymentSummaryExport: state.tasafPayment.epaymentSummaryExport,
  fetchingEpaymentSummaryExport: state.tasafPayment.fetchingEpaymentSummaryExport,
});

const mapDispatchToProps = (dispatch) => bindActionCreators(
  { fetchEpaymentSummaryByFsp, exportEpaymentSummaryByFsp, downloadExport }, dispatch,
);

export default connect(mapStateToProps, mapDispatchToProps)(EpaymentSummaryPage);
