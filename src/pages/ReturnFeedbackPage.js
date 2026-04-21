import React from 'react';
import { connect, useSelector } from 'react-redux';
import { bindActionCreators } from 'redux';

import { makeStyles } from '@material-ui/styles';

import {
  formatDateTimeFromISO,
  Helmet,
  Searcher,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';

import {
  MODULE_NAME,
  RIGHT_RETURN_FEEDBACK,
  DEFAULT_PAGE_SIZE,
  ROWS_PER_PAGE_OPTIONS,
} from '../constants';
import { fetchReturnFeedback } from '../actions';
import ReturnFeedbackFilter from '../components/ReturnFeedbackFilter';
import StatusChip from '../components/StatusChip';
import { defaultPageStyles } from '../utils/styles';

const useStyles = makeStyles((theme) => defaultPageStyles(theme));
const FEEDBACK_COLORS = {
  UNAPPLIED: '#ff9800',
  RETURNED:  '#f44336',
  PARTIAL:   '#9c27b0',
};

function ReturnFeedbackPage({
  fetchReturnFeedback,
  fetchingReturnFeedback,
  fetchedReturnFeedback,
  errorReturnFeedback,
  returnFeedback,
  returnFeedbackPageInfo,
  returnFeedbackTotalCount,
}) {
  const classes = useStyles();
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
      <StatusChip
        label={formatMessage(`returnFeedback.type.${row.feedbackType}`)}
        color={FEEDBACK_COLORS[row.feedbackType]}
      />
    ),
    (row) => row.reasonCode ?? '-',
    (row) => row.reasonDescription ?? '-',
    (row) => formatDateTimeFromISO(modulesManager, null, row.receivedAt) || '-',
    (row) => row.paylistItem?.uuid ?? '-',
  ];

  return (
    <div className={classes.page}>
      <Helmet title={formatMessage('returnFeedback.page.title')} />
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
    </div>
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
