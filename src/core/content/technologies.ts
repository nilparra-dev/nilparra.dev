/**
 * Tools that appear on the project cards and in the skills of the profile.
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
  linux: { name: 'Linux', logo: 'portfolio/tech/linux.svg' },
  ubuntu: { name: 'Ubuntu', logo: 'portfolio/tech/ubuntu.svg' },
  debian: { name: 'Debian', logo: 'portfolio/tech/debian.svg' },
  bash: { name: 'Bash', logo: 'portfolio/tech/gnubash.svg' },
  cisco: { name: 'Cisco', logo: 'portfolio/tech/cisco.svg' },
  nginx: { name: 'Nginx', logo: 'portfolio/tech/nginx.svg' },
  apache: { name: 'Apache HTTP Server', logo: 'portfolio/tech/apache.svg' },
  wireshark: { name: 'Wireshark', logo: 'portfolio/tech/wireshark.svg' },
  proxmox: { name: 'Proxmox VE', logo: 'portfolio/tech/proxmox.svg' },
  virtualbox: { name: 'VirtualBox', logo: 'portfolio/tech/virtualbox.svg' },
  pfsense: { name: 'pfSense', logo: 'portfolio/tech/pfsense.svg' },
  ansible: { name: 'Ansible', logo: 'portfolio/tech/ansible.svg' },
  git: { name: 'Git', logo: 'portfolio/tech/git.svg' },
  mysql: { name: 'MySQL', logo: 'portfolio/tech/mysql.svg' },
  mariadb: { name: 'MariaDB', logo: 'portfolio/tech/mariadb.svg' },
  php: { name: 'PHP', logo: 'portfolio/tech/php.svg' },
  html: { name: 'HTML', logo: 'portfolio/tech/html5.svg' },
  css: { name: 'CSS', logo: 'portfolio/tech/css.svg' },
  odoo: { name: 'Odoo', logo: 'portfolio/tech/odoo.svg' },
  // No official square mark to show, so the tile carries only the name.
  lightgbm: { name: 'LightGBM', logo: null },
  optuna: { name: 'Optuna', logo: null },
  // Microsoft does not allow its marks in Simple Icons, so these go without one.
  windowsServer: { name: 'Windows Server', logo: null },
  powershell: { name: 'PowerShell', logo: null },
} as const satisfies Record<string, Technology>;

export type TechnologyId = keyof typeof TECHNOLOGIES;
