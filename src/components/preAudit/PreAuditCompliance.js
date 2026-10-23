import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Button, CircularProgress, Grid, MenuItem, Paper, TextField, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import GetAppIcon from '@material-ui/icons/GetApp';
import RefreshIcon from '@material-ui/icons/Refresh';
import {
  Table, downloadExport, graphql, useGraphqlQuery, useModulesManager, useTranslations,
} from '@openimis/fe-core';

import { MODULE_NAME } from '../../constants';
import PreAuditHousehold from './PreAuditHousehold';
import { cycleUuid } from './cycleUuid';

const STATUSES = ['OVERPAID', 'UNDERPAID', 'DATA_ERROR'];
const PAGE_SIZES = [20, 50, 100];
const PARTS = [
  ['base', null], ['disability', 'disability'], ['health', 'children'],
  ['primary', 'primary_students'], ['secondary', 'secondary_students'],
];

const useStyles = makeStyles((theme) => ({
  card: { padding: 20, height: '100%' },
  cardLabel: { color: theme.palette.primary.main },
  band: { ...theme.table.title, padding: theme.spacing(1, 2), marginTop: theme.spacing(3) },
  filters: { margin: theme.spacing(2, 0), alignItems: 'center' },
  note: { color: theme.palette.text.secondary, display: 'block', marginTop: theme.spacing(1) },
  bold: { fontWeight: 600 },
  link: { padding: 0, minWidth: 0, textTransform: 'none', fontWeight: 500 },
}));

const int = (v) => (v ?? 0).toLocaleString();
const money = (v) => (v == null ? '-' : v.toLocaleString(undefined, { maximumFractionDigits: 0 }));

function PreAuditCompliance({ paymentWindow }) {
  const classes = useStyles();
  const dispatch = useDispatch();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const uuid = cycleUuid(paymentWindow);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [nonce, setNonce] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [household, setHousehold] = useState(null);

  const { isLoading, data, error } = useGraphqlQuery(
    `query PreAuditCompliance($id: UUID!, $status: String, $search: String, $offset: Int, $limit: Int) {
      preAuditCompliance(paymentCycleId: $id, status: $status, search: $search, offset: $offset, limit: $limit)
    } # ${nonce}`,
    {
      id: uuid, status: status || null, search: search || null, offset: page * pageSize, limit: pageSize,
    },
    { skip: !uuid, keepStale: true },
  );

  if (!uuid) return <Typography>{formatMessage('preAudit.overview.chooseWindow')}</Typography>;
  if (error) return <Typography color="error">{formatMessage('preAudit.compliance.error')}</Typography>;
  const raw = data?.preAuditCompliance;
  const report = (typeof raw === 'string' ? JSON.parse(raw) : raw) || null;
  if (!report) return <CircularProgress />;

  const totals = report.totals || {};
  const receiving = report.receiving || {};
  const counts = report.counts || {};

  const recalculate = async () => {
    setRefreshing(true);
    await dispatch(graphql(`{ preAuditCompliance(paymentCycleId: "${uuid}", limit: 1, refresh: true) }`,
      'TASAF_PAYMENT_PRE_AUDIT_COMPLIANCE_REFRESH'));
    setRefreshing(false);
    setNonce((n) => n + 1);
  };

  const exportCsv = async () => {
    setExporting(true);
    const args = [`paymentCycleId: "${uuid}"`];
    if (status) args.push(`status: "${status}"`);
    const response = await dispatch(graphql(`{ preAuditComplianceExport(${args.join(', ')}) }`,
      'TASAF_PAYMENT_PRE_AUDIT_COMPLIANCE_EXPORT'));
    const name = response?.payload?.data?.preAuditComplianceExport;
    if (name) dispatch(downloadExport(name, `${formatMessage('preAudit.compliance.filename')}.csv`, 'csv'));
    setExporting(false);
  };

  const cards = [
    ['MATCH', counts.MATCH, null],
    ['OVERPAID', counts.OVERPAID, report.variance?.OVERPAID],
    ['UNDERPAID', counts.UNDERPAID, report.variance?.UNDERPAID],
    ['DATA_ERROR', counts.DATA_ERROR, null],
  ];

  const partItems = [
    ...PARTS.map(([part, countKey]) => ({
      part, amount: totals[part], payments: part === 'base' ? report.payments : receiving[part],
      count: countKey && countKey !== part ? receiving[countKey] : null,
    })),
    { part: 'cap_cut', amount: -(totals.cap_cut || 0), payments: receiving.capped },
    { part: 'penalties', amount: -(totals.penalties || 0) },
    { part: 'expected', amount: totals.expected, bold: true },
    { part: 'paid', amount: totals.paid, bold: true },
  ];
  const strong = (row, text) => (row.bold ? <span className={classes.bold}>{text}</span> : text);

  return (
    <>
      <Grid container spacing={2}>
        {cards.map(([key, count, amount]) => (
          <Grid item xs={12} sm={3} key={key}>
            <Paper elevation={3} className={classes.card}>
              <Typography variant="h6" gutterBottom className={classes.cardLabel}>
                {formatMessage(`preAudit.compliance.status.${key}`)}
              </Typography>
              <Typography variant="h5">{int(count)}</Typography>
              {amount != null && (
                <Typography variant="body2" color="textSecondary">
                  {formatMessageWithValues('preAudit.compliance.variance', { amount: money(Math.abs(amount)) })}
                </Typography>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      <div className={classes.band}>
        <Typography variant="h6">{formatMessage('preAudit.compliance.parts')}</Typography>
      </div>
      <Paper>
        <Table
          module={MODULE_NAME}
          headers={[
            formatMessage('preAudit.compliance.col.part'),
            formatMessage('preAudit.compliance.col.payments'),
            formatMessage('preAudit.compliance.col.count'),
            formatMessage('preAudit.compliance.col.amount'),
          ]}
          aligns={['left', 'right', 'right', 'right']}
          itemFormatters={[
            (row) => strong(row, formatMessage(`preAudit.compliance.part.${row.part}`)),
            (row) => (row.payments == null ? '' : int(row.payments)),
            (row) => (row.count == null ? '' : int(row.count)),
            (row) => strong(row, money(row.amount)),
          ]}
          items={partItems}
          withPagination={false}
        />
      </Paper>

      <div className={classes.band}>
        <Typography variant="h6">
          {formatMessageWithValues('preAudit.compliance.findings', { count: int(report.total_findings) })}
        </Typography>
      </div>
      <Grid container spacing={2} className={classes.filters}>
        <Grid item xs={12} sm={3}>
          <TextField
            select
            fullWidth
            label={formatMessage('preAudit.compliance.filter.status')}
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(0); }}
          >
            <MenuItem value="">{formatMessage('preAudit.compliance.filter.all')}</MenuItem>
            {STATUSES.map((s) => (
              <MenuItem key={s} value={s}>{formatMessage(`preAudit.compliance.status.${s}`)}</MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label={formatMessage('preAudit.compliance.filter.search')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </Grid>
        <Grid item>
          <Button startIcon={<RefreshIcon />} color="primary" disabled={isLoading || refreshing} onClick={recalculate}>
            {formatMessage('preAudit.compliance.refresh')}
          </Button>
        </Grid>
        <Grid item>
          <Button startIcon={<GetAppIcon />} variant="contained" color="primary" disabled={exporting} onClick={exportCsv}>
            {formatMessage('preAudit.compliance.export')}
          </Button>
        </Grid>
        {(isLoading || refreshing) && <Grid item><CircularProgress size={24} /></Grid>}
      </Grid>
      <Paper>
        <Table
          module={MODULE_NAME}
          headers={[
            formatMessage('preAudit.compliance.col.hhid'),
            formatMessage('preAudit.compliance.col.head'),
            formatMessage('preAudit.compliance.col.payroll'),
            formatMessage('preAudit.compliance.col.expected'),
            formatMessage('preAudit.compliance.col.paid'),
            formatMessage('preAudit.compliance.col.variance'),
            formatMessage('preAudit.compliance.col.status'),
            formatMessage('preAudit.compliance.col.reason'),
          ]}
          aligns={['left', 'left', 'left', 'right', 'right', 'right', 'left', 'left']}
          itemFormatters={[
            (row) => (row.group_id ? (
              <Button size="small" color="primary" className={classes.link} onClick={() => setHousehold(row.group_id)}>
                {row.hhid || '-'}
              </Button>
            ) : (row.hhid || '-')),
            (row) => row.head || '-',
            (row) => row.payroll || '-',
            (row) => money(row.expected),
            (row) => money(row.paid),
            (row) => money(row.variance),
            (row) => formatMessage(`preAudit.compliance.status.${row.status}`),
            (row) => (row.reason || '').split(',').filter(Boolean)
              .map((r) => formatMessage(`preAudit.compliance.reason.${r}`)).join(', '),
          ]}
          items={report.findings || []}
          withPagination
          page={page}
          pageSize={pageSize}
          count={report.total_findings || 0}
          rowsPerPageOptions={PAGE_SIZES}
          onChangePage={(e, p) => setPage(p)}
          onChangeRowsPerPage={(size) => { setPageSize(size); setPage(0); }}
          onDoubleClick={(row) => row.group_id && setHousehold(row.group_id)}
        />
      </Paper>
      <Typography variant="caption" className={classes.note}>
        {formatMessage('preAudit.compliance.scope')}
      </Typography>
      {household && (
        <PreAuditHousehold paymentWindow={paymentWindow} groupId={household} onClose={() => setHousehold(null)} />
      )}
    </>
  );
}

export default PreAuditCompliance;
