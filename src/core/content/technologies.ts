/**
 * Tools that appear on the project cards.
 *
 * The key is a stable id used by the project content, the name is shown as is
 * (proper nouns are never translated) and `logo` is a path inside `public/`.
 * The mark is decorative: the chip already carries the name.
 */
export interface Technology {
  name: string;
  logo: string | null;
}

export const TECHNOLOGIES = {
  typescript: { name: 'TypeScript', logo: 'portfolio/tech/typescript.svg' },
  node: { name: 'Node.js', logo: 'portfolio/tech/nodejs.svg' },
  react: { name: 'React', logo: 'portfolio/tech/react.svg' },
  hlsjs: { name: 'hls.js', logo: 'portfolio/tech/hlsjs.svg' },
  tailwind: { name: 'Tailwind CSS', logo: 'portfolio/tech/tailwindcss.svg' },
  vitest: { name: 'Vitest', logo: 'portfolio/tech/vitest.svg' },
  playwright: { name: 'Playwright', logo: 'portfolio/tech/playwright.svg' },
  githubActions: { name: 'GitHub Actions', logo: 'portfolio/tech/githubactions.svg' },
  python: { name: 'Python', logo: 'portfolio/tech/python.svg' },
  fastapi: { name: 'FastAPI', logo: 'portfolio/tech/fastapi.svg' },
  postgresql: { name: 'PostgreSQL', logo: 'portfolio/tech/postgresql.svg' },
  airflow: { name: 'Apache Airflow', logo: 'portfolio/tech/apacheairflow.svg' },
  docker: { name: 'Docker', logo: 'portfolio/tech/docker.svg' },
  grafana: { name: 'Grafana', logo: 'portfolio/tech/grafana.svg' },
  pytest: { name: 'pytest', logo: 'portfolio/tech/pytest.svg' },
  // No official square mark to show, so the tile carries only the name.
  lightgbm: { name: 'LightGBM', logo: null },
  optuna: { name: 'Optuna', logo: null },
} as const satisfies Record<string, Technology>;

export type TechnologyId = keyof typeof TECHNOLOGIES;
