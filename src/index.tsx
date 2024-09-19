import { createRoot } from 'react-dom/client';
import App from './components/App';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './styles/index.scss';
import React from 'react';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
]);

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
