import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import {
  Fab, Grid, IconButton, Tooltip, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import AddIcon from '@material-ui/icons/Add';
import EditIcon from '@material-ui/icons/Edit';
import {
  formatMessage, formatMessageWithValues, Searcher, SelectInput, TextInput, withTooltip,
} from '@openimis/fe-core';
import { fetchFspMappings, fetchFspProviders } from '../../actions';
import {
  MODULE_NAME, RIGHT_MUSE_SETTINGS_PROPOSE, RIGHT_WITHDRAWAL_CHARGE_MANAGE,
} from '../../constants';
import ChargesImportDialog from './ChargesImportDialog';
import FspDialog from './FspDialog';

const CHANNELS = ['BANK', 'MOBILE'];
const FILTER_KEYS = ['search', 'channel', 'status', 'bic'];
const FILTER_RE = /^(search|channel|status|bic): "(.*)"$/;
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
  awaiting: { cursor: 'help' },
  status: { whiteSpace: 'nowrap' },
  filter: { padding: theme.spacing(1) },
  mono: { fontFamily: 'monospace' },
  fab: theme.fab,
}));

function ProvidersFilter({ filters, onChangeFilters }) {
  const intl = useIntl();
  const classes = useStyles();
  const t = (id) => formatMessage(intl, MODULE_NAME, id);
  const value = (key) => filters?.[key]?.value ?? '';
  const set = (key) => (v) => onChangeFilters([{ id: key, value: v, filter: v ? `${key}: "${v}"` : '' }]);
  return (
    <Grid container>
      <Grid item xs={12} sm={6} md={3} className={classes.filter}>
        <TextInput module={MODULE_NAME} label="providers.search" value={value('search')} onChange={set('search')} />
      </Grid>
      <Grid item xs={12} sm={6} md={3} className={classes.filter}>
        <SelectInput
          module={MODULE_NAME}
          label="providers.channel"
          options={[{ value: '', label: t('providers.anyChannel') },
            ...CHANNELS.map((c) => ({ value: c, label: t(`providers.filter.${c}`) }))]}
          value={value('channel')}
          onChange={set('channel')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3} className={classes.filter}>
        <SelectInput
          module={MODULE_NAME}
          label="providers.status"
          options={[{ value: '', label: t('providers.anyStatus') },
            ...STATUSES.map((st) => ({ value: st, label: t(`providers.statusFilter.${st}`) }))]}
          value={value('status')}
          onChange={set('status')}
        />
      </Grid>
      <Grid item xs={12} sm={6} md={3} className={classes.filter}>
        <SelectInput
          module={MODULE_NAME}
          label="providers.bic"
          options={['', 'set', 'missing'].map((v) => ({ value: v, label: t(`providers.bicFilter.${v || 'any'}`) }))}
          value={value('bic')}
          onChange={set('bic')}
        />
      </Grid>
    </Grid>
  );
}

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
  const [openCode, setOpenCode] = useState(null);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [filters, setFilters] = useState({});

  useEffect(() => { dispatch(fetchFspMappings([])); }, []);

  const fetch = (params) => {
    const next = Object.fromEntries(FILTER_KEYS.map((k) => [k, '']));
    (params || []).forEach((p) => {
      const match = FILTER_RE.exec(p);
      if (match) [, , next[match[1]]] = match;
    });
    setFilters(next);
    dispatch(fetchFspProviders());
  };

  const all = state?.fspProviders ?? [];
  const providers = all.filter((p) => matchesSearch(p, filters.search || '')
    && (!filters.channel || p.fspType === filters.channel)
    && (!filters.status || hasStatus(p, filters.status))
    && (!filters.bic || (filters.bic === 'set') === !!p.bic));
  const opened = all.find((p) => p.fspCode === openCode);

  const headers = () => [
    'providers.code', 'fsp.name', 'providers.channel', 'providers.bic',
    'providers.bands', 'providers.accounts', 'providers.status', 'emptyLabel',
  ];

  const status = (p) => {
    const issues = fspIssues(p);
    if (!issues.length) return t(p.accounts ? 'providers.status.ready' : 'providers.status.unused');
    return issues.map((i) => (
      <div key={`${i.key}-${i.values?.from || ''}`} className={classes.status}>
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
      return t('providers.notSet');
    };
    return [
      (p) => <span className={classes.mono}>{p.fspCode}</span>,
      (p) => p.name,
      (p) => cell(p, p.fspType && t(`providers.channel.${p.fspType}`), 'fspType'),
      (p) => <span className={classes.mono}>{cell(p, p.bic, 'bic')}</span>,
      (p) => p.bandCount || t('fsp.bands.noneShort'),
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
      <Searcher
        module={MODULE_NAME}
        FilterPane={ProvidersFilter}
        fetch={fetch}
        items={providers}
        itemsPageInfo={{ totalCount: providers.length }}
        fetchingItems={state?.fetchingFspProviders}
        fetchedItems={!state?.fetchingFspProviders}
        errorItems={null}
        tableTitle={tv('providers.searcher.results', { totalCount: providers.length })}
        headers={headers}
        itemFormatters={itemFormatters}
        onDoubleClick={(p) => setOpenCode(p.fspCode)}
        withPagination={false}
        rowIdentifier={(p) => p.fspCode}
        searcherActions={[{
          label: t('charges.import'), onClick: () => setImporting(true), authorized: canManage,
        }]}
        searcherActionsPosition="header-right"
      />

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
