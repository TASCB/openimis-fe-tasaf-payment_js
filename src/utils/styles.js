export const defaultPageStyles = (theme) => ({
  page: {
    ...theme.page,
    // Equal-width searcher columns;
    // No overflow/ellipsis - long values wrap rather than being clipped.
    '& table': { tableLayout: 'fixed' },
    '& table th': { whiteSpace: 'nowrap' },
  },
});

export const defaultFilterStyles = (theme) => ({
  form: {
    padding: 0,
  },
  item: {
    padding: theme.spacing(1),
  },
});
