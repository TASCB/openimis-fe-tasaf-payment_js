import React, { useState } from 'react';
import {
  Paper, Typography, IconButton, Tooltip, LinearProgress,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import RefreshIcon from '@material-ui/icons/Refresh';

const useStyles = makeStyles((theme) => ({
  paper: { ...theme.paper.paper, margin: 0, marginTop: theme.spacing(3), marginBottom: theme.spacing(2) },
  header: {
    ...theme.paper.header,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: theme.spacing(1),
  },
  empty: { padding: theme.spacing(2), color: theme.palette.grey[600] },
  row: { cursor: 'pointer' },
  body: {
    fontFamily: 'monospace',
    fontSize: 12,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    background: theme.palette.grey[50],
  },
  note: { color: theme.palette.error.main },
}));

const formatTime = (value) => (value ? new Date(value).toLocaleString() : '-');

export default function MuseLogPanel({
  t, rows, fetching, onRefresh,
}) {
  const classes = useStyles();
  const [open, setOpen] = useState(null);
  const reference = (row) => (row.direction === 'IN' ? row.museReference || row.benefitCode : row.msgId) || '-';

  return (
    <Paper className={classes.paper}>
      <div className={classes.header}>
        <Typography variant="h6">{t('museLog.title')}</Typography>
        <Tooltip title={t('museLog.refresh')}>
          <IconButton onClick={onRefresh}><RefreshIcon /></IconButton>
        </Tooltip>
      </div>
      {fetching && <LinearProgress />}
      {!rows.length ? (
        <Typography variant="body2" className={classes.empty}>{t('museLog.empty')}</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{t('museLog.time')}</TableCell>
              <TableCell>{t('museLog.direction')}</TableCell>
              <TableCell>{t('museLog.type')}</TableCell>
              <TableCell>{t('museLog.status')}</TableCell>
              <TableCell>{t('museLog.attempt')}</TableCell>
              <TableCell>{t('museLog.reference')}</TableCell>
              <TableCell>{t('museLog.requestId')}</TableCell>
              <TableCell>{t('museLog.note')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <React.Fragment key={`${row.createdAt}-${index}`}>
                <TableRow hover className={classes.row} onClick={() => setOpen(open === index ? null : index)}>
                  <TableCell>{formatTime(row.createdAt)}</TableCell>
                  <TableCell>{t(`museLog.direction.${row.direction}`)}</TableCell>
                  <TableCell>{row.transactionType}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell>{row.direction === 'OUT' ? row.attemptNumber : '-'}</TableCell>
                  <TableCell>{reference(row)}</TableCell>
                  <TableCell>{row.esbRequestId || '-'}</TableCell>
                  <TableCell className={row.errorMessage ? classes.note : undefined}>
                    {row.errorMessage || (row.httpStatusCode ? `HTTP ${row.httpStatusCode}` : '-')}
                  </TableCell>
                </TableRow>
                {open === index && (
                  <TableRow>
                    <TableCell colSpan={8} className={classes.body}>{row.responseBody || t('museLog.noBody')}</TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      )}
    </Paper>
  );
}
