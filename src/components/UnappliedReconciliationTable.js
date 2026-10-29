import React from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import { useModulesManager, useTranslations } from '@openimis/fe-core';

import { MODULE_NAME } from '../constants';

const HELD = ['AWAITING_ACTION', 'IN_CORRECTION', 'REPAYING'];
const COLUMNS = ['returned', 'REPAID', 'UNAPPLIED_WITHDRAWN', 'LAPSED', 'held'];

const useStyles = makeStyles((theme) => ({
  amount: { color: theme.palette.text.secondary, fontSize: 12 },
  muted: { color: theme.palette.text.secondary, padding: theme.spacing(1, 0) },
}));

const cell = (row, key) => {
  if (key !== 'held') return row[key] || { count: 0, amount: 0 };
  return HELD.reduce((sum, k) => ({
    count: sum.count + (row[k]?.count || 0), amount: sum.amount + Number(row[k]?.amount || 0),
  }), { count: 0, amount: 0 });
};

const money = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

function UnappliedReconciliationTable({ rows }) {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);

  if (!rows?.length) {
    return <Typography className={classes.muted}>{formatMessage('returned.reconciliation.none')}</Typography>;
  }
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>{formatMessage('returned.reconciliation.cycle')}</TableCell>
          <TableCell>{formatMessage('paylistItem.fspName')}</TableCell>
          {COLUMNS.map((key) => (
            <TableCell key={key} align="right">{formatMessage(`returned.reconciliation.${key}`)}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.cycle}-${row.fsp}`}>
            <TableCell>{row.cycle || '—'}</TableCell>
            <TableCell>{row.fsp || '—'}</TableCell>
            {COLUMNS.map((key) => {
              const value = cell(row, key);
              return (
                <TableCell key={key} align="right">
                  {value.count}
                  <div className={classes.amount}>{money(value.amount)}</div>
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default UnappliedReconciliationTable;
