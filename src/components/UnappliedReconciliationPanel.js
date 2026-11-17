import React, { useState } from 'react';
import {
  Button, Divider, Grid, Link, Paper, Tooltip, Typography,
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import { makeStyles } from '@material-ui/core/styles';
import { Table, useModulesManager, useTranslations } from '@openimis/fe-core';

import { MODULE_NAME } from '../constants';

export const RECONCILIATION_PARTS = ['returned', 'REPAID', 'UNAPPLIED_WITHDRAWN', 'LAPSED', 'HELD'];
const TOTAL = '__total__';

const useStyles = makeStyles((theme) => ({
  paper: theme.paper.paper,
  paperHeader: theme.paper.header,
  paperHeaderTitle: theme.paper.title,
  paperHeaderAction: {
    ...theme.paper.action, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: theme.spacing(1),
  },
  alert: { margin: theme.spacing(1, 2) },
  muted: { color: theme.palette.text.secondary, padding: theme.spacing(1, 2) },
  tableWrap: { overflowX: 'auto' },
}));

const int = (v) => (v ?? 0).toLocaleString();
const money = (v) => (Number(v) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

export default function UnappliedReconciliationPanel({
  report, exporting, onExport, onOpen,
}) {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const [open, setOpen] = useState(false);
  const t = (key) => formatMessage(`returned.reconciliation.${key}`);

  const totals = report?.totals;
  const providers = report?.providers ?? [];
  const unexplained = report?.unexplained;
  const empty = !totals?.returned?.count;

  const amountLink = (value, part, fsp) => {
    if (!value?.count || fsp === null) return money(value?.amount);
    return (
      <Tooltip title={formatMessageWithValues('returned.reconciliation.payments', { count: int(value.count) })}>
        <Link component="button" variant="body2" onClick={() => onOpen(part, fsp)}>{money(value.amount)}</Link>
      </Tooltip>
    );
  };

  const totalRows = RECONCILIATION_PARTS.map((part) => ({ part, ...totals?.[part] }));
  const providerRows = [...providers, { ...totals, fsp: TOTAL }];

  return (
    <Paper className={classes.paper}>
      <Grid container alignItems="center" className={classes.paperHeader}>
        <Grid item xs={6} className={classes.paperHeaderTitle}>{t('title')}</Grid>
        <Grid item xs={6} className={classes.paperHeaderAction}>
          <Button color="primary" disabled={empty} onClick={() => setOpen(!open)}>
            {open ? t('hide') : formatMessageWithValues('returned.reconciliation.show', { count: providers.length })}
          </Button>
          <Button color="primary" disabled={empty || exporting} onClick={onExport}>{t('export')}</Button>
        </Grid>
      </Grid>
      {empty ? (
        <Typography className={classes.muted}>{t('none')}</Typography>
      ) : (
        <>
          {(!!unexplained?.count || !!unexplained?.amount) && (
            <Alert severity="error" className={classes.alert}>
              {formatMessageWithValues('returned.reconciliation.unexplained', {
                count: int(unexplained.count), amount: money(unexplained.amount),
              })}
            </Alert>
          )}
          <Divider />
          <Table
            size="small"
            module={MODULE_NAME}
            headers={['returned.reconciliation.col.line', 'returned.reconciliation.col.payments',
              'returned.reconciliation.col.amount']}
            aligns={['left', 'right', 'right']}
            itemFormatters={[
              (row) => t(`part.${row.part}`),
              (row) => int(row.count),
              (row) => amountLink(row, row.part, undefined),
            ]}
            items={totalRows}
            itemIdentifier={(row) => row.part}
            rowHighlighted={(row) => row.part === 'returned'}
          />
          {open && (
            <div className={classes.tableWrap}>
              <Divider />
              <Table
                size="small"
                module={MODULE_NAME}
                headers={['paylistItem.fspName', 'returned.reconciliation.col.payments',
                  ...RECONCILIATION_PARTS.map((part) => `returned.reconciliation.col.${part}`)]}
                aligns={['left', 'right', ...RECONCILIATION_PARTS.map(() => 'right')]}
                itemFormatters={[
                  (row) => {
                    if (row.fsp === TOTAL) return t('allProviders');
                    return row.fsp || t('noProvider');
                  },
                  (row) => int(row.returned?.count),
                  ...RECONCILIATION_PARTS.map((part) => (row) => amountLink(
                    row[part], part, row.fsp === TOTAL ? undefined : row.fsp,
                  )),
                ]}
                items={providerRows}
                itemIdentifier={(row) => row.fsp ?? ''}
                rowHighlighted={(row) => row.fsp === TOTAL}
              />
            </div>
          )}
        </>
      )}
    </Paper>
  );
}
