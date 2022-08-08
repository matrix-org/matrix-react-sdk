import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  children: PropTypes.node,
};

const defaultProps = {
  children: undefined,
};

const Wrapper = Object.assign(({ children }) => children, { propTypes, defaultProps });

export default function wrap(element) {
  return <Wrapper>{element}</Wrapper>;
}
