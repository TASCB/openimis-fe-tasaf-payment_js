import React, { useState } from 'react';
import {
  Button, CircularProgress, Grid, Paper, TextField, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import {
  useGraphqlQuery, useModulesManager, useTranslations,
} from '@openimis/fe-core';

import { MODULE_NAME } from '../../constants';
import PreAuditHousehold from './PreAuditHousehold';
import { cycleUuid } from './cycleUuid';

const CARDS = [['MNO', 'preAudit.card.mno'], ['BANK', 'preAudit.card.bank'], ['TOTAL', 'preAudit.card.total']];

const useStyles = makeStyles((theme) => ({
  card: { padding: 20, height: '100%' },
  cardLabel: { color: theme.palette.primary.main },
  amount: { fontWeight: 500 },
  note: { marginTop: theme.spacing(2) },
  lookup: { marginTop: theme.spacing(3), alignItems: 'center' },
}));

const int = (v) => (v ?? 0).toLocaleString();
const money = (v) => (v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

function PreAuditOverview({ paymentWindow }) {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const uuid = cycleUuid(paymentWindow);
  const [hhid, setHhid] = useState('');
  const [opened, setOpened] = useState(null);

  const { isLoading, data, error } = useGraphqlQuery(
    'query PreAuditWindowOverview($id: UUID!) { preAuditWindowOverview(paymentCycleId: $id) }',
    { id: uuid },
    { skip: !uuid },
  );

  if (!uuid) return <Typography>{formatMessage('preAudit.overview.chooseWindow')}</Typography>;
  if (isLoading) return <CircularProgress />;
  if (error) return <Typography color="error">{formatMessage('preAudit.overview.error')}</Typography>;

  const raw = data?.preAuditWindowOverview;
  const overview = (typeof raw === 'string' ? JSON.parse(raw) : raw) || {};

  return (
    <>
      <Typography gutterBottom>
        {formatMessageWithValues('preAudit.overview.window', {
          code: paymentWindow.code, start: paymentWindow.startDate, end: paymentWindow.endDate,
        })}
      </Typography>
      <Grid container spacing={2}>
        {CARDS.map(([key, label]) => {
          const values = overview[key] || {};
          return (
            <Grid item xs={12} sm={4} key={key}>
              <Paper elevation={3} className={classes.card}>
                <Typography variant="h6" gutterBottom className={classes.cardLabel}>
                  {formatMessage(label)}
                </Typography>
                <Typography variant="h5" className={classes.amount}>{money(values.amount)}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {formatMessageWithValues('preAudit.card.counts', {
                    households: int(values.households), payments: int(values.benefits),
                  })}
                </Typography>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
      {[['NO_ACCOUNT', 'noAccount'], ['NO_HOUSEHOLD', 'noHousehold']].map(([key, label]) => {
        const values = overview[key] || {};
        return !!values.benefits && (
          <Typography key={key} variant="body2" color="textSecondary" className={classes.note}>
            {formatMessageWithValues(`preAudit.overview.${label}`, {
              households: int(values.households), payments: int(values.benefits), amount: money(values.amount),
            })}
          </Typography>
        );
      })}
      <Grid container spacing={2} className={classes.lookup}>
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label={formatMessage('preAudit.household.lookup')}
            value={hhid}
            onChange={(e) => setHhid(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && hhid.trim()) setOpened(hhid.trim()); }}
          />
        </Grid>
        <Grid item>
          <Button color="primary" variant="contained" disabled={!hhid.trim()} onClick={() => setOpened(hhid.trim())}>
            {formatMessage('preAudit.household.open')}
          </Button>
        </Grid>
      </Grid>
      {opened && <PreAuditHousehold paymentWindow={paymentWindow} hhid={opened} onClose={() => setOpened(null)} />}
    </>
  );
}

export default PreAuditOverview;
