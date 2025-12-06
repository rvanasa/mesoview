import React, { useEffect, useState } from 'react';
import { fetchProfileAtDate, ForecastModel, Profile } from '../utils/profile';
import Sounding from './Sounding';

interface BufkitSoundingProps {
  model: ForecastModel;
  station: string;
  date: Date;
}

const BufkitSounding: React.FC<BufkitSoundingProps> = ({
  model,
  station,
  date,
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
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(err instanceof Error ? err.message : undefined);
          setHasError(true);
        }
      } finally {
        setLoading(false);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [model, station, date]);

  return (
    <div tw="relative">
      <Sounding profile={profile} />
      <div
        tw="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 pointer-events-none"
        style={{
          opacity: loading ? 1 : 0,
          transition: 'opacity 100ms ease-in-out',
        }}
      >
        <div tw="text-gray-600 font-semibold">
          Loading {model} sounding for {station.toUpperCase()}...
        </div>
      </div>
      <div
        tw="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 pointer-events-none"
        style={{
          opacity: hasError ? 1 : 0,
          transition: 'opacity 100ms ease-in-out',
        }}
      >
        <div tw="text-red-600">
          <div tw="font-semibold mb-2">Error loading sounding</div>
          <div tw="text-sm">{errorMessage}</div>
        </div>
      </div>
    </div>
  );
};

export default BufkitSounding;
