import React from 'react';
import {
  Button, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
  root: { padding: theme.spacing(1, 2, 2) },
  heading: { fontWeight: 500, marginBottom: theme.spacing(0.5) },
  summary: { color: theme.palette.grey[700], marginBottom: theme.spacing(1) },
  older: { color: theme.palette.grey[600], fontSize: 13, marginTop: theme.spacing(1) },
  note: { color: theme.palette.grey[600], display: 'block', fontSize: 12 },
  account: { fontFamily: 'monospace' },
}));

const ACTIONS = ['WITHDRAWN', 'KEPT', 'NEEDS_REVIEW'];

export default function MuseRejectionPanel({
  t, tv, rejections, hold, onOpenAccount,
}) {
  const classes = useStyles();
  if (!rejections?.length) return null;
  const [latest, ...older] = [...rejections].reverse();
  const action = (row) => (ACTIONS.includes(row.action) ? t(`museRejection.action.${row.action}`) : row.action);

  return (
    <div className={classes.root}>
      <Typography variant="subtitle1" className={classes.heading}>
        {tv('museRejection.title', { attempt: latest.attempt })}
      </Typography>
      <Typography variant="body2" className={classes.summary}>
        {tv('museRejection.summary', {
          withdrawn: latest.withdrawn, kept: latest.kept, review: latest.needs_review,
        })}
      </Typography>
      {!!latest.payees?.length && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('museRejection.account')}</TableCell>
              <TableCell>{t('museRejection.reason')}</TableCell>
              <TableCell>{t('museRejection.outcome')}</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {latest.payees.map((row) => (
              <TableRow key={`${row.account}-${row.item || ''}`}>
                <TableCell className={classes.account}>{row.account}</TableCell>
                <TableCell>{row.reason}</TableCell>
                <TableCell>
                  {action(row)}
                  {!!row.note && <span className={classes.note}>{row.note}</span>}
                </TableCell>
                <TableCell align="right">
                  {row.action === 'WITHDRAWN' && !!row.account_uuid && (
                    <Button size="small" color="primary" onClick={() => onOpenAccount(row.account_uuid)}>
                      {t('museRejection.correct')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {!!hold?.deadline && hold.awaiting > 0 && (
        <Typography variant="body2" className={classes.summary}>
          {tv('museRejection.hold', { count: hold.awaiting, deadline: hold.deadline })}
        </Typography>
      )}
      {!!hold?.lapsed && (
        <Typography variant="body2" className={classes.summary}>
          {tv('museRejection.lapsed', { count: hold.lapsed, deadline: hold.deadline })}
        </Typography>
      )}
      {!!latest.unparsed && (
        <Typography variant="body2" className={classes.note}>
          {tv('museRejection.unparsed', { text: latest.unparsed })}
        </Typography>
      )}
      {older.map((r) => (
        <Typography key={r.msg_id || r.at} variant="body2" className={classes.older}>
          {tv('museRejection.older', {
            attempt: r.attempt, withdrawn: r.withdrawn, kept: r.kept, review: r.needs_review,
          })}
        </Typography>
      ))}
    </div>
  );
}
