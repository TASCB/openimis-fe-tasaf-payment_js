import React, { useEffect, useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  Button, Grid, Paper, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  ProgressOrError, PublishedComponent, SelectInput, Table, useHistory, useModulesManager, useTranslations,
  downloadExport,
} from '@openimis/fe-core';

import {
  DESTINATION_LIST, MODULE_NAME, RIGHT_REPORTS, WS_TAB_RETURNS,
} from '../constants';
import {
  exportEpaymentSummaryByFsp, fetchEpaymentSummaryByFsp, fetchUnappliedReconciliation, fetchUnappliedSummary,
  reportFilterArgs,
} from '../actions';
import { cycleUuid } from '../components/preAudit/cycleUuid';
import EpaymentFspItemsPage from './EpaymentFspItemsPage';
import UnappliedReconciliationTable from '../components/UnappliedReconciliationTable';

const useStyles = makeStyles((theme) => ({
  page: theme.page,
  paper: theme.paper.paper,
  item: theme.paper.item,
  tableTitle: theme.table.title,
  titleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  cards: { padding: theme.spacing(1) },
  card: { padding: 20, height: '100%' },
  clickable: { cursor: 'pointer' },
  sub: { color: theme.palette.grey[600] },
  tableWrap: { overflowX: 'auto' },
  totalCell: { fontWeight: 600 },
  codeButton: { padding: 0, minWidth: 0, textTransform: 'none', fontWeight: 500 },
  note: { color: theme.palette.text.secondary, display: 'block', padding: theme.spacing(1, 2) },
}));

const TOTAL_KEY = '__total__';
const int = (v) => (v ?? 0).toLocaleString();
const money = (v) => (v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

function EpaymentSummaryPage({
  epaymentSummary, fetchingEpaymentSummary, errorEpaymentSummary, fetchEpaymentSummaryByFsp,
  epaymentSummaryExport, fetchingEpaymentSummaryExport, exportEpaymentSummaryByFsp, downloadExport,
  fetchUnappliedSummary, fetchUnappliedReconciliation,
}) {
  const classes = useStyles();
  const history = useHistory();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  // makeTabPanel passes no props, so rights come from the store.
  const rights = useSelector((store) => store.core?.user?.i_user?.rights ?? []);
  const [selectedCode, setSelectedCode] = useState(null);
  const [paymentCycle, setPaymentCycle] = useState(null);
  const [destination, setDestination] = useState(null);
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [unapplied, setUnapplied] = useState(null);
  const [reconciliation, setReconciliation] = useState([]);

  const filters = {
    paymentCycleUuid: cycleUuid(paymentCycle), destination, dateFrom, dateTo,
  };
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    fetchEpaymentSummaryByFsp(filters);
    fetchUnappliedSummary(filters).then((r) => {
      const value = r?.payload?.data?.unappliedSummary;
      setUnapplied(typeof value === 'string' ? JSON.parse(value) : value ?? null);
    });
    fetchUnappliedReconciliation(filters.paymentCycleUuid).then((r) => {
      const value = r?.payload?.data?.unappliedReconciliation;
      setReconciliation((typeof value === 'string' ? JSON.parse(value || '[]') : value) || []);
    });
  }, [filterKey]);

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
        filterArgs={reportFilterArgs(filters)}
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
  const awaiting = unapplied?.by_resolution?.AWAITING_ACTION?.count ?? 0;

  const destinationOptions = [
    { value: null, label: formatMessage('tooltip.any') },
    ...DESTINATION_LIST.map((d) => ({ value: d, label: formatMessage(`paylist.destination.${d}`) })),
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
      <Paper className={classes.paper}>
        <Grid container>
          <Grid item xs={12} sm={6} md={3} className={classes.item}>
            <PublishedComponent
              pubRef="paymentCycle.PaymentCyclePicker"
              withLabel
              label={formatMessage('report.filter.paymentCycle')}
              value={paymentCycle}
              onChange={setPaymentCycle}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3} className={classes.item}>
            <SelectInput
              module={MODULE_NAME}
              label="report.filter.destination"
              options={destinationOptions}
              value={destination}
              onChange={setDestination}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3} className={classes.item}>
            <PublishedComponent
              pubRef="core.DatePicker"
              module={MODULE_NAME}
              label="report.filter.dateFrom"
              value={dateFrom}
              {...(dateTo ? { maxDate: dateTo } : {})}
              onChange={setDateFrom}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3} className={classes.item}>
            <PublishedComponent
              pubRef="core.DatePicker"
              module={MODULE_NAME}
              label="report.filter.dateTo"
              value={dateTo}
              {...(dateFrom ? { minDate: dateFrom } : {})}
              onChange={setDateTo}
            />
          </Grid>
        </Grid>
      </Paper>

      <ProgressOrError progress={fetchingEpaymentSummary} error={errorEpaymentSummary} />

      {!fetchingEpaymentSummary && (
        <>
          <Grid container spacing={2} className={classes.cards}>
            {cards.map(([label, value]) => (
              <Grid item xs={12} sm={6} md={3} key={label}>
                <Paper elevation={3} className={classes.card}>
                  <Typography variant="h6" gutterBottom>{formatMessage(label)}</Typography>
                  <Typography variant="body1">{value}</Typography>
                </Paper>
              </Grid>
            ))}
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={3}
                className={`${classes.card} ${classes.clickable}`}
                onClick={() => history.push(`/tasafPayment/workspace?tab=${WS_TAB_RETURNS}`)}
              >
                <Typography variant="h6" gutterBottom>{formatMessage('report.card.unapplied')}</Typography>
                <Typography variant="body1">
                  {formatMessageWithValues('report.card.unappliedValue', {
                    count: int(unapplied?.total?.count), amount: money(unapplied?.total?.amount),
                  })}
                </Typography>
                <Typography variant="body2" className={classes.sub}>
                  {formatMessageWithValues('report.card.unappliedAwaiting', { count: int(awaiting) })}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Paper className={classes.paper}>
            <div className={`${classes.tableTitle} ${classes.titleRow}`}>
              <Typography variant="h6">
                {formatMessageWithValues('report.epaymentByFsp.heading', { count: rows.length })}
              </Typography>
              <Button
                color="primary"
                disabled={fetchingEpaymentSummaryExport || !rows.length}
                onClick={() => exportEpaymentSummaryByFsp(filters)}
              >
                {formatMessage('report.export')}
              </Button>
            </div>
            <div className={classes.tableWrap}>
              <Table
                module={MODULE_NAME}
                headers={headers()}
                itemFormatters={itemFormatters()}
                items={items}
                aligns={aligns}
                withPagination={false}
                onDoubleClick={(row) => !isTotal(row) && setSelectedCode(row.epaymentCode)}
              />
            </div>
            <Typography variant="caption" className={classes.note}>
              {formatMessage('report.epaymentByFsp.hint')}
            </Typography>
          </Paper>

          <Paper className={classes.paper}>
            <div className={classes.tableTitle}>
              <Typography variant="h6">{formatMessage('returned.reconciliation.title')}</Typography>
            </div>
            <div className={classes.tableWrap}>
              <UnappliedReconciliationTable rows={reconciliation} />
            </div>
            <Typography variant="caption" className={classes.note}>
              {formatMessage('returned.reconciliation.help')}
            </Typography>
          </Paper>
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
  {
    fetchEpaymentSummaryByFsp, exportEpaymentSummaryByFsp, downloadExport, fetchUnappliedSummary,
    fetchUnappliedReconciliation,
  }, dispatch,
);

export default connect(mapStateToProps, mapDispatchToProps)(EpaymentSummaryPage);
