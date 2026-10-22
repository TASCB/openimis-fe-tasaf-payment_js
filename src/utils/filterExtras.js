import React, { createContext, useContext } from 'react';

const FilterExtras = createContext({});

export const FilterExtrasProvider = FilterExtras.Provider;

export function withFilterExtras(Component) {
  return function FilterPane(props) {
    const extras = useContext(FilterExtras);
    return <Component {...props} {...extras} />;
  };
}
