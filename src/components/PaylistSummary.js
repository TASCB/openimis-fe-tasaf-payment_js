import React from 'react';
import { Grid, Paper, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  grid: { padding: theme.spacing(2) },
  card: { padding: 20, height: '100%' },
  sub: { color: theme.palette.grey[600] },
}));

const STATUSES = ['PROCESSED', 'UNAPPLIED'];
const number = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

function Card({
  classes, title, value, sub,
}) {
  return (
    <Grid item xs={12} sm={6} md>
      <Paper elevation={3} className={classes.card}>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        <Typography variant="body1">{value}</Typography>
        {!!sub && <Typography variant="body2" className={classes.sub}>{sub}</Typography>}
      </Paper>
    </Grid>
  );
}

export default function PaylistSummary({ t, summary }) {
  const classes = useStyles();
  if (!summary) return null;
  const byStatus = summary.by_status || {};
  return (
    <Grid container spacing={2} className={classes.grid}>
      <Card classes={classes} title={t('paylist.summary.gross')} value={`TZS ${number(summary.amount)}`} />
      <Card classes={classes} title={t('paylist.summary.net')} value={`TZS ${number(summary.net_amount)}`} />
      <Card classes={classes} title={t('paylist.summary.charges')} value={`TZS ${number(summary.charge_amount)}`} />
      {STATUSES.map((status) => (
        <Card
          key={status}
          classes={classes}
          title={t(`paylistItem.status.${status}`)}
          value={number(byStatus[status]?.count)}
          sub={`TZS ${number(byStatus[status]?.amount)}`}
        />
      ))}
    </Grid>
  );
}
