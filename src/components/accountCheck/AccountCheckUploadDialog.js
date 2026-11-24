import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Button, LinearProgress, Link, Typography,
} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import { makeStyles } from '@material-ui/core/styles';
import {
  Table, baseApiUrl, useModulesManager, useTranslations,
} from '@openimis/fe-core';
import {
  FileDrop, ImportDialog, StatRow, formatFileSize,
} from '@openimis/fe-tasaf_common';

import { ACCOUNT_CHECK_UPLOAD_URL, sendAccountCheck } from '../../actions';
import { MODULE_NAME } from '../../constants';

const MUTATION_SUCCESS = 2;
const TEMPLATE = 'HHID,Name,Account number,FSP\n';
const CHANNEL_LABELS = { GEPG: 'GePG', TIPS: 'TIPS' };

const useStyles = makeStyles(() => ({
  problems: { maxHeight: 260, overflowY: 'auto' },
}));

function AccountCheckUploadDialog({ onClose }) {
  const classes = useStyles();
  const dispatch = useDispatch();
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [job, setJob] = useState(null);

  const template = () => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([TEMPLATE], { type: 'text/csv' }));
    link.download = 'account-check-template.csv';
    link.click();
  };

  const upload = async () => {
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append('file', file);
    try {
      const response = await fetch(`${baseApiUrl}${ACCOUNT_CHECK_UPLOAD_URL}`, {
        // No Content-Type: the browser adds the multipart boundary.
        method: 'POST', body: form, credentials: 'same-origin',
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) setError(body.error || body.detail || formatMessage('accountCheck.uploadFailed'));
      else setJob(body);
    } catch (e) {
      setError(formatMessage('accountCheck.uploadFailed'));
    }
    setBusy(false);
  };

  const send = async () => {
    setBusy(true);
    setError(null);
    const log = await dispatch(sendAccountCheck(job.uuid, formatMessageWithValues('accountCheck.mutation.send', channel)));
    setBusy(false);
    if (log?.status !== MUTATION_SUCCESS) {
      setError(log?.error ? String(log.error) : formatMessageWithValues('accountCheck.sendFailed', channel));
      return;
    }
    onClose(true);
  };

  const channel = { channel: CHANNEL_LABELS[job?.channel] || job?.channel || '' };
  const stat = (label, value) => ({ label: formatMessage(label), value: Number(value || 0).toLocaleString() });

  return (
    <ImportDialog
      title={formatMessage('accountCheck.dialog.title')}
      step={job ? formatMessageWithValues('accountCheck.dialog.step2', channel) : formatMessage('accountCheck.dialog.step1')}
      onClose={() => onClose(!!job)}
      busy={busy}
      closeLabel={formatMessage('button.cancel')}
      actions={(
        <>
          <Button variant="outlined" onClick={() => onClose(!!job)} disabled={busy}>
            {formatMessage('button.cancel')}
          </Button>
          {!job ? (
            <Button color="primary" variant="contained" disableElevation disabled={!file || busy} onClick={upload}>
              {formatMessage('accountCheck.check')}
            </Button>
          ) : (
            <Button
              color="primary"
              variant="contained"
              disableElevation
              disabled={!job.valid_count || busy}
              onClick={send}
            >
              {formatMessageWithValues('accountCheck.send', { count: job.valid_count, ...channel })}
            </Button>
          )}
        </>
      )}
    >
      {!job ? (
        <>
          <Typography variant="body2">
            {formatMessage('accountCheck.dialog.help')}
            {' '}
            <Link component="button" variant="body2" onClick={template}>
              {formatMessage('accountCheck.templateLink')}
            </Link>
          </Typography>
          <FileDrop
            file={file}
            meta={file ? formatFileSize(file.size) : null}
            dropText={formatMessage('accountCheck.dialog.drop')}
            browseText={formatMessage('accountCheck.dialog.browse')}
            removeLabel={formatMessage('accountCheck.dialog.remove')}
            accept=".csv,text/csv"
            onPick={(picked) => { setFile(picked); setError(null); }}
            onRemove={() => setFile(null)}
          />
        </>
      ) : (
        <>
          <StatRow
            stats={[
              stat('accountCheck.stat.rows', job.row_count),
              stat('accountCheck.stat.valid', job.valid_count),
              stat('accountCheck.stat.invalid', job.row_count - job.valid_count),
            ]}
          />
          {!!(job.by_fsp || []).length && (
            <Typography variant="body2" color="textSecondary">
              {(job.by_fsp || []).map((f) => `${f.fsp_code}: ${f.rows}`).join(' · ')}
            </Typography>
          )}
          {(job.problems || []).length > 0 && (
            <div className={classes.problems}>
              <Table
                size="small"
                module={MODULE_NAME}
                headers={['accountCheck.col.row', 'accountCheck.col.name', 'accountCheck.col.account',
                  'accountCheck.col.fsp', 'accountCheck.col.problem']}
                itemFormatters={[
                  (p) => p.row_number,
                  (p) => p.name || '-',
                  (p) => p.account_number || '-',
                  (p) => p.fsp || '-',
                  (p) => p.problem,
                ]}
                items={job.problems}
                itemIdentifier={(p) => p.row_number}
              />
            </div>
          )}
        </>
      )}
      {busy && <LinearProgress />}
      {error && <Alert severity="error">{error}</Alert>}
    </ImportDialog>
  );
}

export default AccountCheckUploadDialog;
