import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import {
  Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, IconButton,
  TextField, Tooltip, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { alpha } from '@material-ui/core/styles/colorManipulator';
import EditIcon from '@material-ui/icons/Edit';
import { formatMessage, formatMessageWithValues, Searcher } from '@openimis/fe-core';
import { fetchFspProviders, saveFspProfile } from '../../actions';
import { DIALOG_MAX_WIDTH, MODULE_NAME, RIGHT_MUSE_SETTINGS_PROPOSE } from '../../constants';

const BIC_RE = /^[A-Z]{4}TZT[ZX0]$/;
const PAGE_SIZES = [50, 100];

const useStyles = makeStyles((theme) => ({
  hint: { padding: theme.spacing(2, 2, 0) },
  chip: { marginRight: theme.spacing(0.5), marginBottom: theme.spacing(0.5) },
  missing: { color: theme.palette.error.main, fontWeight: 600 },
  awaiting: { color: theme.palette.grey[600], fontStyle: 'italic', cursor: 'help' },
  mono: { fontFamily: 'monospace' },
  toolbar: { display: 'flex', alignItems: 'center', padding: theme.spacing(1.5, 2, 0) },
  segments: {
    display: 'flex', padding: 3, borderRadius: 10, border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
  },
  segment: { textTransform: 'none', fontWeight: 600, borderRadius: 8, padding: theme.spacing(0.5, 2) },
  count: {
    marginLeft: theme.spacing(1), minWidth: 22, padding: '0 6px', borderRadius: 11, fontSize: 12, lineHeight: '22px',
    textAlign: 'center', backgroundColor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main,
  },
  countActive: { backgroundColor: theme.palette.common.white, color: theme.palette.primary.main },
}));

const CHANNELS = ['ALL', 'BANK', 'MOBILE'];

// One list of FSPs: MUSE routing data (bank name, channel, BIC) next to the account names that
// map to each code and whether it has charge bands.
function FspProvidersConfig() {
  const intl = useIntl();
  const classes = useStyles();
  const dispatch = useDispatch();
  const t = (id) => formatMessage(intl, MODULE_NAME, id);
  const tv = (id, v) => formatMessageWithValues(intl, MODULE_NAME, id, v);
  const state = useSelector((s) => s.tasafPayment);
  const rights = useSelector((s) => s.core?.user?.i_user?.rights ?? []);
  const canManage = rights.includes(RIGHT_MUSE_SETTINGS_PROPOSE);
  const [editing, setEditing] = useState(null);
  const [channel, setChannel] = useState('ALL');

  const allProviders = state?.fspProviders ?? [];
  const countOf = (c) => (c === 'ALL' ? allProviders.length : allProviders.filter((p) => p.fspType === c).length);
  const providers = channel === 'ALL' ? allProviders : allProviders.filter((p) => p.fspType === channel);
  const bic = (editing?.bic || '').toUpperCase();
  const bicError = !!bic && !BIC_RE.test(bic);
  const canSave = editing && editing.bankName?.trim() && ['BANK', 'MOBILE'].includes(editing.fspType)
    && BIC_RE.test(bic);

  const headers = () => [
    'providers.code', 'providers.bankName', 'providers.channel', 'providers.bic',
    'providers.names', 'providers.accounts', 'providers.bands', 'emptyLabel',
  ];

  const itemFormatters = () => {
    // Mobile-money operators have no SWIFT BIC: their MUSE details wait on MUSE, not on data entry.
    const cell = (p, value, field) => {
      if (!(p.missing || []).includes(field) || !p.accounts) return value || '—';
      if (p.fspType === 'MOBILE' && field !== 'fspType') {
        return (
          <Tooltip title={t('providers.awaitingMuse.tooltip')}>
            <span className={classes.awaiting}>{t('providers.awaitingMuse')}</span>
          </Tooltip>
        );
      }
      return <span className={classes.missing}>{t('providers.notSet')}</span>;
    };
    return [
      (p) => <span className={classes.mono}>{p.fspCode}</span>,
      (p) => cell(p, p.bankName, 'bankName'),
      (p) => cell(p, p.fspType && t(`providers.channel.${p.fspType}`), 'fspType'),
      (p) => <span className={classes.mono}>{cell(p, p.bic, 'bic')}</span>,
      (p) => (p.names || []).map((n) => <Chip key={n} size="small" label={n} className={classes.chip} />),
      (p) => p.accounts,
      (p) => (p.hasBands ? t('providers.yes') : t('providers.no')),
      (p) => {
        if (p.pending) return <Chip size="small" variant="outlined" color="primary" label={t('providers.pending')} />;
        if (!canManage) return null;
        return (
          <Tooltip title={t('providers.edit')}>
            <IconButton
              size="small"
              onClick={() => setEditing({
                fspCode: p.fspCode, bankName: p.bankName || '', fspType: p.fspType || '', bic: p.bic || '',
              })}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        );
      },
    ];
  };

  return (
    <div>
      <Typography variant="body2" className={classes.hint}>{t('providers.help')}</Typography>
      <div className={classes.toolbar}>
        <div className={classes.segments}>
          {CHANNELS.map((c) => {
            const active = channel === c;
            return (
              <Button
                key={c}
                className={classes.segment}
                variant={active ? 'contained' : 'text'}
                color={active ? 'primary' : 'default'}
                disableElevation
                onClick={() => setChannel(c)}
              >
                {t(`providers.filter.${c}`)}
                <span className={`${classes.count} ${active ? classes.countActive : ''}`}>{countOf(c)}</span>
              </Button>
            );
          })}
        </div>
      </div>
      <Searcher
        key={`providers-${channel}`}
        module={MODULE_NAME}
        fetch={() => dispatch(fetchFspProviders())}
        items={providers}
        itemsPageInfo={{ totalCount: providers.length }}
        fetchingItems={state?.fetchingFspProviders}
        fetchedItems={!state?.fetchingFspProviders}
        errorItems={null}
        tableTitle={tv('providers.searcher.results', { totalCount: providers.length })}
        headers={headers}
        itemFormatters={itemFormatters}
        rowsPerPageOptions={PAGE_SIZES}
        defaultPageSize={PAGE_SIZES[0]}
        rowIdentifier={(p) => p.fspCode}
      />

      {!!editing && (
        <Dialog open fullWidth maxWidth={DIALOG_MAX_WIDTH} onClose={() => setEditing(null)}>
          <DialogTitle>{tv('providers.editTitle', { code: editing.fspCode })}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label={t('providers.bankName')}
                  value={editing.bankName}
                  inputProps={{ maxLength: 100 }}
                  onChange={(e) => setEditing({ ...editing, bankName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  required
                  SelectProps={{ native: true }}
                  label={t('providers.channel')}
                  value={editing.fspType}
                  onChange={(e) => setEditing({ ...editing, fspType: e.target.value })}
                >
                  <option value="" />
                  <option value="BANK">{t('providers.channel.BANK')}</option>
                  <option value="MOBILE">{t('providers.channel.MOBILE')}</option>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label={t('providers.bic')}
                  value={bic}
                  error={bicError}
                  helperText={bicError ? t('providers.bic.invalid') : undefined}
                  inputProps={{ maxLength: 8, style: { fontFamily: 'monospace', textTransform: 'uppercase' } }}
                  onChange={(e) => setEditing({ ...editing, bic: e.target.value.toUpperCase() })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditing(null)}>{t('cancel')}</Button>
            <Button
              color="primary"
              variant="contained"
              disabled={!canSave || state?.submittingMutation}
              onClick={() => {
                dispatch(saveFspProfile({ ...editing, bic }, tv('providers.mutation.save', { code: editing.fspCode })));
                setEditing(null);
              }}
            >
              {t('providers.submit')}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}

export default FspProvidersConfig;
