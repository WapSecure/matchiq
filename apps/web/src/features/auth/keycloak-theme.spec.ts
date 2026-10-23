// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(import.meta.dirname, '../../../../..');
const THEME = join(REPO, 'infra/keycloak/themes/matchiq/login');
const read = (path: string) => readFileSync(join(REPO, path), 'utf8');
const MESSAGE_KEY = /msg\("(mq[A-Za-z]+)"/g;
const EXTERNAL_URL = /url\(\s*['"]?https?:|@import\s+['"]?https?:/;

const messageKeys = () =>
  new Set(
    readFileSync(join(THEME, 'messages/messages_en.properties'), 'utf8')
      .split('\n')
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.split('=')[0]),
  );

/** Static guard for the hosted sign-in branding (MQ-054); no Keycloak needed. */
describe('MatchIQ Keycloak login theme', () => {
  it('extends keycloak.v2 and drops the parent PatternFly styles', () => {
    const props = readFileSync(join(THEME, 'theme.properties'), 'utf8');
    expect(props).toMatch(/^parent=keycloak\.v2$/m);
    expect(props).toMatch(/^stylesCommon=$/m);
    expect(props).toMatch(/^styles=css\/matchiq\.css$/m);
  });

  it('is the realm login theme and the web client has a home URL', () => {
    const realm = JSON.parse(read('infra/keycloak/matchiq-realm.json'));
    expect(realm.loginTheme).toBe('matchiq');
    const web = realm.clients.find(
      (c: { clientId: string }) => c.clientId === 'matchiq-web',
    );
    expect(web.baseUrl).toMatch(/^https?:\/\//);
  });

  it('is mounted read-only into the compose Keycloak', () => {
    expect(read('docker-compose.yml')).toContain(
      './infra/keycloak/themes/matchiq:/opt/keycloak/themes/matchiq:ro',
    );
  });

  it('defines every MatchIQ message the templates use', () => {
    const keys = messageKeys();
    const templates = readdirSync(THEME).filter((f) => f.endsWith('.ftl'));
    const used = templates.flatMap((f) => [
      ...readFileSync(join(THEME, f), 'utf8').matchAll(MESSAGE_KEY),
    ]);
    expect(used.length).toBeGreaterThan(0);
    for (const [, key] of used) expect(keys).toContain(key);
  });

  it('keeps template comments and a repeated brand out of the tab title', () => {
    const frame = readFileSync(join(THEME, 'template.ftl'), 'utf8');
    const title = frame.match(/<title>(.*?)<\/title>/)?.[1] ?? '';
    expect(title).not.toContain('<#nested');
    expect(title).toContain('${tabTitle');
    expect(frame).toMatch(/pageHeading\?markup_string\?replace\("<!--/);
    expect(frame).toMatch(/tabTitle = pageHeading\?replace\(" \(to\|of\)/);
    for (const f of readdirSync(THEME).filter((n) => n.endsWith('.ftl'))) {
      const html = readFileSync(join(THEME, f), 'utf8').replace(
        /<#--[\s\S]*?-->/g,
        '',
      );
      expect(html, f).not.toMatch(/<title>[^<]*<!--/);
    }
  });

  it('self-hosts its font and stylesheet', () => {
    expect(
      existsSync(join(THEME, 'resources/fonts/Geist-Variable.woff2')),
    ).toBe(true);
    const css = readFileSync(join(THEME, 'resources/css/matchiq.css'), 'utf8');
    expect(css).not.toMatch(EXTERNAL_URL);
  });
});
