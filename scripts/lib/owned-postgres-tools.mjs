import { accessSync, constants, realpathSync, statSync } from 'node:fs';
import { delimiter, isAbsolute, join } from 'node:path';

const required = ['initdb', 'pg_ctl', 'createdb', 'psql'];
function completeDirectory(directory) {
  try {
    if (!isAbsolute(directory)) return null;
    const canonical = realpathSync(directory);
    for (const name of required) {
      const file = join(canonical, name);
      if (!statSync(file).isFile()) return null;
      accessSync(file, constants.X_OK);
    }
    return canonical;
  } catch { return null; }
}

/** Local executable discovery only; never reads credentials or opens a connection.
 * Explicit argument > PG_BIN > PATH. An invalid explicit selection never falls back.
 * Both owned-cluster harnesses use fresh HOME/PGPASSFILE and fixed loopback targets.
 */
export function ownedPostgresTools({ argument, environment = process.env } = {}) {
  const explicit = argument ?? environment.PG_BIN;
  if (explicit !== undefined) {
    const selected = completeDirectory(explicit);
    if (!selected) throw new Error('Incomplete local PostgreSQL tool directory');
    return selected;
  }
  for (const directory of (environment.PATH ?? '').split(delimiter).filter(Boolean)) {
    const selected = completeDirectory(directory);
    if (selected) return selected;
  }
  throw new Error('Local PostgreSQL tools unavailable; supply a complete PG_BIN directory');
}
