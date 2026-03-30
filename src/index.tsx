import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  createBrowserRouter,
  RouterProvider,
  useRouteError,
} from 'react-router-dom';
import App from './components/App';
import { FavoritesProvider } from './contexts/FavoritesContext';

import 'rc-slider/assets/index.css';
import 'twin.macro';
import './styles/index.scss';

function ErrorBoundary() {
  const error = useRouteError();
  console.error(error);
  return <div>Unexpected error!</div>;
}

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      errorElement: <ErrorBoundary />,
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
);

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <FavoritesProvider>
      <RouterProvider router={router} />
    </FavoritesProvider>
  </React.StrictMode>,
);
