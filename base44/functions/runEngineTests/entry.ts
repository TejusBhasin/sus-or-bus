// Developer diagnostic: runs the bundled engine self-test suite and the
// knowledge-base validation. Read-only, no network, no entity access, no
// user data — it only exercises the scanner's own rules against bundled
// fixtures. Invoke it from the dashboard function tester or an admin tool.

import { runEngineTests } from '../../shared/engineTests.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const report = runEngineTests();
    return Response.json(report, { status: report.failed === 0 ? 200 : 500 });
  } catch (error) {
    return Response.json({ error: error?.message || 'Test run failed' }, { status: 500 });
  }
}