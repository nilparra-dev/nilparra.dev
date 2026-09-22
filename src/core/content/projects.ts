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
      es: 'CLI y reproductor local para recuperar VODs de Twitch, incluidos los que el canal oculta, con el chat sincronizado.',
      ca: 'CLI i reproductor local per recuperar VODs de Twitch, incloent-hi els que el canal amaga, amb el xat sincronitzat.',
      en: 'CLI and local player that recover Twitch VODs, including the ones a channel hides, with the chat replay in sync.',
    },
    highlights: {
      es: [
        'Resuelve VODs públicos y ocultos sin descargar el vídeo',
        'Lista streams que Twitch no muestra',
        'Archiva la repetición del chat y se reanuda tras un corte',
        'Reproductor local con el chat sincronizado',
      ],
      ca: [
        'Resol VODs públics i ocults sense baixar el vídeo',
        'Llista streams que Twitch no mostra',
        'Arxiva la repetició del xat i es reprèn després d’un tall',
        'Reproductor local amb el xat sincronitzat',
      ],
      en: [
        'Resolves public and hidden VODs without downloading the video',
        'Lists streams Twitch does not show',
        'Archives the chat replay and resumes after an interruption',
        'Local player with the chat in sync',
      ],
    },
    description: {
      es: [
        'Wooster convierte un ID, una URL de tracker o un objetivo video:canal_stream_inicio en una URL M3U8 reproducible, sin bajar el vídeo. Cuando solo hay una hora aproximada, busca segundo a segundo alrededor.',
        'list cruza el archivo público de Twitch con el historial de trackers y saca también los VODs ocultos o solo para suscriptores; download escribe el vídeo en un único archivo, con reanudación, tres motores de descarga y arreglo de las marcas PTS/DTS que descolocan el reloj en VLC.',
        'chat archiva la repetición del chat con diario de páginas y checkpoint, y watch abre un reproductor React con hls.js que sincroniza los mensajes con el vídeo, indexa archivos grandes en un Web Worker y quita los bloques de anuncios del directo reescribiendo las listas en el servidor local.',
        'Está publicado en npm como twitch-vod-m3u8, con licencia MIT.',
      ],
      ca: [
        'Wooster converteix un ID, una URL de tracker o un objectiu video:canal_stream_inici en una URL M3U8 reproduïble, sense baixar el vídeo. Quan només hi ha una hora aproximada, busca segon a segon al voltant.',
        'list creua l’arxiu públic de Twitch amb l’historial de trackers i treu també els VODs ocults o només per a subscriptors; download escriu el vídeo en un únic fitxer, amb represa, tres motors de descàrrega i correcció de les marques PTS/DTS que descol·loquen el rellotge a VLC.',
        'chat arxiva la repetició del xat amb diari de pàgines i checkpoint, i watch obre un reproductor React amb hls.js que sincronitza els missatges amb el vídeo, indexa fitxers grans en un Web Worker i treu els blocs d’anuncis del directe reescrivint les llistes al servidor local.',
        'Es publica a npm com twitch-vod-m3u8, amb llicència MIT.',
      ],
      en: [
        'Wooster turns an ID, a tracker URL or a video:channel_stream_start target into a playable M3U8 URL without downloading the video. When only an approximate start time is known it searches second by second around it.',
        'list combines Twitch\'s public archive with tracker history and also returns hidden or subscriber-only VODs; download writes the video to a single file with resume, three download engines and a fix for the PTS/DTS stamps that throw VLC\'s clock off.',
        'chat archives the chat replay with a page journal and a checkpoint, and watch opens a React and hls.js player that keeps messages in sync with the video, indexes large archives in a Web Worker and strips live ad pods by rewriting the playlists in the local server.',
        'Published on npm as twitch-vod-m3u8, MIT licensed.',
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
      es: 'Modelo de machine learning que predice partidos de fútbol y detecta valor comparando sus pronósticos con las cuotas de las casas de apuestas.',
      ca: 'Model de machine learning que prediu partits de futbol i detecta valor comparant els seus pronòstics amb les quotes de les cases d’apostes.',
      en: 'Machine learning model that forecasts football matches and finds value by comparing its predictions with bookmaker odds.',
    },
    highlights: {
      es: [
        'Modelo de goles Dixon-Coles y gradient boosting para córners, tarjetas y jugadores',
        'Features por temporada validadas en el tiempo para evitar fugas de información',
        'Entrenamiento con LightGBM y Optuna, con calibración y backtest',
        'Predicciones contrastadas con cuotas reales y evaluación por CLV',
      ],
      ca: [
        'Model de gols Dixon-Coles i gradient boosting per a córners, targetes i jugadors',
        'Features per temporada validades en el temps per evitar fuites d’informació',
        'Entrenament amb LightGBM i Optuna, amb calibratge i backtest',
        'Prediccions contrastades amb quotes reals i avaluació per CLV',
      ],
      en: [
        'Dixon-Coles goals model and gradient boosting for corners, cards and player markets',
        'Per-season features validated in time to avoid information leaks',
        'Trained with LightGBM and Optuna, with calibration and backtest',
        'Predictions priced against live odds and evaluated through CLV',
      ],
    },
    description: {
      es: [
        'Antevue construye un modelo de fútbol a partir de datos de partidos (eventos, alineaciones, xG, seguimiento) y de varias casas de apuestas. Cada payload se guarda en bruto con su hash, los parsers son idempotentes y un ciclo de reconciliación vuelve a pedir los partidos ya jugados hasta que el proveedor deja de corregirlos.',
        'Las features se construyen por temporada con validación de punto en el tiempo, y un registro anota cuándo está disponible cada una, su riesgo de fuga y si puede usarse para entrenar; el entrenamiento queda bloqueado hasta que el conjunto pasa esas comprobaciones.',
        'El modelo de goles es Dixon-Coles y los mercados de córners, tarjetas y jugadores usan gradient boosting con LightGBM y Optuna, con calibración y backtest antes de promover un artefacto.',
        'Las predicciones se contrastan con cuotas reales y cada apuesta queda en un libro inmutable con staking Kelly y seguimiento de CLV. Airflow y un servicio systemd mantienen el ciclo de cada jornada, y un panel interno en React y FastAPI muestra el dossier del partido, la previsión y el rendimiento.',
        'El código y los datos con licencia son privados.',
      ],
      ca: [
        'Antevue construeix un model de futbol a partir de dades de partits (esdeveniments, alineacions, xG, seguiment) i de diverses cases d’apostes. Cada payload es desa en brut amb el seu hash, els parsers són idempotents i un cicle de reconciliació torna a demanar els partits ja jugats fins que el proveïdor deixa de corregir-los.',
        'Les features es construeixen per temporada amb validació de punt en el temps, i un registre anota quan està disponible cadascuna, el seu risc de fuga i si es pot fer servir per entrenar; l’entrenament queda bloquejat fins que el conjunt passa aquestes comprovacions.',
        'El model de gols és Dixon-Coles i els mercats de córners, targetes i jugadors fan servir gradient boosting amb LightGBM i Optuna, amb calibratge i backtest abans de promoure un artefacte.',
        'Les prediccions es contrasten amb quotes reals i cada aposta queda en un llibre immutable amb staking Kelly i seguiment de CLV. Airflow i un servei systemd mantenen el cicle de cada jornada, i un panell intern en React i FastAPI mostra el dossier del partit, la previsió i el rendiment.',
        'El codi i les dades amb llicència són privats.',
      ],
      en: [
        'Antevue builds a football model from match data (events, lineups, xG, tracking) and several bookmakers. Every payload is stored raw with its hash, the parsers are idempotent and a reconciliation loop re-fetches finished matches until the provider stops correcting them.',
        'Features are built per season with point-in-time validation, and a registry records when each one is available, its leakage risk and whether it can be used for training; training stays blocked until the set passes those checks.',
        'The goals model is Dixon-Coles and corners, cards and player markets use gradient boosting with LightGBM and Optuna, with calibration and backtest before an artifact is promoted.',
        'Predictions are priced against live odds and every bet lands in an immutable ledger with Kelly staking and CLV tracking. Airflow and a systemd service drive the matchday cycle, and an internal React and FastAPI panel shows the match dossier, the forecast and performance.',
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
