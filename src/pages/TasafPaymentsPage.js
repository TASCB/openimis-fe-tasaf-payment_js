/**
 * Consolidated "TASAF Payments" workspace.
 *
 * Single menu entry → one workspace with a canonical openIMIS tab bar
 * (mirrors payroll/PayrollTab: theme.paper.paper + theme.table.title band,
 * teal selected tab from the core MuiTab theme). Each standing surface is a
 * Contributions-registered tab so the workspace stays extensible.
 */
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Paper, Grid } from '@material-ui/core';
import { makeStyles } from '@material-ui/styles';
import {
  Helmet,
  Contributions,
  useModulesManager,
  useTranslations,
} from '@openimis/fe-core';

import {
  MODULE_NAME,
  TASAF_WORKSPACE_TABS_LABEL_CONTRIBUTION_KEY,
  TASAF_WORKSPACE_TABS_PANEL_CONTRIBUTION_KEY,
  WS_TAB_DASHBOARD,
  WS_TAB_VERIFICATION,
  WS_TAB_PRE_AUDIT,
  WS_TAB_GENERATE,
  WS_TAB_PAYLISTS,
  WS_TAB_RETURNS,
  RIGHT_DASHBOARD,
  RIGHT_PAYMENT_ACCOUNT_SEARCH,
  RIGHT_RUN_PRE_AUDIT,
  RIGHT_GENERATE_PAYLIST,
  RIGHT_PAYLIST_SEARCH,
  RIGHT_RETURN_FEEDBACK,
} from '../constants';

const useStyles = makeStyles((theme) => ({
  page: theme.page,
  paper: theme.paper.paper,
  tableTitle: theme.table.title,
  tabs: { display: 'flex', alignItems: 'center' },
  selectedTab: { borderBottom: '4px solid white' },
  unselectedTab: { borderBottom: '4px solid transparent' },
}));

// Tabs in pipeline order, each paired with the right that unlocks it.
const TAB_ORDER = [
  [WS_TAB_DASHBOARD, RIGHT_DASHBOARD],
  [WS_TAB_VERIFICATION, RIGHT_PAYMENT_ACCOUNT_SEARCH],
  [WS_TAB_PRE_AUDIT, RIGHT_RUN_PRE_AUDIT],
  [WS_TAB_GENERATE, RIGHT_GENERATE_PAYLIST],
  [WS_TAB_PAYLISTS, RIGHT_PAYLIST_SEARCH],
  [WS_TAB_RETURNS, RIGHT_RETURN_FEEDBACK],
];

function TasafPaymentsPage() {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  const rights = useSelector((store) => store.core?.user?.i_user?.rights ?? []);

  // Land on the first tab the user is actually allowed to see.
  const firstAllowedTab = (TAB_ORDER.find(([, right]) => rights.includes(right))
    || [WS_TAB_DASHBOARD])[0];
  const [activeTab, setActiveTab] = useState(firstAllowedTab);

  const isSelected = (tab) => tab === activeTab;
  const tabStyle = (tab) => (isSelected(tab) ? classes.selectedTab : classes.unselectedTab);
  const handleChange = (_, tab) => setActiveTab(tab);

  return (
    <div className={classes.page}>
      <Helmet title={formatMessage('workspace.page.title')} />
      <Paper className={classes.paper}>
        <Grid container className={`${classes.tableTitle} ${classes.tabs}`}>
          <Contributions
            contributionKey={TASAF_WORKSPACE_TABS_LABEL_CONTRIBUTION_KEY}
            rights={rights}
            value={activeTab}
            onChange={handleChange}
            isSelected={isSelected}
            tabStyle={tabStyle}
          />
        </Grid>
        <Contributions
          contributionKey={TASAF_WORKSPACE_TABS_PANEL_CONTRIBUTION_KEY}
          rights={rights}
          value={activeTab}
        />
      </Paper>
    </div>
  );
}

export default TasafPaymentsPage;
