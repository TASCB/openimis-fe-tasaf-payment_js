import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
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
  WS_TAB_CHARGES,
  WS_TAB_REPORTS,
  WS_TAB_MUSE,
  RIGHT_DASHBOARD,
  RIGHT_PAYMENT_ACCOUNT_SEARCH,
  RIGHT_PRE_AUDIT_SEARCH,
  RIGHT_GENERATE_PAYLIST,
  RIGHT_PAYLIST_SEARCH,
  RIGHT_RETURN_FEEDBACK,
  RIGHT_WITHDRAWAL_CHARGE_SEARCH,
  RIGHT_REPORTS,
  RIGHT_MUSE_SETTINGS_SEARCH,
} from '../constants';

const useStyles = makeStyles((theme) => ({
  page: theme.page,
  paper: theme.paper.paper,
  tableTitle: theme.table.title,
  tabs: { display: 'flex', alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto' },
  selectedTab: { borderBottom: '4px solid white', minWidth: 'auto' },
  unselectedTab: { borderBottom: '4px solid transparent', minWidth: 'auto' },
}));

// Tabs in pipeline order, each paired with the right that unlocks it.
const TAB_ORDER = [
  [WS_TAB_DASHBOARD, RIGHT_DASHBOARD],
  [WS_TAB_VERIFICATION, RIGHT_PAYMENT_ACCOUNT_SEARCH],
  [WS_TAB_PRE_AUDIT, RIGHT_PRE_AUDIT_SEARCH],
  [WS_TAB_GENERATE, RIGHT_GENERATE_PAYLIST],
  [WS_TAB_PAYLISTS, RIGHT_PAYLIST_SEARCH],
  [WS_TAB_RETURNS, RIGHT_RETURN_FEEDBACK],
  // Configuration, not a pipeline stage -- last.
  [WS_TAB_CHARGES, RIGHT_WITHDRAWAL_CHARGE_SEARCH],
  [WS_TAB_REPORTS, RIGHT_REPORTS],
  [WS_TAB_MUSE, RIGHT_MUSE_SETTINGS_SEARCH],
];

function TasafPaymentsPage() {
  const classes = useStyles();
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  const rights = useSelector((store) => store.core?.user?.i_user?.rights ?? []);

  const history = useHistory();
  const location = useLocation();

  // The open tab lives in the URL (?tab=paylists), so Back from any drill-in returns to it.
  // Without one, land on the first tab the user is allowed to see.
  const allowed = (tab) => TAB_ORDER.some(([t, right]) => t === tab && rights.includes(right));
  const firstAllowedTab = (TAB_ORDER.find(([, right]) => rights.includes(right))
    || [WS_TAB_DASHBOARD])[0];
  const tabFromUrl = () => {
    const tab = new URLSearchParams(location.search).get('tab');
    return allowed(tab) ? tab : firstAllowedTab;
  };
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  useEffect(() => { setActiveTab(tabFromUrl()); }, [location.search]);

  const isSelected = (tab) => tab === activeTab;
  const tabStyle = (tab) => (isSelected(tab) ? classes.selectedTab : classes.unselectedTab);
  const handleChange = (_, tab) => {
    setActiveTab(tab);
    history.replace({ pathname: location.pathname, search: `?tab=${tab}` });
  };

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
