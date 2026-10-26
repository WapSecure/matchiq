export const LEAGUE_NAME = /premier[\s-_]?league/i;
export const MARK_REFERENCE =
  /\b(logo|crest|badge|kit|emblem|lion)s?\b|\.(png|svg|jpe?g|webp|gif|ico)\b/i;
export const IMAGE_IMPORT_PATH =
  /(?:from|import|src=|url\()\s*\(?["']?[^"'\s)]*(premier|epl)[^"'\s)]*\.(png|svg|jpe?g|webp|gif|ico)/i;

/** Lines that only disclaim any link to the league are explicitly allowed. */
export const DISCLAIMER_LINE =
  /not affiliated|n'est ni affilié|no está afiliado|(uses|use) no\b|no (real|.*)data is used/i;

export const LEAGUE_MARK_FILENAME =
  /(premier[\s-_]?league|(^|[-_])epl([-_.]|$)|three[-_]?lions|crest|club[-_]?badge|league[-_]?(logo|badge|kit))/i;

export const TEXT_FILE = /\.(tsx?|css|md|json|svg|html|mjs|webmanifest)$/i;
export const SKIPPED_DIRS = new Set(['node_modules', '.next', 'test-output']);
