import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import {
  Fab, Grid, IconButton, Paper, Tab, Tooltip, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { alpha } from '@material-ui/core/styles/colorManipulator';
import AddIcon from '@material-ui/icons/Add';
import EditIcon from '@material-ui/icons/Edit';
import PublishIcon from '@material-ui/icons/Publish';
import {
  formatMessage, formatMessageWithValues, Searcher, SelectInput, TextInput, withTooltip,
} from '@openimis/fe-core';
import { fetchFspMappings, fetchFspProviders } from '../../actions';
import {
  MODULE_NAME, RIGHT_MUSE_SETTINGS_PROPOSE, RIGHT_WITHDRAWAL_CHARGE_MANAGE,
} from '../../constants';
import ChargesImportDialog from './ChargesImportDialog';
import FspDialog from './FspDialog';

const PAGE_SIZES = [50, 100];
const CHANNELS = ['ALL', 'BANK', 'MOBILE'];
const STATUSES = ['attention', 'ready', 'unused', 'noBands', 'gap', 'museMissing', 'pending'];

const amount = (v) => Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 });
const gapsOf = (p) => {
  try {
    return (typeof p.bandGaps === 'string' ? JSON.parse(p.bandGaps) : p.bandGaps) || [];
  } catch (e) {
    return [];
  }
};

export const fspIssues = (p) => {
  const issues = [];
  if (p.accounts && !p.bandCount) issues.push({ key: 'noBands', tone: 'error' });
  if (p.accounts) {
    gapsOf(p).forEach((g) => issues.push({ key: 'gap', tone: 'error', values: { from: amount(g.from), to: amount(g.to) } }));
  }
  if (p.accounts && (p.missing || []).length) {
    issues.push(p.fspType === 'MOBILE' ? { key: 'awaitingMuse', tone: 'awaiting' } : { key: 'museMissing', tone: 'error' });
  }
  if (p.pending || p.bandsPending || p.namesPending) issues.push({ key: 'pending', tone: 'pending' });
  return issues;
};

const hasStatus = (p, status) => {
  const keys = fspIssues(p).map((i) => i.key);
  switch (status) {
    case 'attention': return keys.length > 0;
    case 'ready': return !keys.length && !!p.accounts;
    case 'unused': return !keys.length && !p.accounts;
    case 'museMissing': return keys.includes('museMissing') || keys.includes('awaitingMuse');
    default: return keys.includes(status);
  }
};

const matchesSearch = (p, text) => {
  const q = text.trim().toLowerCase();
  return !q || [p.fspCode, p.name, ...(p.names || [])].some((n) => (n || '').toLowerCase().includes(q));
};

const useStyles = makeStyles((theme) => ({
  hint: { padding: theme.spacing(2, 2, 0) },
  missing: { color: theme.palette.error.main, fontWeight: 600 },
  awaiting: { color: theme.palette.grey[600], fontStyle: 'italic', cursor: 'help' },
  pendingText: { color: theme.palette.primary.main },
  ready: { color: theme.palette.success.dark },
  unused: { color: theme.palette.grey[600] },
  status: { whiteSpace: 'nowrap' },
  filters: { padding: theme.spacing(1, 1, 0) },
  filter: { padding: theme.spacing(1) },
  mono: { fontFamily: 'monospace' },
  paper: theme.paper.paper,
  tableTitle: theme.table.title,
  tabs: { display: 'flex', alignItems: 'center' },
  selectedTab: { borderBottom: '4px solid white' },
  unselectedTab: { borderBottom: '4px solid transparent' },
  count: {
    marginLeft: theme.spacing(1), minWidth: 22, padding: '0 6px', borderRadius: 11, fontSize: 12, lineHeight: '22px',
    textAlign: 'center', backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  bandActions: {
    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: theme.spacing(1), paddingRight: theme.spacing(1),
  },
  bandIcon: { color: 'inherit' },
  fab: theme.fab,
}));

function FspProvidersConfig() {
  const intl = useIntl();
  const classes = useStyles();
  const dispatch = useDispatch();
  const t = (id) => formatMessage(intl, MODULE_NAME, id);
  const tv = (id, v) => formatMessageWithValues(intl, MODULE_NAME, id, v);
  const state = useSelector((s) => s.tasafPayment);
  const rights = useSelector((s) => s.core?.user?.i_user?.rights ?? []);
  const canManage = rights.includes(RIGHT_WITHDRAWAL_CHARGE_MANAGE);
  const canPropose = rights.includes(RIGHT_MUSE_SETTINGS_PROPOSE);
  const [channel, setChannel] = useState('ALL');
  const [openCode, setOpenCode] = useState(null);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [bicFilter, setBicFilter] = useState('');

  useEffect(() => { dispatch(fetchFspMappings([])); }, []);

  const allProviders = (state?.fspProviders ?? []).filter((p) => matchesSearch(p, search)
    && (!statusFilter || hasStatus(p, statusFilter))
    && (!bicFilter || (bicFilter === 'set') === !!p.bic));
  const countOf = (c) => (c === 'ALL' ? allProviders.length : allProviders.filter((p) => p.fspType === c).length);
  const providers = channel === 'ALL' ? allProviders : allProviders.filter((p) => p.fspType === channel);
  const opened = allProviders.find((p) => p.fspCode === openCode);

  const headers = () => [
    'providers.code', 'fsp.name', 'providers.channel', 'providers.bic',
    'providers.bands', 'providers.accounts', 'providers.status', 'emptyLabel',
  ];

  const tones = {
    error: classes.missing, awaiting: classes.awaiting, pending: classes.pendingText,
  };
  const status = (p) => {
    const issues = fspIssues(p);
    if (!issues.length) {
      return <span className={p.accounts ? classes.ready : classes.unused}>{t(p.accounts ? 'providers.status.ready' : 'providers.status.unused')}</span>;
    }
    return issues.map((i) => (
      <div key={`${i.key}-${i.values?.from || ''}`} className={`${classes.status} ${tones[i.tone]}`}>
        {tv(`providers.status.${i.key}`, i.values || {})}
      </div>
    ));
  };

  const itemFormatters = () => {
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
      (p) => p.name,
      (p) => cell(p, p.fspType && t(`providers.channel.${p.fspType}`), 'fspType'),
      (p) => <span className={classes.mono}>{cell(p, p.bic, 'bic')}</span>,
      (p) => (p.bandCount ? p.bandCount : <span className={classes.missing}>{t('fsp.bands.noneShort')}</span>),
      (p) => p.accounts,
      status,
      (p) => (
        <>
          <Tooltip title={t('fsp.open')}>
            <IconButton size="small" onClick={() => setOpenCode(p.fspCode)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      ),
    ];
  };

  return (
    <div>
      <Typography variant="body2" className={classes.hint}>{t('fsp.help')}</Typography>
      <Grid container className={classes.filters}>
        <Grid item xs={12} sm={6} md={4} className={classes.filter}>
          <TextInput module={MODULE_NAME} label="providers.search" value={search} onChange={setSearch} />
        </Grid>
        <Grid item xs={12} sm={6} md={4} className={classes.filter}>
          <SelectInput
            module={MODULE_NAME}
            label="providers.status"
            options={[{ value: '', label: t('providers.anyStatus') },
              ...STATUSES.map((s) => ({ value: s, label: t(`providers.statusFilter.${s}`) }))]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} className={classes.filter}>
          <SelectInput
            module={MODULE_NAME}
            label="providers.bic"
            options={['', 'set', 'missing'].map((v) => ({ value: v, label: t(`providers.bicFilter.${v || 'any'}`) }))}
            value={bicFilter}
            onChange={setBicFilter}
          />
        </Grid>
      </Grid>
      <Paper className={classes.paper}>
        <Grid container className={`${classes.tableTitle} ${classes.tabs}`}>
          {CHANNELS.map((c) => (
            <Tab
              key={c}
              value={c}
              selected={channel === c}
              onChange={(_, v) => setChannel(v)}
              className={channel === c ? classes.selectedTab : classes.unselectedTab}
              label={(
                <span>
                  {t(`providers.filter.${c}`)}
                  <span className={classes.count}>{countOf(c)}</span>
                </span>
              )}
            />
          ))}
          {canManage && (
            <div className={classes.bandActions}>
              <Tooltip title={t('charges.import')}>
                <IconButton className={classes.bandIcon} onClick={() => setImporting(true)}>
                  <PublishIcon />
                </IconButton>
              </Tooltip>
            </div>
          )}
        </Grid>
        <Searcher
          key={`providers-${channel}-${statusFilter}-${bicFilter}`}
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
          onDoubleClick={(p) => setOpenCode(p.fspCode)}
          rowsPerPageOptions={PAGE_SIZES}
          defaultPageSize={PAGE_SIZES[0]}
          rowIdentifier={(p) => p.fspCode}
        />
      </Paper>

      {canManage && withTooltip(
        <div className={classes.fab}>
          <Fab color="primary" aria-label={t('fsp.addTitle')} onClick={() => setAdding(true)}><AddIcon /></Fab>
        </div>,
        t('fsp.addTitle'),
      )}

      {(adding || !!opened) && (
        <FspDialog
          key={adding ? 'add' : openCode}
          provider={adding ? null : opened}
          canManage={canManage}
          canPropose={canPropose}
          onClose={() => { setAdding(false); setOpenCode(null); }}
        />
      )}

      {importing && <ChargesImportDialog onClose={() => setImporting(false)} />}
    </div>
  );
}

export default FspProvidersConfig;
