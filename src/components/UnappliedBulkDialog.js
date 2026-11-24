import React, { useEffect, useState } from 'react';
import {
  Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Radio,
  RadioGroup, TextField, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import { useModulesManager, useTranslations } from '@openimis/fe-core';

import { MODULE_NAME, UNAPPLIED_ACTIONS } from '../constants';

const SUGGESTED = 'SUGGESTED';
const PREVIEW_DELAY_MS = 500;

const useStyles = makeStyles((theme) => ({
  hint: { fontSize: 12.5, color: theme.palette.text.secondary, margin: theme.spacing(-0.5, 0, 0.5, 4) },
  note: { marginTop: theme.spacing(2) },
  summary: { marginTop: theme.spacing(2) },
  row: { display: 'flex', justifyContent: 'space-between', gap: theme.spacing(3), padding: theme.spacing(0.25, 0) },
  value: { fontWeight: 600 },
  refused: { color: theme.palette.error.main },
  warning: {
    display: 'flex', alignItems: 'flex-start', gap: theme.spacing(1), color: theme.palette.error.main,
  },
  icon: { fontSize: 18, marginTop: 1, flexShrink: 0 },
}));

const totalOf = (counts) => Object.values(counts || {}).reduce((n, c) => n + c, 0);

function UnappliedBulkDialog({
  scope, onClose, onDone, fetchPreview, decide,
}) {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const [action, setAction] = useState(SUGGESTED);
  const suggested = action === SUGGESTED;
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!scope || result) return undefined;
    let live = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      const plan = await fetchPreview(action, note, scope);
      if (!live) return;
      setPreview(plan);
      setError(plan?.error || (plan ? null : formatMessage('returned.bulk.previewFailed')));
      setLoading(false);
    }, PREVIEW_DELAY_MS);
    return () => { live = false; clearTimeout(timer); };
  }, [scope, action, note]);

  if (!scope) return null;

  const actionLabel = (a) => formatMessage(`returned.action.${a}`);
  const shown = result || preview;
  const decidedTotal = totalOf(preview?.decided);

  const confirm = async () => {
    setSubmitting(true);
    const label = formatMessageWithValues('returned.bulk.mutation', {
      count: decidedTotal, action: suggested ? formatMessage('returned.bulk.suggestedAction') : actionLabel(action),
    });
    const { log, outcome } = await decide(action, note, scope, label);
    setSubmitting(false);
    if (!outcome) {
      setError(log?.error || formatMessage('returned.bulk.failed'));
      return;
    }
    setResult(outcome);
    onDone();
  };

  const counts = (plan, done) => (
    <div className={classes.summary}>
      {Object.entries(plan.decided || {}).map(([a, n]) => (
        <div className={classes.row} key={a}>
          <Typography>
            {formatMessage(done ? `returned.bulk.done.${a}` : `returned.bulk.will.${a}`)}
          </Typography>
          <Typography className={classes.value}>{n}</Typography>
        </div>
      ))}
      {(plan.refused || []).map((r) => (
        <div className={classes.row} key={r.reason}>
          <Typography variant="body2" className={classes.warning}>
            <ErrorOutlineIcon className={classes.icon} />
            {r.reason}
          </Typography>
          <Typography className={`${classes.value} ${classes.refused}`}>{r.count}</Typography>
        </div>
      ))}
    </div>
  );

  let body;
  if (result?.queued) {
    body = <Typography>{formatMessageWithValues('returned.bulk.queued', { count: result.total })}</Typography>;
  } else if (result) {
    body = counts(result, true);
  } else {
    body = (
      <>
        <RadioGroup value={action} onChange={(e) => setAction(e.target.value)}>
          {[SUGGESTED, ...UNAPPLIED_ACTIONS].map((a) => (
            <React.Fragment key={a}>
              <FormControlLabel value={a} control={<Radio color="primary" />} label={actionLabel(a)} />
              <div className={classes.hint}>{formatMessage(`returned.action.${a}.hint`)}</div>
            </React.Fragment>
          ))}
        </RadioGroup>
        <TextField
          className={classes.note}
          label={formatMessage('returned.decision.note')}
          helperText={formatMessage('returned.bulk.noteHelp')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          multiline
          minRows={2}
          fullWidth
          variant="outlined"
        />
        {loading && <div className={classes.summary}><CircularProgress size={20} /></div>}
        {!loading && preview && !preview.error && counts(preview, false)}
      </>
    );
  }

  return (
    <Dialog open onClose={submitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {formatMessageWithValues('returned.bulk.title', { count: shown?.total ?? scope.count })}
      </DialogTitle>
      <DialogContent>
        {body}
        {error && (
          <Typography variant="body2" className={classes.warning}>
            <ErrorOutlineIcon className={classes.icon} />
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          {formatMessage(result ? 'returned.bulk.close' : 'returned.decision.confirm.cancel')}
        </Button>
        {!result && (
          <Button
            color="primary"
            variant="contained"
            disableElevation
            disabled={loading || submitting || decidedTotal === 0}
            onClick={confirm}
          >
            {formatMessageWithValues('returned.bulk.confirm', { count: decidedTotal })}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default UnappliedBulkDialog;
