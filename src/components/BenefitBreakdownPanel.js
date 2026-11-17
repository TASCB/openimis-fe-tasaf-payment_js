import React, { useEffect, useState } from 'react';
import {
  Button, Divider, Grid, Paper,
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import { makeStyles } from '@material-ui/core/styles';
import { Table } from '@openimis/fe-core';

import { MODULE_NAME } from '../constants';

const useStyles = makeStyles((theme) => ({
  paper: { ...theme.paper.body, marginTop: theme.spacing(3), marginBottom: theme.spacing(2) },
  paperHeader: theme.paper.header,
  paperHeaderTitle: theme.paper.title,
  paperHeaderAction: {
    ...theme.paper.action, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: theme.spacing(1),
  },
  alert: { margin: theme.spacing(1, 2), whiteSpace: 'pre-line' },
}));

const number = (v) => Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
const blank = (v) => (v === undefined ? '' : number(v));

const breakdownRows = (t, tv, b) => [
  ...b.lines.map((line) => ({
    key: line.code, label: line.label, households: line.households, people: line.people, amount: line.amount,
  })),
  { key: 'components', label: t('breakdown.components'), amount: b.components_total, total: true },
  { key: 'cap', label: t('breakdown.cap'), households: b.cap_reduction.households, amount: -b.cap_reduction.amount },
  { key: 'benefits', label: t('breakdown.benefits'), households: b.payments, amount: b.benefits_total, total: true },
  { key: 'charges', label: t('breakdown.charges'), households: b.charges.payments, amount: b.charges.amount },
  {
    key: 'unexplained', label: t('breakdown.unexplained'), households: b.unexplained.payments,
    amount: b.unexplained.amount,
  },
  {
    key: 'batch', label: tv('breakdown.batch', { reference: b.reference }), households: b.payments,
    amount: b.batch_total, total: true,
  },
];

export default function BenefitBreakdownPanel({
  t, tv, breakdown, fetching, exporting, onExport,
}) {
  const classes = useStyles();
  const [open, setOpen] = useState(false);
  useEffect(() => { if (breakdown?.blocked) setOpen(true); }, [breakdown?.blocked]);
  if (!breakdown && !fetching) return null;

  return (
    <Paper className={classes.paper}>
      <Grid container alignItems="center" className={classes.paperHeader}>
        <Grid item xs={6} className={classes.paperHeaderTitle}>
          {t('breakdown.title')}
        </Grid>
        <Grid item xs={6} className={classes.paperHeaderAction}>
          <Button color="primary" disabled={!breakdown} onClick={() => setOpen(!open)}>
            {open ? t('breakdown.hide') : tv('breakdown.show', { count: breakdown?.lines.length ?? 0 })}
          </Button>
          <Button color="primary" onClick={onExport} disabled={!breakdown || exporting}>
            {t('breakdown.export')}
          </Button>
        </Grid>
      </Grid>
      {breakdown?.blocked && (
        <Alert severity="error" className={classes.alert}>
          {`${t('breakdown.blocked')}\n${breakdown.problems.join('\n')}`}
        </Alert>
      )}
      {open && (
        <>
          <Divider />
          <Table
            size="small"
            module={MODULE_NAME}
            fetching={fetching}
            headers={['breakdown.col.line', 'breakdown.col.households', 'breakdown.col.people', 'breakdown.col.amount']}
            aligns={['left', 'right', 'right', 'right']}
            itemFormatters={[
              (row) => row.label,
              (row) => blank(row.households),
              (row) => blank(row.people),
              (row) => number(row.amount),
            ]}
            items={breakdown ? breakdownRows(t, tv, breakdown) : []}
            itemIdentifier={(row) => row.key}
            rowHighlighted={(row) => !!row.total}
          />
        </>
      )}
    </Paper>
  );
}
