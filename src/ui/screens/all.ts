/**
 * The screens that make, fund, open and sweep a gift, and everything they
 * stand on (the signing library, the chain client). The shop does not need
 * them: the page loads this as its own piece (`src/main.ts`).
 */
export { mountCreate } from './create';
import type { Ctx } from '../ctx';
import type { Dispose } from '../dom';
import { getBatch } from '../session';
import { mountCreated as mountCreatedOne } from './created';
import { mountCreatedBatch } from './createdBatch';

/** The screen after Create: several gifts made by one press have their own, one gift has the one it always had. */
export function mountCreated(root: HTMLElement, ctx: Ctx): Dispose {
    return getBatch() ? mountCreatedBatch(root, ctx) : mountCreatedOne(root, ctx);
}
export { mountPackage } from './package';
