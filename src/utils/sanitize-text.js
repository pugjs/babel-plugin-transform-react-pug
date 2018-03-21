// @flow

import he from 'he';

export default function(input: string): string {
  return he.decode(input);
}
