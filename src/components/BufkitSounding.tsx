import React, { useEffect, useState } from 'react';
import tw from 'twin.macro';
import { css } from '@emotion/react';
import Sounding from './Sounding';
import { fetchProfileAtDate, ForecastModel, Profile } from '../utils/profile';

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
  const [error, setError] = useState<string>();

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError(undefined);
        const profile = await fetchProfileAtDate(model, station, date);
        if (profile && isMounted) {
          setProfile(profile);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : 'Failed to load sounding data',
          );
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [model, station, date]);

  if (loading && !profile) {
    return (
      <div tw="flex items-center justify-center p-8">
        <div
          css={[
            tw`text-gray-600`,
            css`
              animation: fadeIn 500ms ease-in;
              @keyframes fadeIn {
                from {
                  opacity: 0;
                }
                to {
                  opacity: 1;
                }
              }
            `,
          ]}
        >
          Loading {model} sounding for {station.toUpperCase()}...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div tw="flex items-center justify-center p-8">
        <div tw="text-red-600">
          <div tw="font-semibold mb-2">Error loading sounding</div>
          <div tw="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div tw="flex items-center justify-center p-8">
        <div tw="text-gray-600">No sounding data available</div>
      </div>
    );
  }

  return (
    <div tw="w-full relative">
      <Sounding profile={profile} />
      {loading && (
        <div tw="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
          <div
            css={[
              tw`text-gray-600 font-semibold`,
              css`
                animation: fadeIn 300ms ease-in;
                @keyframes fadeIn {
                  from {
                    opacity: 0;
                  }
                  to {
                    opacity: 1;
                  }
                }
              `,
            ]}
          >
            Loading {model} sounding for {station.toUpperCase()}...
          </div>
        </div>
      )}
    </div>
  );
};

export default BufkitSounding;
