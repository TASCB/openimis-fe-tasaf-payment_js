import React, { useState } from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { useHistory } from 'react-router-dom';

import { Grid } from '@material-ui/core';
import { Chip } from '@material-ui/core';

import {
  Searcher,
  SelectInput,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';

import {
  MODULE_NAME,
  RIGHT_PAYLIST_SEARCH,
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
  BATCH_TYPE_LIST,
  PAYLIST_STATUS,
} from '../constants';
import { fetchPaylists } from '../actions';

const STATUS_COLORS = {
  DRAFT:            '#9e9e9e',
  PENDING_APPROVAL: '#ff9800',
  APPROVED:         '#2196f3',
  SUBMITTED:        '#9c27b0',
  CLOSED:           '#4caf50',
};

function PaylistFilter({ filters, onChangeFilters }) {
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  const filterValue = (key) => filters?.[key]?.value ?? null;

  const batchTypeOptions = [
    { value: null, label: formatMessage('tooltip.any') },
    ...BATCH_TYPE_LIST.map((t) => ({ value: t, label: formatMessage(`paylist.batchType.${t}`) })),
  ];

  const statusOptions = [
    { value: null, label: formatMessage('tooltip.any') },
    ...Object.values(PAYLIST_STATUS).map((s) => ({ value: s, label: formatMessage(`paylist.status.${s}`) })),
  ];

  return (
    <Grid container spacing={2} alignItems="center">
      <Grid item xs={3}>
        <SelectInput
          module={MODULE_NAME}
          label="filter.batchType"
          options={batchTypeOptions}
          value={filterValue('batchType')}
          onChange={(val) => onChangeFilters([
            { id: 'batchType', value: val, filter: val ? `batchType: "${val}"` : '' },
          ])}
        />
      </Grid>
      <Grid item xs={3}>
        <SelectInput
          module={MODULE_NAME}
          label="filter.paylistStatus"
          options={statusOptions}
          value={filterValue('status')}
          onChange={(val) => onChangeFilters([
            { id: 'status', value: val, filter: val ? `status: "${val}"` : '' },
          ])}
        />
      </Grid>
    </Grid>
  );
}

function PaylistListPage({
  fetchPaylists,
  fetchingPaylists,
  fetchedPaylists,
  errorPaylists,
  paylists,
  paylistsPageInfo,
  paylistsTotalCount,
}) {
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const rights = useSelector((store) => store.core?.user?.i_user?.rights ?? []);
  const history = useHistory();

  if (!rights.includes(RIGHT_PAYLIST_SEARCH)) return null;

  const headers = () => [
    formatMessage('paylist.batchType'),
    formatMessage('paylist.status'),
    formatMessage('paylist.itemCount'),
    formatMessage('paylist.generatedAt'),
    formatMessage('paylist.museBatchReference'),
  ];

  const itemFormatters = () => [
    (row) => formatMessage(`paylist.batchType.${row.batchType}`),
    (row) => (
      <Chip
        label={formatMessage(`paylist.status.${row.status}`)}
        size="small"
        style={{ backgroundColor: STATUS_COLORS[row.status] || '#9e9e9e', color: '#fff', fontWeight: 500 }}
      />
    ),
    (row) => row.itemCount ?? '-',
    (row) => row.generatedAt ? new Date(row.generatedAt).toLocaleDateString() : '-',
    (row) => row.museBatchReference ?? '-',
  ];

  return (
    <Searcher
      module={MODULE_NAME}
      FilterPane={PaylistFilter}
      fetch={fetchPaylists}
      items={paylists}
      itemsPageInfo={paylistsPageInfo}
      fetchingItems={fetchingPaylists}
      fetchedItems={fetchedPaylists}
      errorItems={errorPaylists}
      tableTitle={formatMessageWithValues('paylist.searcher.results', { totalCount: paylistsTotalCount })}
      headers={headers}
      itemFormatters={itemFormatters}
      rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
      defaultPageSize={DEFAULT_PAGE_SIZE}
      rowIdentifier={(row) => row.id}
      onDoubleClick={(row) => history.push(`/tasafPayment/paylist/${row.uuid}`)}
    />
  );
}

const mapStateToProps = (state) => ({
  fetchingPaylists: state.tasafPayment.fetchingPaylists,
  fetchedPaylists: state.tasafPayment.fetchedPaylists,
  errorPaylists: state.tasafPayment.errorPaylists,
  paylists: state.tasafPayment.paylists,
  paylistsPageInfo: state.tasafPayment.paylistsPageInfo,
  paylistsTotalCount: state.tasafPayment.paylistsTotalCount,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ fetchPaylists }, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(PaylistListPage);
