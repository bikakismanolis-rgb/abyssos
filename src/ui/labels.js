// ---------- chapter labels ----------
// What used to be "NG+3" is now a chapter: a Roman numeral and a name.
import {t} from '../i18n/index.js';
import {CHAPTERS,LAST_TIER,ROMAN,placeAt} from '../game/places.js';

export function chapterName(tier){return tier<=LAST_TIER?t('ch.'+CHAPTERS[tier].key+'.name'):t('ch.endless.name');}
export function chapterShort(tier){return tier<=LAST_TIER?ROMAN[tier]:'∞'+(tier-LAST_TIER);}
export function tierLabel(tier){return chapterShort(tier)+' · '+chapterName(tier);}
export function placeName(tier,slot){const p=placeAt(tier,slot);return p.id?t('pl.'+p.id+'.name'):t('pl.echo');}
