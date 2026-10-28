import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, Table, TableBody, TableCell, TableHead, TableRow,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { baseApiUrl, useModulesManager, useTranslations } from '@openimis/fe-core';

import { ACCOUNT_CHECK_UPLOAD_URL, sendAccountCheck } from '../../actions';
import { MODULE_NAME } from '../../constants';

const MUTATION_SUCCESS = 2;
const TEMPLATE = 'HHID,Name,Account number,FSP\n';

const useStyles = makeStyles((theme) => ({
  line: { marginBottom: theme.spacing(1) },
  error: { color: theme.palette.error.main, marginTop: theme.spacing(1) },
  problems: { maxHeight: 260, overflowY: 'auto', marginTop: theme.spacing(1) },
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
    const log = await dispatch(sendAccountCheck(job.uuid, formatMessage('accountCheck.mutation.send')));
    setBusy(false);
    if (log?.status !== MUTATION_SUCCESS) {
      setError(log?.error ? String(log.error) : formatMessage('accountCheck.sendFailed'));
      return;
    }
    onClose(true);
  };

  return (
    <Dialog open fullWidth maxWidth="md" onClose={() => onClose(!!job)}>
      <DialogTitle>{formatMessage('accountCheck.dialog.title')}</DialogTitle>
      <DialogContent>
        {!job ? (
          <>
            <Typography variant="body2" className={classes.line}>
              {formatMessage('accountCheck.dialog.help')}
            </Typography>
            <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </>
        ) : (
          <>
            <Typography variant="body2" className={classes.line}>
              {formatMessageWithValues('accountCheck.dialog.summary', {
                rows: job.row_count, valid: job.valid_count, invalid: job.row_count - job.valid_count,
              })}
            </Typography>
            <Typography variant="body2" className={classes.line}>
              {(job.by_fsp || []).map((f) => `${f.fsp_code}: ${f.rows}`).join(' · ')}
            </Typography>
            {(job.problems || []).length > 0 && (
              <div className={classes.problems}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>{formatMessage('accountCheck.col.row')}</TableCell>
                      <TableCell>{formatMessage('accountCheck.col.name')}</TableCell>
                      <TableCell>{formatMessage('accountCheck.col.account')}</TableCell>
                      <TableCell>{formatMessage('accountCheck.col.fsp')}</TableCell>
                      <TableCell>{formatMessage('accountCheck.col.problem')}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {job.problems.map((p) => (
                      <TableRow key={p.row_number}>
                        <TableCell>{p.row_number}</TableCell>
                        <TableCell>{p.name || '-'}</TableCell>
                        <TableCell>{p.account_number || '-'}</TableCell>
                        <TableCell>{p.fsp || '-'}</TableCell>
                        <TableCell>{p.problem}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
        {error && <Typography variant="body2" className={classes.error}>{error}</Typography>}
      </DialogContent>
      <DialogActions>
        {!job && <Button color="primary" onClick={template}>{formatMessage('accountCheck.template')}</Button>}
        <Button color="primary" onClick={() => onClose(!!job)} disabled={busy}>{formatMessage('button.cancel')}</Button>
        {!job ? (
          <Button color="primary" variant="contained" disableElevation disabled={!file || busy} onClick={upload}>
            {formatMessage('accountCheck.check')}
          </Button>
        ) : (
          <Button color="primary" variant="contained" disableElevation disabled={!job.valid_count || busy} onClick={send}>
            {formatMessageWithValues('accountCheck.send', { count: job.valid_count })}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default AccountCheckUploadDialog;
