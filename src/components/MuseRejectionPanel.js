import React, { useEffect, useState } from 'react';
import {
  Button, Link, Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { Table } from '@openimis/fe-core';

import { MODULE_NAME } from '../constants';

const useStyles = makeStyles((theme) => ({
  root: { padding: theme.spacing(1, 2, 2) },
  heading: { fontWeight: 500, marginBottom: theme.spacing(0.5) },
  summary: { color: theme.palette.grey[700], marginBottom: theme.spacing(1) },
  bar: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing(1) },
  older: { color: theme.palette.grey[600], fontSize: 13, marginTop: theme.spacing(1) },
  note: { color: theme.palette.grey[600], display: 'block', fontSize: 12 },
  account: { fontFamily: 'monospace' },
  actionCell: { whiteSpace: 'nowrap', textAlign: 'right' },
}));

const ACTIONS = ['WITHDRAWN', 'KEPT', 'NEEDS_REVIEW', 'MOVED'];
const PAGE_SIZE = 50;

export default function MuseRejectionPanel({
  t, tv, rejections, hold, onOpenAccount, isRejected, canMove, moving, onMove, onOpenCaseManagement,
}) {
  const classes = useStyles();
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const latest = rejections?.length ? rejections[rejections.length - 1] : null;
  useEffect(() => { setOpen(false); setPage(0); }, [latest?.msg_id, latest?.at]);
  if (!latest) return null;

  const older = rejections.slice(0, -1).reverse();
  const payees = latest.payees || [];
  const moved = (latest.withdrawn || 0) + (latest.moved || 0);
  const review = payees.filter((row) => row.action === 'NEEDS_REVIEW');
  const action = (row) => (ACTIONS.includes(row.action) ? t(`museRejection.action.${row.action}`) : row.action);
  const caseLink = !!moved && !!onOpenCaseManagement && (
    <Link component="button" variant="body2" onClick={onOpenCaseManagement}>
      {t('museRejection.openCaseManagement')}
    </Link>
  );

  const olderLines = older.map((r) => (
    <Typography key={r.msg_id || r.at} variant="body2" className={classes.older}>
      {tv('museRejection.older', {
        attempt: r.attempt, withdrawn: (r.withdrawn || 0) + (r.moved || 0), kept: r.kept, review: r.needs_review,
      })}
    </Typography>
  ));
  const holdLines = (
    <>
      {!!hold?.deadline && hold.awaiting > 0 && (
        <Typography variant="body2" className={classes.summary}>
          {tv('museRejection.hold', { count: hold.awaiting, deadline: hold.deadline })}
        </Typography>
      )}
      {!!hold?.lapsed && (
        <Typography variant="body2" className={classes.summary}>
          {tv('museRejection.lapsed', { count: hold.lapsed, deadline: hold.deadline })}
        </Typography>
      )}
    </>
  );

  if (!isRejected) {
    return (
      <div className={classes.root}>
        <Typography variant="body2" className={`${classes.summary} ${classes.bar}`}>
          {tv('museRejection.done', { attempt: latest.attempt, moved })}
          {caseLink}
        </Typography>
        {holdLines}
        {olderLines}
      </div>
    );
  }

  return (
    <div className={classes.root}>
      <Typography variant="subtitle1" className={classes.heading}>
        {tv('museRejection.title', { attempt: latest.attempt })}
      </Typography>
      <div className={classes.bar}>
        <Typography variant="body2" className={classes.summary}>
          {tv('museRejection.summary', { withdrawn: moved, kept: latest.kept, review: latest.needs_review })}
        </Typography>
        {caseLink}
      </div>
      <div className={classes.bar}>
        {!!payees.length && (
          <Button size="small" color="primary" onClick={() => setOpen(!open)}>
            {open ? t('museRejection.hideList') : tv('museRejection.showList', { count: payees.length })}
          </Button>
        )}
        {canMove && review.length > 0 && (
          <Button size="small" color="primary" disabled={moving} onClick={() => onMove(null)}>
            {tv('museRejection.moveAll', { count: review.length })}
          </Button>
        )}
      </div>
      {open && (
        <>
          <Table
            size="small"
            module={MODULE_NAME}
            headers={['museRejection.account', 'museRejection.reason', 'museRejection.outcome', '']}
            itemFormatters={[
              (row) => <span className={classes.account}>{row.account}</span>,
              (row) => row.reason,
              (row) => (
                <>
                  {action(row)}
                  {!!row.note && <span className={classes.note}>{row.note}</span>}
                </>
              ),
              (row) => (
                <div className={classes.actionCell}>
                  {['WITHDRAWN', 'MOVED'].includes(row.action) && !!row.account_uuid && (
                    <Button size="small" color="primary" onClick={() => onOpenAccount(row.account_uuid)}>
                      {t('museRejection.correct')}
                    </Button>
                  )}
                  {row.action === 'NEEDS_REVIEW' && canMove && (
                    <Button size="small" color="primary" disabled={moving} onClick={() => onMove([row.account])}>
                      {t('museRejection.move')}
                    </Button>
                  )}
                </div>
              ),
            ]}
            items={payees.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)}
            itemIdentifier={(row) => `${row.account}-${row.item || ''}`}
            withPagination={payees.length > PAGE_SIZE}
            count={payees.length}
            page={page}
            pageSize={PAGE_SIZE}
            rowsPerPageOptions={[PAGE_SIZE]}
            onChangePage={(e, p) => setPage(p)}
          />
        </>
      )}
      {holdLines}
      {!!latest.unparsed && (
        <Typography variant="body2" className={classes.note}>
          {tv('museRejection.unparsed', { text: latest.unparsed })}
        </Typography>
      )}
      {olderLines}
    </div>
  );
}
