import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, Paper, TextField,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import RefreshIcon from '@material-ui/icons/Refresh';
import {
  Table, graphql, useGraphqlQuery, useModulesManager, useTranslations,
} from '@openimis/fe-core';

import { MODULE_NAME } from '../../constants';
import PreAuditHousehold from './PreAuditHousehold';
import { cycleUuid } from './cycleUuid';

const KINDS = ['SAME_HOUSEHOLD', 'SAME_ACCOUNT', 'SAME_PERSON'];
const PAGE_SIZES = [20, 50, 100];

const useStyles = makeStyles((theme) => ({
  card: { padding: 20, height: '100%' },
  cardLabel: { color: theme.palette.primary.main },
  band: { ...theme.table.title, padding: theme.spacing(1, 2), marginTop: theme.spacing(3) },
  filters: { margin: theme.spacing(2, 0), alignItems: 'center' },
  note: { color: theme.palette.text.secondary, display: 'block', marginTop: theme.spacing(1) },
  link: { padding: 0, minWidth: 0, textTransform: 'none', fontWeight: 500 },
}));

const int = (v) => (v ?? 0).toLocaleString();
const money = (v) => (v == null ? '-' : v.toLocaleString(undefined, { maximumFractionDigits: 0 }));

function PreAuditDuplicates({ paymentWindow }) {
  const classes = useStyles();
  const dispatch = useDispatch();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const uuid = cycleUuid(paymentWindow);
  const [kind, setKind] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [nonce, setNonce] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [opened, setOpened] = useState(null);
  const [household, setHousehold] = useState(null);

  const { isLoading, data, error } = useGraphqlQuery(
    `query PreAuditDuplicates($id: UUID!, $kind: String, $search: String, $offset: Int, $limit: Int) {
      preAuditDuplicates(paymentCycleId: $id, kind: $kind, search: $search, offset: $offset, limit: $limit)
    } # ${nonce}`,
    {
      id: uuid, kind: kind || null, search: search || null, offset: page * pageSize, limit: pageSize,
    },
    { skip: !uuid, keepStale: true },
  );

  if (!uuid) return <Typography>{formatMessage('preAudit.overview.chooseWindow')}</Typography>;
  if (error) return <Typography color="error">{formatMessage('preAudit.duplicates.error')}</Typography>;
  const raw = data?.preAuditDuplicates;
  const report = (typeof raw === 'string' ? JSON.parse(raw) : raw) || null;
  if (!report) return <CircularProgress />;

  const recalculate = async () => {
    setRefreshing(true);
    await dispatch(graphql(`{ preAuditDuplicates(paymentCycleId: "${uuid}", limit: 1, refresh: true) }`,
      'TASAF_PAYMENT_PRE_AUDIT_DUPLICATES_REFRESH'));
    setRefreshing(false);
    setNonce((n) => n + 1);
  };

  const kindLabel = (k) => formatMessage(`preAudit.duplicates.kind.${k}`);

  return (
    <>
      <Grid container spacing={2}>
        {KINDS.map((k) => (
          <Grid item xs={12} sm={4} key={k}>
            <Paper elevation={3} className={classes.card}>
              <Typography variant="h6" gutterBottom className={classes.cardLabel}>{kindLabel(k)}</Typography>
              <Typography variant="h5">{int(report.counts?.[k])}</Typography>
              <Typography variant="body2" color="textSecondary">
                {k === 'SAME_HOUSEHOLD'
                  ? formatMessageWithValues('preAudit.duplicates.card.extraAmount', {
                    payments: int(report.extra_payments?.[k]), amount: money(report.extra_amount),
                  })
                  : formatMessage(`preAudit.duplicates.card.${k}`)}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <div className={classes.band}>
        <Typography variant="h6">
          {formatMessageWithValues('preAudit.duplicates.groups', { count: int(report.total_groups) })}
        </Typography>
      </div>
      <Grid container spacing={2} className={classes.filters}>
        <Grid item xs={12} sm={3}>
          <TextField
            select
            fullWidth
            label={formatMessage('preAudit.duplicates.filter.kind')}
            value={kind}
            onChange={(e) => { setKind(e.target.value); setPage(0); }}
          >
            <MenuItem value="">{formatMessage('preAudit.duplicates.filter.all')}</MenuItem>
            {KINDS.map((k) => <MenuItem key={k} value={k}>{kindLabel(k)}</MenuItem>)}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label={formatMessage('preAudit.duplicates.filter.search')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </Grid>
        <Grid item>
          <Button startIcon={<RefreshIcon />} color="primary" disabled={isLoading || refreshing} onClick={recalculate}>
            {formatMessage('preAudit.compliance.refresh')}
          </Button>
        </Grid>
        {(isLoading || refreshing) && <Grid item><CircularProgress size={24} /></Grid>}
      </Grid>
      <Paper>
        <Table
          module={MODULE_NAME}
          headers={[
            formatMessage('preAudit.duplicates.col.kind'),
            formatMessage('preAudit.duplicates.col.match'),
            formatMessage('preAudit.duplicates.col.households'),
            formatMessage('preAudit.duplicates.col.payments'),
            formatMessage('preAudit.duplicates.col.amount'),
          ]}
          aligns={['left', 'left', 'right', 'right', 'right']}
          itemFormatters={[
            (row) => kindLabel(row.kind),
            (row) => (
              <Button size="small" color="primary" className={classes.link} onClick={() => setOpened(row)}>
                {row.key}
              </Button>
            ),
            (row) => int(row.households),
            (row) => int(row.payments),
            (row) => money(row.amount),
          ]}
          items={report.groups || []}
          withPagination
          page={page}
          pageSize={pageSize}
          count={report.total_groups || 0}
          rowsPerPageOptions={PAGE_SIZES}
          onChangePage={(e, p) => setPage(p)}
          onChangeRowsPerPage={(size) => { setPageSize(size); setPage(0); }}
          onDoubleClick={(row) => setOpened(row)}
        />
      </Paper>
      <Typography variant="caption" className={classes.note}>
        {formatMessage('preAudit.duplicates.scope')}
      </Typography>

      {opened && (
        <Dialog open onClose={() => setOpened(null)} maxWidth="md" fullWidth>
          <DialogTitle>{`${kindLabel(opened.kind)}: ${opened.key}`}</DialogTitle>
          <DialogContent>
            <Table
              module={MODULE_NAME}
              headers={[
                formatMessage('preAudit.compliance.col.hhid'),
                formatMessage('preAudit.compliance.col.head'),
                formatMessage('preAudit.compliance.col.payroll'),
                formatMessage('preAudit.duplicates.col.account'),
                formatMessage('preAudit.duplicates.col.fsp'),
                formatMessage('preAudit.duplicates.col.amount'),
              ]}
              aligns={['left', 'left', 'left', 'left', 'left', 'right']}
              itemFormatters={[
                (r) => (
                  <Button size="small" color="primary" className={classes.link} onClick={() => setHousehold(r.group_id)}>
                    {r.hhid || '-'}
                  </Button>
                ),
                (r) => r.head || '-',
                (r) => r.payroll || '-',
                (r) => r.account_number || '-',
                (r) => r.fsp_name || '-',
                (r) => money(r.amount),
              ]}
              items={opened.rows || []}
              withPagination={false}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpened(null)} color="primary">{formatMessage('verificationOutcome.close')}</Button>
          </DialogActions>
        </Dialog>
      )}
      {household && (
        <PreAuditHousehold paymentWindow={paymentWindow} groupId={household} onClose={() => setHousehold(null)} />
      )}
    </>
  );
}

export default PreAuditDuplicates;
