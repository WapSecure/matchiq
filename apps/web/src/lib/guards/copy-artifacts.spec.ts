import { AUDIT_COPY } from '@/constants/audit';
import { APPROVAL_COPY, POLICY_COPY } from '@/constants/approval';
import {
  GALLERY_COPY,
  GALLERY_OPTIONS,
  GALLERY_UPLOAD_TYPES,
} from '@/constants/design-system';
import { GUIDE_COPY, GUIDE_STEPS } from '@/constants/guide';
import { GALLERY } from '@/constants/landing-gallery';
import { HERO, PIPELINE, PRINCIPLES } from '@/constants/landing';
import { LOBBY_COPY } from '@/constants/lobby';
import { NOT_AVAILABLE } from '@/constants/match';
import { OVERLAY_COPY } from '@/constants/overlay';
import { DEPTH_COPY } from '@/constants/pitch-depth';
import { PWA_MANIFEST } from '@/constants/pwa';
import { RECAP_COPY } from '@/constants/recap';
import { SITE } from '@/constants/site';
import { STUDIO_COPY } from '@/constants/studio';
import { RESUME_COPY } from '@/constants/editorial';
import enGB from '@/features/interface-language/page-messages/en-GB.json';

const stringsIn = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(stringsIn);
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(stringsIn);
  }
  return [];
};

const publicCopy = stringsIn([
  SITE.description,
  PWA_MANIFEST.description,
  HERO,
  PIPELINE,
  PRINCIPLES,
  GALLERY,
  GUIDE_COPY,
  GUIDE_STEPS,
  LOBBY_COPY,
  AUDIT_COPY,
  APPROVAL_COPY,
  POLICY_COPY,
  RESUME_COPY,
  STUDIO_COPY,
  OVERLAY_COPY,
  RECAP_COPY,
  DEPTH_COPY,
  enGB,
]).join('\n');

describe('public copy', () => {
  it('avoids artificial punctuation and mechanical compound wording', () => {
    expect(publicCopy).not.toMatch(/—| - /);
    expect(publicCopy).not.toMatch(
      /\b(?:AI-written|fact-checked|on-air graphics|automatic on-air)\b/i,
    );
  });

  it('uses plain product language in the component gallery', () => {
    expect(stringsIn([GALLERY_COPY, GALLERY_OPTIONS]).join('\n')).not.toMatch(
      /\b(?:cue|cues|fixture|insight|insights|session|publish gate|kill switch|auto-publish|audit trail|retract|retracts)\b/i,
    );
  });

  it('names unavailable values instead of showing a dash', () => {
    expect(NOT_AVAILABLE).toBe('Not available');
    expect(DEPTH_COPY.none).toBe(NOT_AVAILABLE);
    expect(RECAP_COPY.facts.missing).toBe(NOT_AVAILABLE);
    expect(RECAP_COPY.facts.possession(NOT_AVAILABLE, NOT_AVAILABLE)).toBe(
      'Possession: Not available',
    );
  });

  it('lists each accepted gallery upload type once', () => {
    expect(new Set(GALLERY_UPLOAD_TYPES).size).toBe(
      GALLERY_UPLOAD_TYPES.length,
    );
  });
});
