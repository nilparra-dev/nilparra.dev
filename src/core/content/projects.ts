/**
 * Projects shown in the portfolio window.
 *
 * Every string is localized; `logo` and the screenshots are paths inside
 * `public/` (for example `portfolio/my-app-1.png`) or files imported from the
 * virtual disk later on. `repo` states whether the code is public, closed or
 * absent, and `demoUrl` stays null when there is no public demo to link.
 */
import type { TechnologyId } from './technologies';
import type { Localized } from './types';

export interface ProjectScreenshot {
  src: string;
  alt: Localized<string>;
}

/** How the source code of a project is published. */
export type ProjectRepo =
  | { kind: 'public'; url: string }
  /** Closed on purpose: the card states it instead of linking anywhere. */
  | { kind: 'closed'; note: Localized<string> }
  /** No public repository and no closed-source statement. */
  | { kind: 'none' };

export interface ProjectContent {
  id: string;
  slug: string;
  title: Localized<string>;
  summary: Localized<string>;
  /** Short claims shown above the technologies; the long text lives in `description`. */
  highlights: Localized<string[]>;
  /** Paragraphs shown behind the technical details disclosure; the long text. */
  description: Localized<string[]>;
  /** Path inside `public/` for the project mark shown in the list and the card. */
  logo: string;
  technologies: TechnologyId[];
  repo: ProjectRepo;
  demoUrl: string | null;
  screenshots: ProjectScreenshot[];
  year: string | null;
  /**
   * `placeholder` entries are shown with a visible "placeholder" badge so a
   * visitor never reads them as real work.
   */
  status: 'published' | 'placeholder';
}

export const PROJECTS: ProjectContent[] = [
  {
    id: 'wooster',
    slug: 'wooster',
    title: {
      es: 'Wooster',
      ca: 'Wooster',
      en: 'Wooster',
    },
    summary: {
      es: 'Herramienta de línea de comandos y reproductor local para localizar, archivar y ver VODs de Twitch con el chat sincronizado.',
      ca: 'Eina de línia d’ordres i reproductor local per localitzar, arxivar i veure VODs de Twitch amb el xat sincronitzat.',
      en: 'Command-line tool and local player to find, archive and watch Twitch VODs with the chat replay in sync.',
    },
    highlights: {
      es: [
        'Localiza un VOD a partir de un ID, una URL o una hora aproximada, sin descargar el vídeo',
        'Descarga reanudable en un único archivo, con tres motores de descarga',
        'Archiva la repetición del chat con puntos de control y continúa tras un corte',
        'Reproductor local en React con el chat sincronizado con el vídeo',
      ],
      ca: [
        'Localitza un VOD a partir d’un ID, una URL o una hora aproximada, sense baixar el vídeo',
        'Baixada que es pot reprendre en un únic fitxer, amb tres motors de baixada',
        'Arxiva la repetició del xat amb punts de control i continua després d’un tall',
        'Reproductor local en React amb el xat sincronitzat amb el vídeo',
      ],
      en: [
        'Finds a VOD from an ID, a URL or an approximate start time, without downloading the video',
        'Resumable download to a single file, with three download engines',
        'Archives the chat replay with checkpoints and picks up again after an interruption',
        'Local React player with the chat in sync with the video',
      ],
    },
    description: {
      es: [
        'Wooster es una herramienta de línea de comandos en TypeScript que convierte un ID de vídeo, una URL o un canal con una hora aproximada en una lista M3U8 reproducible. Cuando solo se conoce la hora aproximada, busca segundo a segundo a su alrededor.',
        'list combina el archivo público de Twitch con el historial de servicios de seguimiento y muestra también las emisiones que ya no aparecen en el canal. download guarda el vídeo en un único archivo, con reanudación, tres motores de descarga y corrección de las marcas de tiempo PTS/DTS que desajustan el reloj en VLC.',
        'chat archiva la repetición del chat con un diario de páginas y puntos de control, y watch abre un reproductor en React con hls.js que sincroniza los mensajes con el vídeo e indexa los archivos grandes en un Web Worker.',
        'Está publicado en npm como twitch-vod-m3u8, con licencia MIT, y se prueba con Vitest y Playwright en GitHub Actions.',
      ],
      ca: [
        'Wooster és una eina de línia d’ordres en TypeScript que converteix un ID de vídeo, una URL o un canal amb una hora aproximada en una llista M3U8 reproduïble. Quan només se’n coneix l’hora aproximada, busca segon a segon al voltant.',
        'list combina l’arxiu públic de Twitch amb l’historial de serveis de seguiment i mostra també les emissions que ja no apareixen al canal. download desa el vídeo en un únic fitxer, amb represa, tres motors de baixada i correcció de les marques de temps PTS/DTS que desajusten el rellotge a VLC.',
        'chat arxiva la repetició del xat amb un diari de pàgines i punts de control, i watch obre un reproductor en React amb hls.js que sincronitza els missatges amb el vídeo i indexa els fitxers grans en un Web Worker.',
        'Es publica a npm com a twitch-vod-m3u8, amb llicència MIT, i es prova amb Vitest i Playwright a GitHub Actions.',
      ],
      en: [
        'Wooster is a TypeScript command-line tool that turns a video ID, a URL or a channel plus an approximate start time into a playable M3U8 playlist. When only the approximate time is known, it searches second by second around it.',
        'list combines the public Twitch archive with tracker history and also shows broadcasts that no longer appear on the channel. download writes the video to a single file with resume support, three download engines and a fix for the PTS/DTS timestamps that throw the VLC clock off.',
        'chat archives the chat replay with a page journal and checkpoints, and watch opens a React and hls.js player that keeps messages in sync with the video and indexes large archives in a Web Worker.',
        'Published on npm as twitch-vod-m3u8 under the MIT licence, and tested with Vitest and Playwright on GitHub Actions.',
      ],
    },
    logo: 'portfolio/wooster.svg',
    technologies: [
      'typescript',
      'node',
      'react',
      'hlsjs',
      'tailwind',
      'vitest',
      'playwright',
      'githubActions',
    ],
    repo: { kind: 'public', url: 'https://github.com/nilparra-dev/wooster' },
    demoUrl: null,
    screenshots: [],
    year: '2026',
    status: 'published',
  },
  {
    id: 'antevue',
    slug: 'antevue',
    title: {
      es: 'Antevue',
      ca: 'Antevue',
      en: 'Antevue',
    },
    summary: {
      es: 'Sistema de predicción de partidos de fútbol con machine learning: recoge los datos, entrena los modelos y se ejecuta cada jornada de forma autónoma en Linux.',
      ca: 'Sistema de predicció de partits de futbol amb machine learning: recull les dades, entrena els models i s’executa cada jornada de manera autònoma a Linux.',
      en: 'Machine learning system that forecasts football matches: it collects the data, trains the models and runs every matchday unattended on Linux.',
    },
    highlights: {
      es: [
        'Pipeline de datos idempotente, con cada respuesta guardada en bruto y reconciliada hasta que el proveedor deja de corregirla',
        'Variables por temporada validadas en el tiempo para evitar fugas de información',
        'Modelos Dixon-Coles y LightGBM ajustados con Optuna, con calibración y backtest',
        'Ciclo de cada jornada automatizado con Airflow y systemd sobre Docker y PostgreSQL',
      ],
      ca: [
        'Pipeline de dades idempotent, amb cada resposta desada en brut i reconciliada fins que el proveïdor deixa de corregir-la',
        'Variables per temporada validades en el temps per evitar fuites d’informació',
        'Models Dixon-Coles i LightGBM ajustats amb Optuna, amb calibratge i backtest',
        'Cicle de cada jornada automatitzat amb Airflow i systemd sobre Docker i PostgreSQL',
      ],
      en: [
        'Idempotent data pipeline: every response is stored raw and reconciled until the provider stops correcting it',
        'Per-season features validated point in time to avoid information leaks',
        'Dixon-Coles and LightGBM models tuned with Optuna, with calibration and backtesting',
        'Matchday cycle automated with Airflow and systemd on Docker and PostgreSQL',
      ],
    },
    description: {
      es: [
        'Antevue predice partidos de fútbol a partir de datos de partidos (eventos, alineaciones, xG y seguimiento) y compara sus previsiones con las cuotas del mercado para comprobar si el modelo aporta información que el mercado todavía no refleja.',
        'La parte de datos está pensada para ser fiable: cada respuesta del proveedor se guarda en bruto con su hash, los procesos de lectura son idempotentes y un ciclo de reconciliación vuelve a pedir los partidos ya jugados hasta que el proveedor deja de corregirlos.',
        'Las variables se construyen por temporada con validación de punto en el tiempo. Un registro anota cuándo está disponible cada una, su riesgo de fuga de información y si puede usarse para entrenar, y el entrenamiento se bloquea hasta que el conjunto pasa esas comprobaciones.',
        'El modelo de goles es Dixon-Coles; los córners, las tarjetas y los mercados de jugadores usan gradient boosting con LightGBM y Optuna, con calibración y backtest antes de poner un modelo en producción.',
        'Airflow y un servicio systemd ejecutan el ciclo de cada jornada, y un panel interno en React y FastAPI muestra la ficha del partido, la previsión y el rendimiento. Cada selección queda en un registro inmutable y se evalúa con el CLV (closing line value).',
        'El código y los datos con licencia son privados.',
      ],
      ca: [
        'Antevue prediu partits de futbol a partir de dades de partits (esdeveniments, alineacions, xG i seguiment) i compara les seves previsions amb les quotes del mercat per comprovar si el model aporta informació que el mercat encara no reflecteix.',
        'La part de dades està pensada per ser fiable: cada resposta del proveïdor es desa en brut amb el seu hash, els processos de lectura són idempotents i un cicle de reconciliació torna a demanar els partits ja jugats fins que el proveïdor deixa de corregir-los.',
        'Les variables es construeixen per temporada amb validació de punt en el temps. Un registre anota quan està disponible cadascuna, el seu risc de fuita d’informació i si es pot fer servir per entrenar, i l’entrenament es bloqueja fins que el conjunt passa aquestes comprovacions.',
        'El model de gols és Dixon-Coles; els còrners, les targetes i els mercats de jugadors fan servir gradient boosting amb LightGBM i Optuna, amb calibratge i backtest abans de posar un model en producció.',
        'Airflow i un servei systemd executen el cicle de cada jornada, i un panell intern en React i FastAPI mostra la fitxa del partit, la previsió i el rendiment. Cada selecció queda en un registre immutable i s’avalua amb el CLV (closing line value).',
        'El codi i les dades amb llicència són privats.',
      ],
      en: [
        'Antevue forecasts football matches from match data (events, lineups, xG and tracking) and compares its forecasts with market odds to check whether the model carries information the market does not reflect yet.',
        'The data side is built to be reliable: every provider response is stored raw with its hash, the parsers are idempotent and a reconciliation loop re-fetches finished matches until the provider stops correcting them.',
        'Features are built per season with point-in-time validation. A registry records when each one becomes available, its leakage risk and whether it can be used for training, and training stays blocked until the set passes those checks.',
        'The goals model is Dixon-Coles; corners, cards and player markets use gradient boosting with LightGBM and Optuna, with calibration and backtesting before a model goes to production.',
        'Airflow and a systemd service run the matchday cycle, and an internal React and FastAPI panel shows the match file, the forecast and performance. Every selection lands in an immutable ledger and is evaluated by CLV (closing line value).',
        'The code and the licensed data are private.',
      ],
    },
    logo: 'portfolio/antevue.svg',
    technologies: [
      'python',
      'lightgbm',
      'optuna',
      'fastapi',
      'postgresql',
      'airflow',
      'react',
      'typescript',
      'docker',
      'grafana',
      'pytest',
      'githubActions',
    ],
    repo: {
      kind: 'closed',
      note: {
        es: 'El repositorio y los datos con licencia son privados. Puedo explicar la arquitectura o hacer una demostración.',
        ca: 'El repositori i les dades amb llicència són privats. Puc explicar l’arquitectura o fer una demostració.',
        en: 'The repository and the licensed data are private. I can walk through the architecture or give a demo.',
      },
    },
    demoUrl: null,
    screenshots: [],
    year: '2026',
    status: 'published',
  },
];

export function findProject(slug: string): ProjectContent | undefined {
  return PROJECTS.find((project) => project.slug === slug);
}
