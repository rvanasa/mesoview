import { Suspense } from 'react';
import App from './components/App';
import PageLoading from './components/PageLoading';

export default function Page() {
  return (
    <Suspense fallback={<PageLoading />}>
      <App></App>
    </Suspense>
  );
}
