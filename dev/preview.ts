/**
 * Dev-only stage preview. Never part of a production build (Vite builds only
 * `index.html`).
 *
 *   /dev/preview.html?id=lixi&t=1200      one stage frozen at 1200 ms
 *   /dev/preview.html?id=lixi&t=end       fully open
 *   /dev/preview.html?id=lixi&sheet=8     contact sheet of 8 stills, closed to open
 *   /dev/preview.html?id=lixi&play=1      live: idle loops, click to open
 */
import { mountStage, openLength, wrapperProblems, type WrapperDef } from '../src/stage';

const q = new URLSearchParams(location.search);
const id = q.get('id') ?? 'lixi';
const root = document.getElementById('root')!;

function fail(message: string): void {
    const pre = document.createElement('pre');
    pre.className = 'err';
    pre.textContent = message;
    root.replaceChildren(pre);
}

function still(def: WrapperDef, ms: number, className: string, caption?: string): HTMLElement {
    const cell = document.createElement('div');
    cell.className = className;
    const host = document.createElement('div');
    cell.append(host);
    const stage = mountStage(host, def, { assetBase: `/wrappers/${def.id}/`, reducedMotion: false });
    stage.seek(ms);
    if (caption !== undefined) {
        const cap = document.createElement('div');
        cap.className = 'cap';
        cap.textContent = caption;
        cell.append(cap);
    }
    return cell;
}

async function main(): Promise<void> {
    if (!/^[a-z0-9-]{1,24}$/.test(id)) return fail('bad id');
    const mod = (await import(/* @vite-ignore */ `../src/wrappers/${id}.ts`)) as Record<string, unknown>;
    const def = (mod.default ?? Object.values(mod)[0]) as WrapperDef;
    const problems = wrapperProblems(def);
    if (problems.length > 0) return fail(problems.join('\n'));
    const end = openLength(def);

    if (q.has('sheet')) {
        const n = Math.max(2, Math.min(16, Number(q.get('sheet')) || 8));
        const grid = document.createElement('div');
        grid.className = 'sheet';
        for (let i = 0; i < n; i++) {
            const ms = Math.round((end * i) / (n - 1));
            grid.append(still(def, i === n - 1 ? Infinity : ms, 'cell', `${ms} ms${ms >= def.revealAt ? ' · revealed' : ''}`));
        }
        root.replaceChildren(grid);
        return;
    }

    if (q.has('play')) {
        const cell = document.createElement('div');
        cell.className = 'one';
        const host = document.createElement('div');
        cell.append(host);
        root.replaceChildren(cell);
        const stage = mountStage(host, def, { assetBase: `/wrappers/${def.id}/`, reducedMotion: false });
        cell.addEventListener('click', () => {
            if (stage.state === 'open') stage.seek(0);
            else void stage.open();
        });
        return;
    }

    const t = q.get('t');
    const ms = t === 'end' ? Infinity : Number(t ?? 0) || 0;
    root.replaceChildren(still(def, ms, 'one'));
}

main().catch(e => fail(String(e instanceof Error ? e.stack ?? e.message : e)));
