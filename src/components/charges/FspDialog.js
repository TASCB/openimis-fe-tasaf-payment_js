import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import {
  Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Grid, TextField, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import { formatMessage, formatMessageWithValues } from '@openimis/fe-core';
import {
  deleteFsp, deleteFspMappings, saveFspMapping, saveFspProfile,
} from '../../actions';
import { DIALOG_MAX_WIDTH, MODULE_NAME } from '../../constants';
import FspBandEditor from './FspBandEditor';

const BIC_RE = /^[A-Z]{4}TZT[ZX0]$/;

const useStyles = makeStyles((theme) => ({
  section: { margin: theme.spacing(2, 0, 1), fontWeight: 600, color: theme.palette.primary.main },
  divider: { margin: theme.spacing(2, 0, 0) },
  chip: { marginRight: theme.spacing(0.5), marginBottom: theme.spacing(0.5) },
  addName: { display: 'flex', alignItems: 'flex-end', gap: theme.spacing(1), marginTop: theme.spacing(1) },
  hint: { color: theme.palette.text.secondary },
  delete: { color: theme.palette.error.main, marginRight: 'auto' },
}));

const blankFsp = {
  fspCode: '', name: '', fspType: '', bankName: '', bic: '',
};

// provider === null opens the dialog to add an FSP.
function FspDialog({
  provider, canManage, canPropose, onClose,
}) {
  const intl = useIntl();
  const classes = useStyles();
  const dispatch = useDispatch();
  const t = (id) => formatMessage(intl, MODULE_NAME, id);
  const tv = (id, v) => formatMessageWithValues(intl, MODULE_NAME, id, v);
  const state = useSelector((s) => s.tasafPayment);
  const adding = !provider;
  const [form, setForm] = useState(() => (adding ? blankFsp : {
    fspCode: provider.fspCode,
    name: provider.name || '',
    fspType: provider.fspType || '',
    bankName: provider.bankName || '',
    bic: provider.bic || '',
  }));
  const [otherName, setOtherName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const canDelete = !adding && canManage && !provider.accounts && !provider.pending;
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const code = form.fspCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const bic = (form.bic || '').toUpperCase();
  const bicError = !!bic && !BIC_RE.test(bic);
  const detailsComplete = form.bankName.trim() && ['BANK', 'MOBILE'].includes(form.fspType) && BIC_RE.test(bic);
  const detailsEditable = canPropose && !provider?.pending;
  const otherNames = (state?.fspMappings ?? [])
    .filter((m) => m.fspCode === code && m.fspName !== form.name);

  const addFsp = async () => {
    await dispatch(saveFspMapping({ fspName: form.name.trim(), fspCode: code }, tv('fsp.mutation.add', { code })));
    if (canPropose && detailsComplete) {
      dispatch(saveFspProfile({ ...form, fspCode: code, bic }, tv('providers.mutation.save', { code })));
    }
    onClose();
  };

  const field = (key, label, extra = {}) => (
    <Grid item xs={12} sm={6}>
      <TextField fullWidth label={t(label)} value={form[key]} onChange={set(key)} {...extra} />
    </Grid>
  );

  return (
    <Dialog open fullWidth maxWidth={DIALOG_MAX_WIDTH} onClose={onClose}>
      <DialogTitle>{adding ? t('fsp.addTitle') : `${provider.name || provider.fspCode} (${provider.fspCode})`}</DialogTitle>
      <DialogContent>
        <Typography className={classes.section}>{t('fsp.section.details')}</Typography>
        <Grid container spacing={2}>
          {field('fspCode', 'providers.code', {
            required: true,
            disabled: !adding,
            helperText: adding ? t('fsp.code.help') : undefined,
            inputProps: { maxLength: 50, style: { fontFamily: 'monospace', textTransform: 'uppercase' } },
          })}
          {field('name', 'fsp.name', {
            required: adding, disabled: !adding, helperText: adding ? t('fsp.name.help') : undefined,
          })}
          <Grid item xs={12} sm={6}>
            <TextField
              select
              fullWidth
              required
              SelectProps={{ native: true }}
              label={t('providers.channel')}
              value={form.fspType}
              disabled={!adding && !detailsEditable}
              onChange={set('fspType')}
            >
              <option value="" />
              <option value="BANK">{t('providers.channel.BANK')}</option>
              <option value="MOBILE">{t('providers.channel.MOBILE')}</option>
            </TextField>
          </Grid>
          {field('bankName', 'providers.bankName', {
            disabled: !adding && !detailsEditable, inputProps: { maxLength: 100 },
          })}
          {field('bic', 'providers.bic', {
            disabled: !adding && !detailsEditable,
            value: bic,
            error: bicError,
            helperText: bicError ? t('providers.bic.invalid') : t('fsp.bic.help'),
            onChange: (e) => setForm({ ...form, bic: e.target.value.toUpperCase() }),
            inputProps: { maxLength: 8, style: { fontFamily: 'monospace', textTransform: 'uppercase' } },
          })}
          {(adding ? canPropose : detailsEditable) && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label={t('museSettings.reason')}
                placeholder={t('museSettings.reason.placeholder')}
                value={form.reason || ''}
                onChange={set('reason')}
                inputProps={{ maxLength: 500 }}
              />
            </Grid>
          )}
        </Grid>
        {!adding && provider.pending && (
          <Typography variant="body2" className={classes.hint}>{t('providers.pending')}</Typography>
        )}

        {!adding && (
          <>
            <Divider className={classes.divider} />
            <Typography className={classes.section}>{t('fsp.section.otherNames')}</Typography>
            <Typography variant="body2" className={classes.hint}>{t('fsp.otherNames.help')}</Typography>
            <div>
              {!otherNames.length && <Typography variant="body2">—</Typography>}
              {otherNames.map((m) => (
                <Chip
                  key={m.uuid}
                  size="small"
                  className={classes.chip}
                  label={m.fspName}
                  onDelete={canManage
                    ? () => dispatch(deleteFspMappings([m.uuid], t('charges.mapping.mutation.delete')))
                    : undefined}
                />
              ))}
            </div>
            {canManage && (
              <div className={classes.addName}>
                <TextField
                  label={t('fsp.otherNames.add')}
                  value={otherName}
                  onChange={(e) => setOtherName(e.target.value)}
                />
                <Button
                  startIcon={<AddIcon />}
                  disabled={!otherName.trim()}
                  onClick={() => {
                    dispatch(saveFspMapping({ fspName: otherName.trim(), fspCode: code },
                      t('charges.mapping.mutation.save')));
                    setOtherName('');
                  }}
                >
                  {t('fsp.otherNames.addBtn')}
                </Button>
              </div>
            )}

            <Divider className={classes.divider} />
            <Typography className={classes.section}>{t('fsp.section.bands')}</Typography>
            <FspBandEditor fspCode={code} canManage={canManage} />
          </>
        )}
      </DialogContent>
      <DialogActions>
        {canDelete && (
          <Button className={classes.delete} onClick={() => setConfirmDelete(true)}>{t('fsp.delete')}</Button>
        )}
        <Button onClick={onClose}>{t(adding ? 'cancel' : 'fsp.close')}</Button>
        {adding && (
          <Button
            color="primary"
            variant="contained"
            disableElevation
            disabled={!code || !form.name.trim() || !form.fspType || bicError || state?.submittingMutation}
            onClick={addFsp}
          >
            {t('fsp.add')}
          </Button>
        )}
        {!adding && detailsEditable && (
          <Button
            color="primary"
            variant="contained"
            disableElevation
            disabled={!detailsComplete || state?.submittingMutation}
            onClick={() => dispatch(saveFspProfile({ ...form, bic }, tv('providers.mutation.save', { code })))}
          >
            {t('providers.submit')}
          </Button>
        )}
      </DialogActions>
      {confirmDelete && (
        <Dialog open maxWidth="xs" onClose={() => setConfirmDelete(false)}>
          <DialogTitle>{tv('fsp.delete.title', { code })}</DialogTitle>
          <DialogContent>
            <Typography variant="body2">{t('fsp.delete.message')}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDelete(false)}>{t('cancel')}</Button>
            <Button
              className={classes.delete}
              onClick={() => {
                dispatch(deleteFsp(code, tv('fsp.mutation.delete', { code })));
                setConfirmDelete(false);
                onClose();
              }}
            >
              {t('fsp.delete')}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Dialog>
  );
}

export default FspDialog;
