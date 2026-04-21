import React from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';
import { useHistory } from 'react-router-dom';

import { makeStyles } from '@material-ui/styles';

import {
  Helmet,
  PublishedComponent,
  Searcher,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';

import {
  MODULE_NAME,
  RIGHT_PAYLIST_SEARCH,
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
} from '../constants';
import { fetchPaylists } from '../actions';
import PaylistFilter from '../components/PaylistFilter';
import StatusChip from '../components/StatusChip';
import { defaultPageStyles } from '../utils/styles';

const useStyles = makeStyles((theme) => defaultPageStyles(theme));

const STATUS_COLORS = {
  DRAFT:            '#9e9e9e',
  PENDING_APPROVAL: '#ff9800',
  APPROVED:         '#2196f3',
  SUBMITTED:        '#9c27b0',
  CLOSED:           '#4caf50',
};

function PaylistListPage({
  fetchPaylists,
  fetchingPaylists,
  fetchedPaylists,
  errorPaylists,
  paylists,
  paylistsPageInfo,
  paylistsTotalCount,
}) {
  const classes = useStyles();
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
      <StatusChip
        label={formatMessage(`paylist.status.${row.status}`)}
        color={STATUS_COLORS[row.status]}
      />
    ),
    (row) => row.itemCount ?? '-',
    (row) => (
      <PublishedComponent
        pubRef="core.DatePicker"
        value={row.generatedAt}
        readOnly
      />
    ),
    (row) => row.museBatchReference ?? '-',
  ];

  return (
    <div className={classes.page}>
      <Helmet title={formatMessage('paylistList.page.title')} />
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
    </div>
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
