import { es } from '../i18n/es';
import type { ProfileContent } from './profile';
import type { ProjectContent } from './projects';
import { TECHNOLOGIES } from './technologies';
import { isPlaceholder, pick } from './types';

/**
 * Plain HTML version of the portfolio, written into `#root` at build time.
 *
 * The desktop only exists once the JavaScript runs. Link previews, crawlers
 * that do not render scripts and visitors with JavaScript off would otherwise
 * find an empty page. React replaces this markup as soon as it mounts, so it
 * carries exactly the content the desktop shows, generated from the same
 * modules, and nothing else. Placeholders are left out rather than published.
 */
export function staticProfileHtml(profile: ProfileContent, projects: ProjectContent[]): string {
  const text = (value: string) => escapeHtml(value);
  const real = (value: string) => value.trim() !== '' && !isPlaceholder(value);
  const lines: string[] = [];

  lines.push('<main class="static-profile" lang="es">');
  lines.push(`<noscript><p class="static-profile-note">${text(es['boot.noScript'])}</p></noscript>`);
  lines.push(`<h1>${text(profile.displayName)}</h1>`);
  lines.push(`<p class="static-profile-tagline">${text(pick(profile.tagline, 'es'))}</p>`);
  if (real(profile.location)) lines.push(`<p>${text(profile.location)}</p>`);

  const bio = pick(profile.bio, 'es').filter(real);
  if (bio.length > 0) {
    lines.push(`<h2>${text(es['about.heading'])}</h2>`);
    for (const paragraph of bio) lines.push(`<p>${text(paragraph)}</p>`);
  }

  const published = projects.filter((project) => project.status === 'published');
  if (published.length > 0) {
    lines.push(`<h2>${text(es['projects.heading'])}</h2>`);
    for (const project of published) {
      lines.push('<article>');
      lines.push(
        `<h3><a href="#projects/${encodeURIComponent(project.slug)}">${text(pick(project.title, 'es'))}</a></h3>`,
      );
      const summary = pick(project.summary, 'es');
      if (real(summary)) lines.push(`<p>${text(summary)}</p>`);
      const highlights = pick(project.highlights, 'es').filter(real);
      if (highlights.length > 0) {
        lines.push('<ul>');
        for (const highlight of highlights) lines.push(`<li>${text(highlight)}</li>`);
        lines.push('</ul>');
      }
      if (project.technologies.length > 0) {
        const names = project.technologies.map((id) => TECHNOLOGIES[id].name).join(', ');
        lines.push(`<p>${text(es['projects.technologies'])}: ${text(names)}</p>`);
      }
      if (project.repo.kind === 'public') {
        lines.push(`<p><a href="${text(project.repo.url)}">${text(es['projects.openRepo'])}</a></p>`);
      } else if (project.repo.kind === 'closed') {
        lines.push(`<p>${text(pick(project.repo.note, 'es'))}</p>`);
      }
      if (project.demoUrl) {
        lines.push(`<p><a href="${text(project.demoUrl)}">${text(es['projects.openDemo'])}</a></p>`);
      }
      lines.push('</article>');
    }
  }

  if (profile.studies.length > 0) {
    lines.push(`<h2>${text(es['about.studies'])}</h2>`);
    lines.push('<ul>');
    for (const study of profile.studies) {
      lines.push(
        `<li>${text(pick(study.title, 'es'))}. ${text(pick(study.centre, 'es'))}, ${text(study.period)}.</li>`,
      );
    }
    lines.push('</ul>');
  }

  if (profile.experience.length > 0) {
    lines.push(`<h2>${text(es['about.experience'])}</h2>`);
    lines.push('<ul>');
    for (const job of profile.experience) {
      lines.push(
        `<li>${text(pick(job.role, 'es'))}, ${text(job.company)} (${text(pick(job.period, 'es'))}). ` +
          `${text(pick(job.description, 'es'))}</li>`,
      );
    }
    lines.push('</ul>');
  }

  const skills = profile.skills.filter((group) => group.skills.length > 0);
  if (skills.length > 0) {
    lines.push(`<h2>${text(es['about.skills'])}</h2>`);
    lines.push('<ul>');
    for (const group of skills) {
      const names = group.skills.map((skill) => TECHNOLOGIES[skill.technology].name).join(', ');
      lines.push(`<li>${text(pick(group.title, 'es'))}: ${text(names)}</li>`);
    }
    lines.push('</ul>');
  }

  if (profile.cvUrl) {
    lines.push(`<p><a href="${text(profile.cvUrl)}">${text(es['about.downloadCv'])}</a></p>`);
  }

  lines.push(`<h2>${text(es['mail.heading'])}</h2>`);
  lines.push('<ul>');
  for (const link of profile.links) {
    lines.push(`<li><a href="${text(link.url)}">${text(link.label)}</a></li>`);
  }
  lines.push('</ul>');
  lines.push('</main>');

  return lines.join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
