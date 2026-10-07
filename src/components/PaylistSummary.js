import React from 'react';
import { Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(3),
    padding: theme.spacing(1.5, 2),
    borderTop: `1px solid ${theme.palette.divider}`,
  },
  label: { color: theme.palette.grey[600], fontSize: 12 },
  value: { fontWeight: 600 },
}));

const STATUSES = ['PENDING', 'PROCESSED', 'UNAPPLIED'];
const money = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

function Stat({ classes, label, value }) {
  return (
    <div>
      <Typography className={classes.label}>{label}</Typography>
      <Typography variant="body2" className={classes.value}>{value}</Typography>
    </div>
  );
}

export default function PaylistSummary({ t, summary }) {
  const classes = useStyles();
  if (!summary) return null;
  const byStatus = summary.by_status || {};
  return (
    <div className={classes.row}>
      <Stat classes={classes} label={t('paylist.summary.payees')} value={money(summary.payees)} />
      <Stat classes={classes} label={t('paylist.summary.gross')} value={`TZS ${money(summary.amount)}`} />
      <Stat classes={classes} label={t('paylist.summary.net')} value={`TZS ${money(summary.net_amount)}`} />
      <Stat classes={classes} label={t('paylist.summary.charges')} value={`TZS ${money(summary.charge_amount)}`} />
      {STATUSES.map((status) => (
        <Stat
          key={status}
          classes={classes}
          label={t(`paylistItem.status.${status}`)}
          value={`${money(byStatus[status]?.count)} · TZS ${money(byStatus[status]?.amount)}`}
        />
      ))}
    </div>
  );
}
