import React from 'react';
import { Grid } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import { Contributions, useModulesManager } from '@openimis/fe-core';

import { TASAF_PAYMENT_TABS_LABEL_CONTRIBUTION_KEY } from '../constants';

const useStyles = makeStyles((theme) => ({
  tabsItem: {
    padding: theme.spacing(2, 1, 0),
  },
  tableTitle: theme.table.title,
  tabs: {
    display: 'flex',
    alignItems: 'center',
  },
  selectedTab: {
    borderBottom: '4px solid white',
  },
  unselectedTab: {
    borderBottom: '4px solid transparent',
  },
}));

function VerificationTabs({ tabs }) {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  return (
    <Grid item xs={12} className={classes.tabsItem}>
      <Grid container className={`${classes.tableTitle} ${classes.tabs}`}>
        <Contributions
          contributionKey={TASAF_PAYMENT_TABS_LABEL_CONTRIBUTION_KEY}
          value={tabs.activeTab}
          onChange={tabs.onChange}
          isSelected={(tab) => tab === tabs.activeTab}
          tabStyle={(tab) => (tab === tabs.activeTab ? classes.selectedTab : classes.unselectedTab)}
          modulesManager={modulesManager}
          passedCount={tabs.passedCount}
          failedCount={tabs.failedCount}
          manualCount={tabs.manualCount}
          pendingCount={tabs.pendingCount}
          gepgCount={tabs.gepgCount}
        />
      </Grid>
    </Grid>
  );
}

export default VerificationTabs;
