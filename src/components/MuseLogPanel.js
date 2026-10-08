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
  note: { color: theme.palette.error.main, display: 'block', fontSize: 12 },
  details: { padding: theme.spacing(1, 2), background: theme.palette.grey[50] },
  detailRow: { display: 'flex', gap: theme.spacing(1), fontSize: 13, padding: theme.spacing(0.25, 0) },
  detailLabel: { minWidth: 150, color: theme.palette.grey[600] },
}));

const EAT = 'Africa/Dar_es_Salaam';
const formatTime = (value) => (value ? new Date(value).toLocaleString(undefined, { timeZone: EAT }) : '-');
const money = (v) => `TZS ${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const KNOWN_WHAT = ['OUT.BULK_PAYMENT', 'OUT.ACK', 'IN.RESPONSE', 'IN.ACK', 'IN.PAYMENT_STATUS'];
const KNOWN_RESULT = ['SUCCESS', 'FAILED', 'RETRYING', 'REJECTED', 'PENDING', 'UNKNOWN', 'NOT_SENT'];

const prettyBody = (body) => {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch (e) {
    return body;
  }
};

export default function MuseLogPanel({
  t, rows, fetching, onRefresh,
}) {
  const classes = useStyles();
  const [open, setOpen] = useState(null);

  const what = (row) => {
    const key = `${row.direction}.${row.transactionType}`;
    let text = KNOWN_WHAT.includes(key) ? t(`museLog.what.${key}`) : row.transactionType;
    if (key === 'OUT.BULK_PAYMENT' && row.attemptNumber > 1) text += ` · ${t('museLog.attempt')} ${row.attemptNumber}`;
    if (key === 'IN.PAYMENT_STATUS' && row.benefitCode) text += ` · ${row.benefitCode}`;
    return text;
  };
  const result = (row) => (KNOWN_RESULT.includes(row.status)
    ? t(`museLog.result.${row.direction === 'OUT' ? 'OUT' : 'IN'}.${row.status}`) : row.status);

  const details = (row) => [
    ['museLog.messageId', row.msgId],
    ['museLog.museMessageId', row.direction === 'IN' ? row.museReference : null],
    ['museLog.requestId', row.esbRequestId],
    ['museLog.http', row.httpStatusCode],
    ['museLog.items', row.itemCount ? `${row.itemCount} · ${money(row.amount)}` : null],
    ['museLog.attempt', row.direction === 'OUT' ? row.attemptNumber : null],
  ].filter(([, value]) => value !== null && value !== undefined && value !== '');

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
              <TableCell>{t('museLog.what')}</TableCell>
              <TableCell>{t('museLog.feedback')}</TableCell>
              <TableCell>{t('museLog.result')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <React.Fragment key={`${row.createdAt}-${index}`}>
                <TableRow hover className={classes.row} onClick={() => setOpen(open === index ? null : index)}>
                  <TableCell>{formatTime(row.createdAt)}</TableCell>
                  <TableCell>{what(row)}</TableCell>
                  <TableCell>{row.museFeedback || '-'}</TableCell>
                  <TableCell>
                    {result(row)}
                    {!!row.errorMessage && <span className={classes.note}>{row.errorMessage}</span>}
                  </TableCell>
                </TableRow>
                {open === index && (
                  <TableRow>
                    <TableCell colSpan={4} className={classes.details}>
                      {details(row).map(([label, value]) => (
                        <div className={classes.detailRow} key={label}>
                          <span className={classes.detailLabel}>{t(label)}</span>
                          <span>{value}</span>
                        </div>
                      ))}
                      <div className={classes.body}>{row.responseBody ? prettyBody(row.responseBody) : t('museLog.noBody')}</div>
                    </TableCell>
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
