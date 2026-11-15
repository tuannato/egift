/**
 * Every language at once, for the tests: the page itself fetches one table
 * when it is asked for (`loadLang`), and never imports this file.
 */
import { registerLang } from './index';
import { vi } from './vi';
import { de } from './de';
import { es } from './es';
import { fr } from './fr';
import { id } from './id';
import { ja } from './ja';
import { ko } from './ko';
import { pt } from './pt';
import { ru } from './ru';
import { th } from './th';
import { zhHans } from './zhHans';
import { zhHant } from './zhHant';

registerLang('vi', vi);
registerLang('de', de);
registerLang('es', es);
registerLang('fr', fr);
registerLang('id', id);
registerLang('ja', ja);
registerLang('ko', ko);
registerLang('pt', pt);
registerLang('ru', ru);
registerLang('th', th);
registerLang('zh-Hans', zhHans);
registerLang('zh-Hant', zhHant);
