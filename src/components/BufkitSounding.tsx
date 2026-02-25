import React, { useEffect, useState } from 'react';
import { fetchProfileAtDate, ForecastModel, Profile } from '../utils/profile';
import Sounding from './Sounding';

interface BufkitSoundingProps {
  model: ForecastModel;
  station: string;
  date: Date;
  detailed?: boolean;
  darkMode?: boolean;
}

const BufkitSounding: React.FC<BufkitSoundingProps> = ({
  model,
  station,
  date,
  detailed,
  darkMode,
}) => {
  const [profile, setProfile] = useState<Profile>();
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        setLoading(true);
        const profile = await fetchProfileAtDate(model, station, date);
        if (profile && isMounted) {
          setProfile(profile);
          setHasError(false);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : undefined);
          setHasError(true);
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [model, station, date]);

  return (
    <div tw="relative">
      {!!profile && (
        <Sounding profile={profile} detailed={detailed} darkMode={darkMode} />
      )}
      <div
        tw="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          backgroundColor: darkMode
            ? 'rgba(31, 41, 55, 0.75)'
            : 'rgba(255, 255, 255, 0.75)',
          opacity: loading ? 1 : 0,
          transition: 'opacity 100ms ease-in-out',
        }}
      >
        {/* <div tw="text-gray-600 font-semibold">
          Loading {model} sounding for {station.toUpperCase()}...
        </div> */}
      </div>
      <div
        tw="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{
          backgroundColor: darkMode
            ? 'rgba(31, 41, 55, 0.75)'
            : 'rgba(255, 255, 255, 0.75)',
          opacity: hasError ? 1 : 0,
          transition: 'opacity 100ms ease-in-out',
        }}
      >
        <div tw="text-red-600 dark:text-red-400">
          <div tw="font-semibold mb-2">Error loading sounding</div>
          <div tw="text-sm">{errorMessage}</div>
        </div>
      </div>
    </div>
  );
};

export default BufkitSounding;
