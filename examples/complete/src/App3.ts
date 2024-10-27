import { lib1Export } from '@kitchenshelf/path-import-libs/lib1/lib1';
import validateIsin from 'isin-validator';

export async function handler(event: string) {
  const isInvalid = validateIsin(event);

  return {
    statusCode: lib1Export(!!isInvalid),
    body: JSON.stringify({
      handler: 'App3',
      message: isInvalid ? 'ISIN is invalid!' : 'ISIN is fine!',
      input: event,
    }),
  };
}
