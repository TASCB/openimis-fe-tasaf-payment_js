import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import {
  Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, Grid, IconButton, Table, TableBody, TableCell, TableHead, TableRow, TextField,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import PublishIcon from '@material-ui/icons/Publish';
import { formatMessage, PublishedComponent } from '@openimis/fe-core';
import {
  fetchFspBandSet, fetchKnownFsps, saveFspCharges,
  fetchFspMappings, fetchUnmappedFsps, saveFspMapping, deleteFspMappings,
  importWithdrawalCharges,
} from '../../actions';
import { DIALOG_MAX_WIDTH, MODULE_NAME, RIGHT_WITHDRAWAL_CHARGE_MANAGE } from '../../constants';

const useStyles = makeStyles((theme) => ({
  root: { padding: theme.spacing(2) },
  actions: { marginTop: theme.spacing(2) },
  hint: { color: theme.palette.text.secondary, marginBottom: theme.spacing(1) },
  narrow: { width: 180 },
  chip: { marginRight: theme.spacing(1), marginBottom: theme.spacing(0.5) },
}));

const toRow = (b) => ({
  lowerAmount: b.lowerAmount ?? '',
  upperAmount: b.upperAmount ?? '',
  withdrawal: b.withdrawal ?? '',
});

function FspChargesConfig() {
  const intl = useIntl();
  const classes = useStyles();
  const dispatch = useDispatch();
  const t = (id) => formatMessage(intl, MODULE_NAME, id);
  const state = useSelector((s) => s.tasafPayment);
  const rights = useSelector((store) => store.core?.user?.i_user?.rights ?? []);
  const canManage = rights.includes(RIGHT_WITHDRAWAL_CHARGE_MANAGE);

  const [fsp, setFsp] = useState('');
  const [dialog, setDialog] = useState(null);
  const [mapping, setMapping] = useState({ fspName: '', fspCode: '' });
  const [csv, setCsv] = useState('');
  const [rows, setRows] = useState([]);
  const [effectiveFrom, setEffectiveFrom] = useState(null);

  useEffect(() => {
    dispatch(fetchKnownFsps());
    dispatch(fetchFspMappings([]));
    dispatch(fetchUnmappedFsps());
  }, []);
  useEffect(() => { if (fsp) dispatch(fetchFspBandSet(fsp)); }, [fsp]);
  useEffect(() => { setRows((state?.fspBandSet ?? []).map(toRow)); }, [state?.fspBandSet]);

  const setCell = (idx, field, value) => setRows(
    (rs) => rs.map((r, i) => (i === idx ? { ...r, [field]: value } : r)),
  );

  const overlapError = (() => {
    const parsed = rows
      .map((r) => [Number(r.lowerAmount), Number(r.upperAmount)])
      .filter(([lo, hi]) => !Number.isNaN(lo) && !Number.isNaN(hi))
      .sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < parsed.length; i += 1) {
      if (parsed[i][0] <= parsed[i - 1][1]) {
        return t('charges.config.overlap');
      }
    }
    return null;
  })();

  const incomplete = rows.some(
    (r) => r.lowerAmount === '' || r.upperAmount === '' || r.withdrawal === '',
  );

  return (
    <div className={classes.root}>
      <Typography variant="subtitle2" className={classes.hint}>
        {t('charges.config.help')}
      </Typography>

      {/* Onboarding a new FSP: map its account display name to a tariff code, then edit
          its bands below. Accounts whose FSP has no bands are flagged first. */}
      <Grid container alignItems="center" justifyContent="space-between">
        <Grid item>
          <Typography variant="subtitle2">{t('charges.mapping.title')}</Typography>
        </Grid>
        {canManage && (
          <Grid item>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={() => { setMapping({ fspName: '', fspCode: '' }); setDialog('mapping'); }}
            >
              {t('charges.mapping.add')}
            </Button>
            <Button
              size="small"
              startIcon={<PublishIcon />}
              onClick={() => { setCsv(''); setDialog('import'); }}
            >
              {t('charges.import')}
            </Button>
          </Grid>
        )}
      </Grid>
      <div>
        {(state?.unmappedFsps ?? []).map((u) => (
          <Chip
            key={u.fspName}
            size="small"
            color="secondary"
            className={classes.chip}
            label={`${u.fspName} \u2192 ${u.resolvedCode} (no bands)`}
          />
        ))}
        {(state?.fspMappings ?? []).map((m) => (
          <Chip
            key={m.uuid}
            size="small"
            className={classes.chip}
            label={`${m.fspName} \u2192 ${m.fspCode}`}
            onClick={canManage ? () => { setMapping({ ...m }); setDialog('mapping'); } : undefined}
            onDelete={canManage
              ? () => dispatch(deleteFspMappings([m.uuid], t('charges.mapping.mutation.delete')))
              : undefined}
          />
        ))}
      </div>

      <Divider className={classes.actions} />

      <Grid container spacing={2} alignItems="center">
        <Grid item xs={4}>
          <TextField
            select
            fullWidth
            SelectProps={{ native: true }}
            label={t('charges.fspCode')}
            value={fsp}
            onChange={(e) => setFsp(e.target.value)}
          >
            <option value="" />
            {(state?.knownFsps ?? []).map((f) => (
              <option key={f.fspCode} value={f.fspCode}>
                {f.fspCode === f.fspName ? f.fspCode : `${f.fspCode} (${f.fspName})`}
              </option>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={4}>
          <PublishedComponent
            pubRef="core.DatePicker"
            module={MODULE_NAME}
            label={t('charges.effectiveFrom')}
            value={effectiveFrom}
            onChange={setEffectiveFrom}
          />
        </Grid>
      </Grid>

      <Divider className={classes.actions} />

      {!fsp && (
        <Typography variant="body2" className={classes.hint}>
          {t('charges.config.pickFirst')}
        </Typography>
      )}

      {!!fsp && state?.fetchingBandSet && <CircularProgress size={24} />}

      {!!fsp && !state?.fetchingBandSet && (
        <>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t('charges.lowerAmount')}</TableCell>
                <TableCell>{t('charges.upperAmount')}</TableCell>
                <TableCell>{t('charges.withdrawal')}</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r, idx) => (
                <TableRow key={idx}>
                  {['lowerAmount', 'upperAmount', 'withdrawal'].map((field) => (
                    <TableCell key={field}>
                      <TextField
                        type="number"
                        className={classes.narrow}
                        value={r[field]}
                        disabled={!canManage}
                        onChange={(e) => setCell(idx, field, e.target.value)}
                      />
                    </TableCell>
                  ))}
                  <TableCell>
                    {canManage && (
                      <IconButton
                        size="small"
                        onClick={() => setRows((rs) => rs.filter((_, i) => i !== idx))}
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {canManage && (
            <div className={classes.actions}>
              <Button
                startIcon={<AddIcon />}
                onClick={() => setRows((rs) => [...rs,
                  { lowerAmount: '', upperAmount: '', withdrawal: '' }])}
              >
                {t('charges.config.addRow')}
              </Button>
            </div>
          )}

          {!!overlapError && (
            <Typography variant="body2" color="error">{overlapError}</Typography>
          )}

          {canManage && (
            <div className={classes.actions}>
              <Button
                variant="contained"
                color="primary"
                disabled={!rows.length || incomplete || !!overlapError
                  || state?.submittingMutation}
                startIcon={state?.submittingMutation ? <CircularProgress size={20} /> : null}
                onClick={() => dispatch(saveFspCharges(
                  fsp, rows, effectiveFrom, t('charges.config.mutation.apply'),
                ))}
              >
                {t('charges.config.apply')}
              </Button>
              <Typography variant="caption" className={classes.hint}>
                {t('charges.config.approvalNote')}
              </Typography>
            </div>
          )}
        </>
      )}
      {dialog === 'mapping' && (
        <Dialog open fullWidth maxWidth={DIALOG_MAX_WIDTH} onClose={() => setDialog(null)}>
          <DialogTitle>{t('charges.mapping.add')}</DialogTitle>
          <DialogContent>
            <Typography variant="body2">{t('charges.mapping.help')}</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  select
                  fullWidth
                  SelectProps={{ native: true }}
                  label={t('charges.mapping.fspName')}
                  value={mapping.fspName ?? ''}
                  onChange={(e) => setMapping({ ...mapping, fspName: e.target.value })}
                >
                  <option value="" />
                  {(state?.knownFsps ?? []).filter((f) => f.onAccounts).map((f) => (
                    <option key={f.fspName} value={f.fspName}>{f.fspName}</option>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label={t('charges.mapping.fspCode')}
                  value={mapping.fspCode ?? ''}
                  onChange={(e) => setMapping({ ...mapping, fspCode: e.target.value })}
                  helperText={t('charges.mapping.fspCode.help')}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialog(null)}>{t('cancel')}</Button>
            <Button
              color="primary"
              disabled={!mapping.fspName || !mapping.fspCode}
              onClick={() => {
                dispatch(saveFspMapping(mapping, t('charges.mapping.mutation.save')));
                setDialog(null);
              }}
            >
              {t('save')}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {dialog === 'import' && (
        <Dialog open fullWidth maxWidth={DIALOG_MAX_WIDTH} onClose={() => setDialog(null)}>
          <DialogTitle>{t('charges.import')}</DialogTitle>
          <DialogContent>
            <Typography variant="body2">{t('charges.import.help')}</Typography>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setCsv(String(reader.result));
                reader.readAsText(file);
              }}
            />
            <TextField
              fullWidth
              multiline
              minRows={6}
              maxRows={14}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialog(null)}>{t('cancel')}</Button>
            <Button
              color="primary"
              disabled={!csv.trim()}
              onClick={() => {
                dispatch(importWithdrawalCharges(csv, false, t('charges.mutation.import')));
                setDialog(null);
              }}
            >
              {t('charges.import.run')}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}

export default FspChargesConfig;
