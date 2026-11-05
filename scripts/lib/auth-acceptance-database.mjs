/** Local test fixture boundary. Never accepts a remote/default/unknown database. */
export async function assertOwnedAcceptanceDatabase({ databaseUrl, marker, expectedPort, query }) {
  const deny = () => { throw new Error('Refusing unverified disposable authentication database'); };
  if (typeof marker !== 'string' || !marker.trim()) deny();
  if (typeof expectedPort !== 'string' || !/^\d+$/.test(expectedPort)) deny();
  const port = Number(expectedPort);
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || port === 5432) deny();
  let target;
  try { target = new URL(databaseUrl); } catch { deny(); }
  if (!['postgresql:', 'postgres:'].includes(target.protocol) || target.hostname !== '127.0.0.1'
    || target.port !== String(port) || target.pathname !== '/dg_checkout_test'
    || target.username !== 'checkout_test') deny();
  let rows;
  try { rows = await query(); } catch { deny(); }
  if (!Array.isArray(rows) || rows.length !== 1) deny();
  const row = rows[0];
  if (row.database !== 'dg_checkout_test' || row.host !== '127.0.0.1'
    || Number(row.port) !== port || row.role !== 'checkout_test' || row.marker !== marker) deny();
}
