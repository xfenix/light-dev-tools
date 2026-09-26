import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the menu and the landing text', () => {
  render(<App />);
  expect(screen.getByText(/Light dev tools/i)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Base 64' })).toBeInTheDocument();
  expect(screen.getByText(/Use them for the greater good/i)).toBeInTheDocument();
});
