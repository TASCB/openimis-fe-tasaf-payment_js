import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Button, CircularProgress, Divider, Grid, Paper, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import RefreshIcon from '@material-ui/icons/Refresh';
import {
  SelectInput, TextInput, useModulesManager, useTranslations,
} from '@openimis/fe-core';

import { fetchGepgRequests, fetchTipsRequests } from '../actions';
import { MODULE_NAME } from '../constants';
import GepgRequestsTable from './GepgRequestsTable';
import TipsRequestsTable from './TipsRequestsTable';

const CHANNELS = ['TIPS', 'GEPG'];
const STATUSES = {
  GEPG: ['SENDING', 'SENT', 'ACCEPTED', 'ANSWERED', 'REJECTED', 'REFUSED', 'FAILED', 'EXPIRED'],
  TIPS: ['SENDING', 'SENT', 'ACCEPTED', 'ANSWERED', 'REFUSED', 'FAILED', 'EXPIRED'],
};
const LIMIT = 200;

const useStyles = makeStyles((theme) => ({
  paper: theme.paper.paper,
  header: {
    ...theme.table.title, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: theme.spacing(1, 2),
  },
  filters: { padding: theme.spacing(1, 2) },
  item: { padding: theme.spacing(1) },
  empty: { padding: theme.spacing(2), color: theme.palette.grey[600] },
}));

function VerificationRequestsPanel({ channel: initialChannel }) {
  const classes = useStyles();
  const dispatch = useDispatch();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const state = useSelector((s) => s.tasafPayment);
  const [channel, setChannel] = useState(CHANNELS.includes(initialChannel) ? initialChannel : 'TIPS');
  const [status, setStatus] = useState(null);
  const [fsp, setFsp] = useState('');
  const [fspQuery, setFspQuery] = useState('');
  const submitting = state?.submittingMutation;
  const wasSubmitting = useRef(submitting);

  useEffect(() => { if (CHANNELS.includes(initialChannel)) setChannel(initialChannel); }, [initialChannel]);
  useEffect(() => {
    const timer = setTimeout(() => setFspQuery(fsp.trim().toUpperCase()), 400);
    return () => clearTimeout(timer);
  }, [fsp]);
  const load = () => dispatch(channel === 'TIPS'
    ? fetchTipsRequests(status, fspQuery, LIMIT) : fetchGepgRequests(status, fspQuery, LIMIT));
  useEffect(() => { load(); }, [channel, status, fspQuery]);
  useEffect(() => {
    if (wasSubmitting.current && !submitting) load();
    wasSubmitting.current = submitting;
  }, [submitting]);

  const tips = channel === 'TIPS';
  const requests = (tips ? state?.tipsRequests : state?.gepgRequests) || [];
  const fetching = tips ? state?.fetchingTipsRequests : state?.fetchingGepgRequests;
  const label = (c) => formatMessage(`verificationRequests.channel.${c}`);

  return (
    <Paper className={classes.paper}>
      <div className={classes.header}>
        <Typography variant="h6">
          {formatMessageWithValues('verificationRequests.title', { count: requests.length, channel: label(channel) })}
        </Typography>
        <Button color="primary" startIcon={fetching ? <CircularProgress size={14} /> : <RefreshIcon />} onClick={load}>
          {formatMessage('verificationRequests.refresh')}
        </Button>
      </div>
      <Divider />
      <Grid container className={classes.filters}>
        <Grid item xs={12} sm={4} md={3} className={classes.item}>
          <SelectInput
            module={MODULE_NAME}
            label="verificationRequests.filter.channel"
            options={CHANNELS.map((c) => ({ value: c, label: label(c) }))}
            value={channel}
            onChange={(v) => { setChannel(v || 'TIPS'); setStatus(null); }}
          />
        </Grid>
        <Grid item xs={12} sm={4} md={3} className={classes.item}>
          <SelectInput
            module={MODULE_NAME}
            label="verificationRequests.filter.status"
            options={[{ value: null, label: formatMessage('tooltip.any') },
              ...STATUSES[channel].map((s) => ({
                value: s, label: formatMessage(`${tips ? 'tips' : 'gepg'}.status.${s}`),
              }))]}
            value={status}
            onChange={setStatus}
          />
        </Grid>
        <Grid item xs={12} sm={4} md={3} className={classes.item}>
          <TextInput module={MODULE_NAME} label="verificationRequests.filter.fsp" value={fsp} onChange={setFsp} />
        </Grid>
      </Grid>
      <Divider />
      {tips
        ? <TipsRequestsTable requests={requests} emptyClassName={classes.empty} />
        : <GepgRequestsTable requests={requests} emptyClassName={classes.empty} />}
    </Paper>
  );
}

export default VerificationRequestsPanel;
