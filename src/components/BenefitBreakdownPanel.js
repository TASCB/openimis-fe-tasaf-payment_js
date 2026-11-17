import React from 'react';
import {
  Button, LinearProgress, Paper, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  paper: { ...theme.paper.paper, margin: 0, marginTop: theme.spacing(3), marginBottom: theme.spacing(2) },
  header: {
    ...theme.paper.header,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: theme.spacing(1),
  },
  alert: { margin: theme.spacing(1, 2), whiteSpace: 'pre-line' },
  total: { '& td': { fontWeight: 600 } },
  number: { width: 140 },
}));

const number = (v) => Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

export default function BenefitBreakdownPanel({
  t, tv, breakdown, fetching, exporting, onExport,
}) {
  const classes = useStyles();
  if (!breakdown && !fetching) return null;

  const rows = breakdown ? [
    ...breakdown.lines.map((line) => ({
      key: line.code, label: line.label, households: line.households, people: line.people, amount: line.amount,
    })),
    { key: 'components', label: t('breakdown.components'), amount: breakdown.components_total, total: true },
    {
      key: 'cap', label: t('breakdown.cap'), households: breakdown.cap_reduction.households,
      amount: -breakdown.cap_reduction.amount,
    },
    {
      key: 'benefits', label: t('breakdown.benefits'), households: breakdown.payments,
      amount: breakdown.benefits_total, total: true,
    },
    {
      key: 'charges', label: t('breakdown.charges'), households: breakdown.charges.payments,
      amount: breakdown.charges.amount,
    },
    {
      key: 'unexplained', label: t('breakdown.unexplained'), households: breakdown.unexplained.payments,
      amount: breakdown.unexplained.amount,
    },
    {
      key: 'batch', label: tv('breakdown.batch', { reference: breakdown.reference }), households: breakdown.payments,
      amount: breakdown.batch_total, total: true,
    },
  ] : [];

  return (
    <Paper className={classes.paper}>
      <div className={classes.header}>
        <Typography variant="h6">{t('breakdown.title')}</Typography>
        <Button color="primary" onClick={onExport} disabled={!breakdown || exporting}>{t('breakdown.export')}</Button>
      </div>
      {fetching && <LinearProgress />}
      {breakdown?.blocked && (
        <Alert severity="error" className={classes.alert}>
          {`${t('breakdown.blocked')}\n${breakdown.problems.join('\n')}`}
        </Alert>
      )}
      {!!breakdown && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('breakdown.col.line')}</TableCell>
              <TableCell align="right" className={classes.number}>{t('breakdown.col.households')}</TableCell>
              <TableCell align="right" className={classes.number}>{t('breakdown.col.people')}</TableCell>
              <TableCell align="right" className={classes.number}>{t('breakdown.col.amount')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key} className={row.total ? classes.total : undefined}>
                <TableCell>{row.label}</TableCell>
                <TableCell align="right">{row.households === undefined ? '' : number(row.households)}</TableCell>
                <TableCell align="right">{row.people === undefined ? '' : number(row.people)}</TableCell>
                <TableCell align="right">{number(row.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}
