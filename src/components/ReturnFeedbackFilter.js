import React from 'react';
import { Grid, withStyles, withTheme } from '@material-ui/core';
import { injectIntl } from 'react-intl';

import { SelectInput, useModulesManager, useTranslations } from '@openimis/fe-core';

import { MODULE_NAME, RETURN_FEEDBACK_TYPE } from '../constants';
import { defaultFilterStyles } from '../utils/styles';

function ReturnFeedbackFilter({ classes, filters, onChangeFilters }) {
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
    <Grid container className={classes.form} alignItems="center">
      <Grid item xs={12} sm={6} md={4} className={classes.item}>
        <SelectInput
          module={MODULE_NAME}
          label="filter.feedbackType"
          options={feedbackTypeOptions}
          value={filterValue('feedbackType')}
          onChange={(val) => onChangeFilters([
            { id: 'feedbackType', value: val, filter: val ? `feedbackType: ${val}` : '' },
          ])}
        />
      </Grid>
    </Grid>
  );
}

export default injectIntl(withTheme(withStyles(defaultFilterStyles)(ReturnFeedbackFilter)));
