import { lib1Export } from '@kitchenshelf/path-import-libs/lib1/lib1';
import validateIsin from 'isin-validator';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export async function handler(event: string) {
  const isInvalid = validateIsin(event);
  const imagePath = path.join(__dirname, '../my-image.jpeg');
  const imageBuffer = readFileSync(imagePath);

  const { info } = await sharp(imageBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    statusCode: lib1Export(!!isInvalid),
    body: JSON.stringify({
      handler: 'App3',
      message: isInvalid ? 'ISIN is invalid!' : 'ISIN is fine!',
      input: event,
      info,
    }),
  };
}
