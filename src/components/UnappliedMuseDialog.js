import React, { useEffect, useState } from 'react';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Tab, Table, TableBody, TableCell, TableHead,
  TableRow, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import { PublishedComponent, useModulesManager, useTranslations } from '@openimis/fe-core';

import { MODULE_NAME } from '../constants';

const TAB_BATCH = 'batch';
const TAB_WITHDRAW = 'withdraw';

const useStyles = makeStyles((theme) => ({
  content: { padding: 0 },
  tableTitle: theme.table.title,
  tabs: { display: 'flex', alignItems: 'center' },
  selectedTab: { borderBottom: '4px solid white' },
  unselectedTab: { borderBottom: '4px solid transparent' },
  help: { color: theme.palette.text.secondary, fontSize: 13, marginBottom: theme.spacing(1) },
  muted: { color: theme.palette.text.secondary },
  stepAction: { display: 'flex', justifyContent: 'flex-end', marginTop: theme.spacing(1) },
  message: { marginRight: 'auto', fontSize: 13 },
  error: { color: theme.palette.error.main },
}));

const money = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

// Tab 2 waits for MUSE's withdrawal API: it only shows the count.
function UnappliedMuseDialog({
  open, onClose, resendRows, withdrawals, canCreate, onCreateResends,
}) {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const [activeTab, setActiveTab] = useState(TAB_BATCH);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => { if (open) { setActiveTab(TAB_BATCH); setBusy(false); setMessage(null); } }, [open]);

  const isSelected = (tab) => tab === activeTab;
  const tabStyle = (tab) => (isSelected(tab) ? classes.selectedTab : classes.unselectedTab);
  const onTabChange = (_, tab) => setActiveTab(tab);

  const create = async () => {
    setBusy(true);
    setMessage(null);
    const error = await onCreateResends();
    setBusy(false);
    setMessage(error ? { error } : { text: formatMessage('returned.resend.done') });
  };

  const ready = (resendRows || []).filter((r) => !r.blocked).reduce((n, r) => n + (r.ready || 0), 0);

  return (
    <Dialog open={!!open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{formatMessage('returned.muse.title')}</DialogTitle>
      <DialogContent className={classes.content}>
        <Grid container className={`${classes.tableTitle} ${classes.tabs}`}>
          <Tab
            onChange={onTabChange}
            className={tabStyle(TAB_BATCH)}
            selected={isSelected(TAB_BATCH)}
            value={TAB_BATCH}
            label={formatMessage('returned.muse.tab.batch')}
          />
          <Tab
            onChange={onTabChange}
            className={tabStyle(TAB_WITHDRAW)}
            selected={isSelected(TAB_WITHDRAW)}
            value={TAB_WITHDRAW}
            label={formatMessage('returned.muse.tab.withdraw')}
          />
        </Grid>

        <PublishedComponent pubRef="policyHolder.TabPanel" module={MODULE_NAME} index={TAB_BATCH} value={activeTab}>
          <Typography className={classes.help}>{formatMessage('returned.resend.help')}</Typography>
          {!resendRows?.length ? (
            <Typography className={classes.muted}>{formatMessage('returned.muse.nothing')}</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{formatMessage('returned.resend.payroll')}</TableCell>
                  <TableCell>{formatMessage('returned.resend.channel')}</TableCell>
                  <TableCell align="right">{formatMessage('returned.resend.ready')}</TableCell>
                  <TableCell align="right">{formatMessage('returned.resend.amount')}</TableCell>
                  <TableCell align="right">{formatMessage('returned.resend.waitingAccount')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resendRows.map((r) => (
                  <TableRow key={`${r.payrollId}-${r.batchType}`}>
                    <TableCell>
                      {r.payrollName || r.payrollId.slice(0, 8)}
                      {r.blocked && <div className={classes.muted}>{r.blocked}</div>}
                    </TableCell>
                    <TableCell>{r.batchType}</TableCell>
                    <TableCell align="right">{r.ready}</TableCell>
                    <TableCell align="right">{money(r.amount)}</TableCell>
                    <TableCell align="right">{r.waitingAccount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {canCreate && (
            <div className={classes.stepAction}>
              <Button color="primary" disabled={busy || !ready} onClick={create}>
                {formatMessageWithValues('returned.resend.createCount', { count: ready })}
              </Button>
            </div>
          )}
        </PublishedComponent>

        <PublishedComponent
          pubRef="policyHolder.TabPanel"
          module={MODULE_NAME}
          index={TAB_WITHDRAW}
          value={activeTab}
        >
          <Typography className={classes.help}>{formatMessage('returned.muse.withdraw.help')}</Typography>
          <Typography>
            {withdrawals
              ? formatMessageWithValues('returned.muse.withdrawals', { count: withdrawals })
              : formatMessage('returned.muse.nothing')}
          </Typography>
        </PublishedComponent>
      </DialogContent>
      <DialogActions>
        {message && (
          <span className={`${classes.message} ${message.error ? classes.error : ''}`}>
            {message.error || message.text}
          </span>
        )}
        <Button onClick={onClose} disabled={busy}>{formatMessage('review.close')}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default UnappliedMuseDialog;
