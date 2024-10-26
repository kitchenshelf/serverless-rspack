declare const __SIGNER_SECRET__: string;

import validateIsin from 'isin-validator';

export async function handler(event: string) {
  const isInvalid = validateIsin(event);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: isInvalid ? 'ISIN is invalid!' : 'ISIN is fine!',
      input: event,
      signer: __SIGNER_SECRET__,
    }),
  };
}
