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
      es: 'Proyecto de investigación en machine learning aplicado al fútbol: estudia cómo predecir mejor los partidos con datos profesionales de eventos y tracking, y se ejecuta cada jornada de forma autónoma en Linux.',
      ca: 'Projecte de recerca en machine learning aplicat al futbol: estudia com predir millor els partits amb dades professionals d’esdeveniments i tracking, i s’executa cada jornada de manera autònoma a Linux.',
      en: 'Machine learning research project on football: it studies how to forecast matches better from professional event and tracking data, and runs every matchday unattended on Linux.',
    },
    highlights: {
      es: [
        'Datos profesionales de los mejores proveedores del sector: eventos, tracking de jugadores, alineaciones y xG',
        'Pipeline de datos idempotente, con cada respuesta guardada en bruto y reconciliada hasta que el proveedor deja de corregirla',
        'Variables por temporada validadas en el tiempo para evitar fugas de información',
        'Modelos Dixon-Coles y LightGBM ajustados con Optuna, con calibración y backtest',
        'Servidor Linux con Docker y PostgreSQL, y cada jornada automatizada con Airflow y systemd',
      ],
      ca: [
        'Dades professionals dels millors proveïdors del sector: esdeveniments, tracking de jugadors, alineacions i xG',
        'Pipeline de dades idempotent, amb cada resposta desada en brut i reconciliada fins que el proveïdor deixa de corregir-la',
        'Variables per temporada validades en el temps per evitar fuites d’informació',
        'Models Dixon-Coles i LightGBM ajustats amb Optuna, amb calibratge i backtest',
        'Servidor Linux amb Docker i PostgreSQL, i cada jornada automatitzada amb Airflow i systemd',
      ],
      en: [
        'Professional data from the best providers in the industry: events, player tracking, lineups and xG',
        'Idempotent data pipeline: every response is stored raw and reconciled until the provider stops correcting it',
        'Per-season features validated point in time to avoid information leaks',
        'Dixon-Coles and LightGBM models tuned with Optuna, with calibration and backtesting',
        'Linux server with Docker and PostgreSQL, and every matchday automated with Airflow and systemd',
      ],
    },
    description: {
      es: [
        'Antevue es un proyecto de investigación sobre cómo predecir mejor los partidos de fútbol con técnicas de aprendizaje automático, y sobre qué información del juego mejora de verdad una previsión. No es solo un modelo: es un sistema completo que se despliega, se automatiza y se mantiene en un servidor Linux.',
        'Trabaja con datos profesionales de los mejores proveedores del sector, el mismo tipo de datos que usan los clubes y los equipos de análisis. Los datos de eventos registran cada pase, tiro o recuperación con su posición en el campo; los datos de tracking siguen la posición de todos los jugadores y del balón varias veces por segundo; y el xG (goles esperados) estima la probabilidad de que un tiro acabe en gol. A eso se suman las alineaciones de cada partido.',
        'La parte de datos está pensada para ser fiable: cada respuesta del proveedor se guarda en bruto con su hash, los procesos de lectura son idempotentes (repetirlos no duplica ni estropea nada) y un ciclo de reconciliación vuelve a pedir los partidos ya jugados hasta que el proveedor deja de corregirlos.',
        'Las variables se construyen por temporada con validación de punto en el tiempo, para que el modelo nunca aprenda de información que todavía no existía antes del partido. Un registro anota cuándo está disponible cada variable, su riesgo de fuga de información y si puede usarse para entrenar, y el entrenamiento se bloquea hasta que el conjunto pasa esas comprobaciones.',
        'El modelo de goles es Dixon-Coles, un modelo estadístico clásico basado en la distribución de Poisson que corrige los resultados cortos y da más peso a los partidos recientes. Los córners, las tarjetas y las estadísticas de jugadores usan gradient boosting con LightGBM, con los hiperparámetros ajustados con Optuna, y cada modelo pasa calibración y backtest antes de ponerse en producción.',
        'La parte de sistemas es la más cercana a la administración de redes y sistemas: el servidor Linux ejecuta los servicios en contenedores Docker con PostgreSQL como base de datos, Airflow y un servicio systemd lanzan el ciclo de cada jornada sin intervención manual, Grafana sirve para la monitorización y las pruebas con pytest se ejecutan en GitHub Actions.',
        'Un panel interno en React y FastAPI muestra la ficha del partido, la previsión y el rendimiento del modelo. Cada previsión queda guardada en un registro inmutable, así el rendimiento siempre se mide con previsiones hechas antes del partido.',
        'El código y los datos son privados.',
      ],
      ca: [
        'Antevue és un projecte de recerca sobre com predir millor els partits de futbol amb tècniques d’aprenentatge automàtic, i sobre quina informació del joc millora de veritat una previsió. No és només un model: és un sistema complet que es desplega, s’automatitza i es manté en un servidor Linux.',
        'Treballa amb dades professionals dels millors proveïdors del sector, el mateix tipus de dades que fan servir els clubs i els equips d’anàlisi. Les dades d’esdeveniments registren cada passada, xut o recuperació amb la seva posició al camp; les dades de tracking segueixen la posició de tots els jugadors i de la pilota diverses vegades per segon; i l’xG (gols esperats) estima la probabilitat que un xut acabi en gol. A això s’hi sumen les alineacions de cada partit.',
        'La part de dades està pensada per ser fiable: cada resposta del proveïdor es desa en brut amb el seu hash, els processos de lectura són idempotents (repetir-los no duplica ni espatlla res) i un cicle de reconciliació torna a demanar els partits ja jugats fins que el proveïdor deixa de corregir-los.',
        'Les variables es construeixen per temporada amb validació de punt en el temps, perquè el model no aprengui mai d’informació que encara no existia abans del partit. Un registre anota quan està disponible cada variable, el seu risc de fuita d’informació i si es pot fer servir per entrenar, i l’entrenament es bloqueja fins que el conjunt passa aquestes comprovacions.',
        'El model de gols és Dixon-Coles, un model estadístic clàssic basat en la distribució de Poisson que corregeix els resultats curts i dona més pes als partits recents. Els còrners, les targetes i les estadístiques de jugadors fan servir gradient boosting amb LightGBM, amb els hiperparàmetres ajustats amb Optuna, i cada model passa calibratge i backtest abans de posar-se en producció.',
        'La part de sistemes és la més propera a l’administració de xarxes i sistemes: el servidor Linux executa els serveis en contenidors Docker amb PostgreSQL com a base de dades, Airflow i un servei systemd llancen el cicle de cada jornada sense intervenció manual, Grafana serveix per a la monitorització i les proves amb pytest s’executen a GitHub Actions.',
        'Un panell intern en React i FastAPI mostra la fitxa del partit, la previsió i el rendiment del model. Cada previsió queda desada en un registre immutable, així el rendiment sempre es mesura amb previsions fetes abans del partit.',
        'El codi i les dades són privats.',
      ],
      en: [
        'Antevue is a research project on how to forecast football matches better with machine learning, and on which information about the game really improves a forecast. It is more than a model: it is a complete system that is deployed, automated and maintained on a Linux server.',
        'It works with professional data from the best providers in the industry, the same kind of data clubs and analysis teams use. Event data records every pass, shot or recovery with its position on the pitch; tracking data follows every player and the ball several times per second; and xG (expected goals) estimates how likely a shot is to end in a goal. Lineups for every match complete the picture.',
        'The data side is built to be reliable: every provider response is stored raw with its hash, the parsers are idempotent (running them again never duplicates or breaks anything) and a reconciliation loop re-fetches finished matches until the provider stops correcting them.',
        'Features are built per season with point-in-time validation, so the model never learns from information that did not exist yet before the match. A registry records when each feature becomes available, its leakage risk and whether it can be used for training, and training stays blocked until the set passes those checks.',
        'The goals model is Dixon-Coles, a classic statistical model based on the Poisson distribution that corrects low scores and gives more weight to recent matches. Corners, cards and player statistics use gradient boosting with LightGBM, with hyperparameters tuned by Optuna, and every model goes through calibration and backtesting before it reaches production.',
        'The systems side is the closest to network and systems administration: the Linux server runs the services in Docker containers with PostgreSQL as the database, Airflow and a systemd service launch the matchday cycle without manual steps, Grafana handles monitoring and the pytest suite runs on GitHub Actions.',
        'An internal React and FastAPI panel shows the match file, the forecast and the model’s performance. Every forecast lands in an immutable ledger, so performance is always measured on forecasts made before kick-off.',
        'The code and the data are private.',
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
        es: 'El repositorio y los datos son privados. Puedo explicar la arquitectura o hacer una demostración.',
        ca: 'El repositori i les dades són privats. Puc explicar l’arquitectura o fer una demostració.',
        en: 'The repository and the data are private. I can walk through the architecture or give a demo.',
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
