import { describe, expect, it } from 'vitest';
import { PROFILE, type ProfileContent } from './profile';
import { PROJECTS } from './projects';
import { staticProfileHtml } from './staticHtml';
import { PLACEHOLDER } from './types';

describe('static profile html', () => {
  it('carries the name, the projects and every contact link', () => {
    const html = staticProfileHtml(PROFILE, PROJECTS);
    expect(html).toContain(`<h1>${PROFILE.displayName}</h1>`);
    for (const project of PROJECTS) expect(html).toContain(`href="#projects/${project.slug}"`);
    for (const link of PROFILE.links) expect(html).toContain(`href="${link.url}"`);
  });

  it('escapes the content instead of trusting it as markup', () => {
    const profile: ProfileContent = { ...PROFILE, displayName: '<script>alert("x")</script>' };
    const html = staticProfileHtml(profile, []);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  });

  it('leaves placeholders and placeholder projects out', () => {
    const profile: ProfileContent = {
      ...PROFILE,
      bio: { es: [`${PLACEHOLDER} bio`], ca: [], en: [] },
    };
    const projects = PROJECTS.map((project) => ({ ...project, status: 'placeholder' as const }));
    const html = staticProfileHtml(profile, projects);
    expect(html).not.toContain(PLACEHOLDER);
    expect(html).not.toContain('#projects/');
  });
});
