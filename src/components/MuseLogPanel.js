import React, { useState } from 'react';
import {
  Divider, Grid, IconButton, LinearProgress, Paper, Tooltip, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import RefreshIcon from '@material-ui/icons/Refresh';
import VisibilityOutlined from '@material-ui/icons/VisibilityOutlined';
import { Table } from '@openimis/fe-core';
import { formatDisplayTime } from '@openimis/fe-tasaf_common';

import { MODULE_NAME } from '../constants';

const useStyles = makeStyles((theme) => ({
  paper: { ...theme.paper.body, marginTop: theme.spacing(3), marginBottom: theme.spacing(2) },
  paperHeader: theme.paper.header,
  paperHeaderTitle: theme.paper.title,
  paperHeaderAction: { ...theme.paper.action, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' },
  empty: { padding: theme.spacing(2), color: theme.palette.grey[600] },
  body: {
    fontFamily: 'monospace',
    fontSize: 12,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  note: { color: theme.palette.error.main, display: 'block', fontSize: 12 },
  details: { padding: theme.spacing(1, 2), background: theme.palette.grey[50] },
  detailRow: { display: 'flex', gap: theme.spacing(1), fontSize: 13, padding: theme.spacing(0.25, 0) },
  detailLabel: { minWidth: 150, color: theme.palette.grey[600] },
  viewCell: { whiteSpace: 'nowrap', textAlign: 'right' },
}));

const formatTime = (value) => formatDisplayTime(value) || '-';
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

  const selected = open === null ? null : rows[open];
  const toggle = (row) => {
    const index = rows.indexOf(row);
    setOpen(open === index ? null : index);
  };

  return (
    <Paper className={classes.paper}>
      <Grid container alignItems="center" className={classes.paperHeader}>
        <Grid item xs={8} className={classes.paperHeaderTitle}>{t('museLog.title')}</Grid>
        <Grid item xs={4} className={classes.paperHeaderAction}>
          <Tooltip title={t('museLog.refresh')}>
            <IconButton onClick={onRefresh}><RefreshIcon /></IconButton>
          </Tooltip>
        </Grid>
      </Grid>
      {fetching && <LinearProgress />}
      <Divider />
      {!rows.length ? (
        <Typography variant="body2" className={classes.empty}>{t('museLog.empty')}</Typography>
      ) : (
        <>
          <Table
            size="small"
            module={MODULE_NAME}
            headers={['museLog.time', 'museLog.what', 'museLog.feedback', 'museLog.result', '']}
            itemFormatters={[
              (row) => formatTime(row.createdAt),
              (row) => what(row),
              (row) => row.museFeedback || '-',
              (row) => (
                <>
                  {result(row)}
                  {!!row.errorMessage && <span className={classes.note}>{row.errorMessage}</span>}
                </>
              ),
              (row) => (
                <div className={classes.viewCell}>
                  <Tooltip title={t('museLog.view')}>
                    <IconButton size="small" onClick={() => toggle(row)}>
                      <VisibilityOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </div>
              ),
            ]}
            items={rows}
            itemIdentifier={(row) => `${row.createdAt}-${rows.indexOf(row)}`}
            rowHighlighted={(row) => row === selected}
            onDoubleClick={toggle}
          />
          {selected && (
            <div className={classes.details}>
              {details(selected).map(([label, value]) => (
                <div className={classes.detailRow} key={label}>
                  <span className={classes.detailLabel}>{t(label)}</span>
                  <span>{value}</span>
                </div>
              ))}
              <div className={classes.body}>
                {selected.responseBody ? prettyBody(selected.responseBody) : t('museLog.noBody')}
              </div>
            </div>
          )}
        </>
      )}
    </Paper>
  );
}
