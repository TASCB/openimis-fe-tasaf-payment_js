import React from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';

import { Grid, Chip } from '@material-ui/core';

import {
  Searcher,
  SelectInput,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';

import {
  MODULE_NAME,
  RIGHT_RETURN_FEEDBACK,
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
  RETURN_FEEDBACK_TYPE,
} from '../constants';
import { fetchReturnFeedback } from '../actions';

const FEEDBACK_COLORS = {
  UNAPPLIED: '#ff9800',
  RETURNED:  '#f44336',
  PARTIAL:   '#9c27b0',
};

function ReturnFeedbackFilter({ filters, onChangeFilters }) {
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  const filterValue = (key) => filters?.[key]?.value ?? null;

  const feedbackTypeOptions = [
    { value: null, label: formatMessage('tooltip.any') },
    ...Object.values(RETURN_FEEDBACK_TYPE).map((t) => ({
      value: t,
      label: formatMessage(`returnFeedback.type.${t}`),
    })),
  ];

  return (
    <Grid container spacing={2} alignItems="center">
      <Grid item xs={4}>
        <SelectInput
          module={MODULE_NAME}
          label="filter.feedbackType"
          options={feedbackTypeOptions}
          value={filterValue('feedbackType')}
          onChange={(val) => onChangeFilters([
            { id: 'feedbackType', value: val, filter: val ? `feedbackType: "${val}"` : '' },
          ])}
        />
      </Grid>
    </Grid>
  );
}

function ReturnFeedbackPage({
  fetchReturnFeedback,
  fetchingReturnFeedback,
  fetchedReturnFeedback,
  errorReturnFeedback,
  returnFeedback,
  returnFeedbackPageInfo,
  returnFeedbackTotalCount,
}) {
  const modulesManager = useModulesManager();
  const { formatMessage, formatMessageWithValues } = useTranslations(MODULE_NAME, modulesManager);
  const rights = useSelector((store) => store.core?.user?.i_user?.rights ?? []);

  if (!rights.includes(RIGHT_RETURN_FEEDBACK)) return null;

  const headers = () => [
    formatMessage('returnFeedback.feedbackType'),
    formatMessage('returnFeedback.reasonCode'),
    formatMessage('returnFeedback.reasonDescription'),
    formatMessage('returnFeedback.receivedAt'),
    formatMessage('returnFeedback.paylistItem'),
  ];

  const itemFormatters = () => [
    (row) => (
      <Chip
        label={formatMessage(`returnFeedback.type.${row.feedbackType}`)}
        size="small"
        style={{ backgroundColor: FEEDBACK_COLORS[row.feedbackType] || '#9e9e9e', color: '#fff', fontWeight: 500 }}
      />
    ),
    (row) => row.reasonCode ?? '-',
    (row) => row.reasonDescription ?? '-',
    (row) => row.receivedAt ? new Date(row.receivedAt).toLocaleString() : '-',
    (row) => row.paylistItem?.uuid ?? '-',
  ];

  return (
    <Searcher
      module={MODULE_NAME}
      FilterPane={ReturnFeedbackFilter}
      fetch={fetchReturnFeedback}
      items={returnFeedback}
      itemsPageInfo={returnFeedbackPageInfo}
      fetchingItems={fetchingReturnFeedback}
      fetchedItems={fetchedReturnFeedback}
      errorItems={errorReturnFeedback}
      tableTitle={formatMessageWithValues('returnFeedback.searcher.results', { totalCount: returnFeedbackTotalCount })}
      headers={headers}
      itemFormatters={itemFormatters}
      rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
      defaultPageSize={DEFAULT_PAGE_SIZE}
      rowIdentifier={(row) => row.id}
    />
  );
}

const mapStateToProps = (state) => ({
  fetchingReturnFeedback: state.tasafPayment.fetchingReturnFeedback,
  fetchedReturnFeedback: state.tasafPayment.fetchedReturnFeedback,
  errorReturnFeedback: state.tasafPayment.errorReturnFeedback,
  returnFeedback: state.tasafPayment.returnFeedback,
  returnFeedbackPageInfo: state.tasafPayment.returnFeedbackPageInfo,
  returnFeedbackTotalCount: state.tasafPayment.returnFeedbackTotalCount,
});

const mapDispatchToProps = (dispatch) => bindActionCreators({ fetchReturnFeedback }, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(ReturnFeedbackPage);
