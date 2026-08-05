/**
 * Single source of truth for the project's external links.
 *
 * These used to be inlined per component and had drifted into four different
 * values: `euddy/wissfort` in the agent docs, `EJCP3/wissfort` in the navbar,
 * `EJCP3/wiss` in package.json. Only the last one matches `git remote -v`.
 */
export const GITHUB_URL = 'https://github.com/EJCP3/wiss';
export const NPM_URL = 'https://www.npmjs.com/package/wissfort';

/**
 * Absolute URL for one of the AI-agent instruction files in `public/agents/`.
 *
 * Derived from `Astro.site` on purpose. The FAB used to copy a hardcoded host
 * that didn't match the one `astro.config.mjs` declares, so the prompt handed
 * to the agent could point at a domain that wasn't serving this build. Keep
 * the canonical host in `astro.config.mjs` and everything follows from it.
 */
export function agentDocUrl(site: URL | undefined, framework: string): string {
  return new URL(`/agents/${framework}.md`, site ?? 'http://localhost:4321').toString();
}
