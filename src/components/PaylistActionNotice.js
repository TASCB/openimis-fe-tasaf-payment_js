import React from 'react';
import { LinearProgress, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  box: { padding: theme.spacing(1, 2), borderTop: `1px solid ${theme.palette.divider}` },
  error: { color: theme.palette.error.main, fontWeight: 600 },
  ok: { color: theme.palette.success.main, fontWeight: 600 },
  muted: { color: theme.palette.grey[700] },
}));

const formatTime = (value) => (value ? new Date(value).toLocaleString() : '');

export default function PaylistActionNotice({
  t, tv, running, runningKind, result, lastSubmit,
}) {
  const classes = useStyles();

  if (running) {
    return (
      <div className={classes.box}>
        <Typography variant="body2" className={classes.muted}>{t(`paylist.action.running.${runningKind}`)}</Typography>
        <LinearProgress />
      </div>
    );
  }
  if (result) {
    if (result.status === 2) {
      return (
        <div className={classes.box}>
          <Typography variant="body2" className={classes.ok}>{t(`paylist.action.done.${result.kind}`)}</Typography>
        </div>
      );
    }
    if (result.status === 1) {
      return (
        <div className={classes.box}>
          <Typography variant="body2" className={classes.error}>
            {tv(`paylist.action.failed.${result.kind}`, { reason: result.error || t('paylist.action.noReason') })}
          </Typography>
        </div>
      );
    }
    return (
      <div className={classes.box}>
        <Typography variant="body2" className={classes.muted}>{t('paylist.action.stillRunning')}</Typography>
      </div>
    );
  }
  if (lastSubmit) {
    const values = { at: formatTime(lastSubmit.at), by: lastSubmit.by || '-', reason: lastSubmit.message || '-' };
    return (
      <div className={classes.box}>
        <Typography variant="body2" className={lastSubmit.success ? classes.muted : classes.error}>
          {tv(lastSubmit.success ? 'paylist.lastSubmit.ok' : 'paylist.lastSubmit.failed', values)}
        </Typography>
      </div>
    );
  }
  return null;
}
