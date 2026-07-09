import { useAsync } from 'react-use';
import { GetDataResourceMessage } from '@uniformdev/mesh-sdk-react';
import { LocalesResponse } from '../types/contentfulTypes';

export const useGetContentfulLocales = (
  getDataResource: <TExpectedResult>(message: GetDataResourceMessage) => Promise<TExpectedResult>
) => {
  return useAsync(async () => {
    const response = await getDataResource<LocalesResponse>({
      method: 'GET',
      path: `/locales`,
    });
    return response.items ?? [];
  });
};
