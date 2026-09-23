/**
 * Help topics of the desktop. Plain content, translated, so the help window
 * does not carry any hard coded text.
 */
import type { Localized } from './types';

export interface HelpTopic {
  id: string;
  title: Localized<string>;
  body: Localized<string[]>;
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'welcome',
    title: {
      es: 'Qué es este escritorio',
      ca: 'Què és aquest escriptori',
      en: 'What this desktop is',
    },
    body: {
      es: [
        'Es la web personal de Nil Parra Luna disfrazada de Windows 95. El escritorio, las ventanas y las aplicaciones funcionan de verdad: puedes crear carpetas, escribir documentos, guardarlos y volver a abrirlos.',
        'Lo único que no es real es el hardware: no hay ninguna máquina virtual ni ninguna CPU emulada detrás. Todo el sistema corre en tu navegador.',
      ],
      ca: [
        'És la web personal de Nil Parra Luna disfressada de Windows 95. L’escriptori, les finestres i les aplicacions funcionen de debò: pots crear carpetes, escriure documents, desar-los i tornar-los a obrir.',
        'L’única cosa que no és real és el maquinari: no hi ha cap màquina virtual ni cap CPU emulada al darrere. Tot el sistema corre al teu navegador.',
      ],
      en: [
        'This is the personal website of Nil Parra Luna dressed up as Windows 95. The desktop, the windows and the applications really work: you can create folders, write documents, save them and open them again.',
        'The only thing that is not real is the hardware: there is no virtual machine and no emulated CPU behind it. The whole system runs in your browser.',
      ],
    },
  },
  {
    id: 'storage',
    title: {
      es: 'Dónde se guardan los archivos',
      ca: 'On es guarden els fitxers',
      en: 'Where files are stored',
    },
    body: {
      es: [
        'Los archivos del disco C: se guardan en la base de datos IndexedDB de este navegador. No se envían a ningún servidor y no se sincronizan entre dispositivos: si abres la web en otro equipo, verás el escritorio vacío.',
        'Si borras los datos del sitio (o usas el modo privado), los archivos desaparecen. Puedes exportar cualquier documento a tu equipo desde el Bloc de notas o desde el Explorador con el botón derecho.',
        'El contenido del portfolio es de solo lectura: siempre puedes volver a la versión original desde el Panel de control.',
      ],
      ca: [
        'Els fitxers del disc C: es guarden a la base de dades IndexedDB d’aquest navegador. No s’envien enlloc i no se sincronitzen entre dispositius: si obres la web en un altre equip, veuràs l’escriptori buit.',
        'Si esborres les dades del lloc (o fas servir el mode privat), els fitxers desapareixen. Pots exportar qualsevol document al teu equip des del Bloc de notes o des de l’Explorador amb el botó dret.',
        'El contingut del portfolio és de només lectura: sempre pots tornar a la versió original des del Tauler de control.',
      ],
      en: [
        'The files of drive C: are stored in this browser IndexedDB database. They are not uploaded anywhere and they do not sync across devices: opening the site on another computer shows an empty desktop.',
        'Clearing the site data (or using private mode) removes the files. You can export any document to your computer from Notepad or from Explorer with the right mouse button.',
        'Portfolio content is read only: you can always restore the original version from the Control Panel.',
      ],
    },
  },
  {
    id: 'languages',
    title: {
      es: 'Idiomas',
      ca: 'Idiomes',
      en: 'Languages',
    },
    body: {
      es: [
        'La interfaz está disponible en español, catalán e inglés. La primera vez se detecta el idioma del navegador y, si no coincide con ninguno, se usa el español.',
        'Puedes cambiarlo cuando quieras desde el Panel de control o desde la ventana de Bienvenida: el cambio es inmediato y no se pierde ningún documento abierto.',
        'Los nombres de las carpetas del sistema se traducen, pero las rutas internas no cambian nunca. Los archivos que creas tú conservan el nombre que les pusiste.',
      ],
      ca: [
        'La interfície està disponible en espanyol, català i anglès. La primera vegada es detecta l’idioma del navegador i, si no coincideix amb cap, s’usa l’espanyol.',
        'Pots canviar-lo quan vulguis des del Tauler de control o des de la finestra de Benvinguda: el canvi és immediat i no es perd cap document obert.',
        'Els noms de les carpetes del sistema es tradueixen, però les rutes internes no canvien mai. Els fitxers que crees tu conserven el nom que els vas posar.',
      ],
      en: [
        'The interface is available in Spanish, Catalan and English. On the first visit the browser language is detected and Spanish is used when it matches none of them.',
        'You can change it whenever you want from the Control Panel or from the Welcome window: the change is immediate and no open document is lost.',
        'System folder names are translated, but internal paths never change. Files you create keep the name you gave them.',
      ],
    },
  },
  {
    id: 'keyboard',
    title: {
      es: 'Teclado y accesibilidad',
      ca: 'Teclat i accessibilitat',
      en: 'Keyboard and accessibility',
    },
    body: {
      es: [
        'Tab y las flechas recorren menús, botones, listas y ventanas. Enter abre el elemento seleccionado y Escape cierra menús y diálogos.',
        'Clic derecho o la tecla de menú contextual abren las opciones de un icono o de una carpeta. Si no tienes ratón, cada ventana ofrece «Mover» y «Tamaño» en su menú de sistema (icono de la barra de título): las flechas mueven la ventana y Enter termina.',
        'Dentro de una ventana, Alt o Alt+letra abren su barra de menús; Alt+Espacio abre el menú de sistema. Los atajos del navegador y del sistema operativo no se interceptan.',
        'Los ajustes de accesibilidad (movimiento reducido y etiquetas de alto contraste) están en el Panel de control.',
      ],
      ca: [
        'Tab i les fletxes recorren menús, botons, llistes i finestres. Enter obre l’element seleccionat i Escape tanca menús i diàlegs.',
        'El botó dret o la tecla de menú contextual obren les opcions d’una icona o d’una carpeta. Si no tens ratolí, cada finestra ofereix «Mou» i «Mida» al seu menú de sistema (icona de la barra de títol): les fletxes mouen la finestra i Enter acaba.',
        'Dins d’una finestra, Alt o Alt+lletra obren la barra de menús; Alt+Espai obre el menú de sistema. Les dreceres del navegador i del sistema operatiu no s’intercepten.',
        'Els ajustos d’accessibilitat (moviment reduït i etiquetes d’alt contrast) són al Tauler de control.',
      ],
      en: [
        'Tab and the arrow keys walk through menus, buttons, lists and windows. Enter opens the selected item and Escape closes menus and dialogs.',
        'Right click or the context menu key open the options of an icon or folder. Without a mouse, every window offers “Move” and “Size” in its system menu (the title bar icon): arrows move the window and Enter finishes.',
        'Inside a window, Alt or Alt+letter open its menu bar; Alt+Space opens the system menu. Browser and operating system shortcuts are never intercepted.',
        'Accessibility settings (reduced motion and high contrast labels) live in the Control Panel.',
      ],
    },
  },
  {
    id: 'solitaire',
    title: {
      es: 'Solitario (Klondike)',
      ca: 'Solitari (Klondike)',
      en: 'Solitaire (Klondike)',
    },
    body: {
      es: [
        'El objetivo es colocar las 52 cartas en las cuatro pilas de fundación, ordenadas por palo desde el as hasta el rey.',
        'Las cartas se mueven arrastrándolas con el ratón o el dedo, o con doble clic para enviarlas directamente a su fundación. Las columnas se construyen en orden descendente y con colores alternos; una columna vacía solo acepta un rey.',
        'El mazo reparte cartas al descarte. En el menú Juego puedes elegir entre robar una o tres cartas; cuando el mazo se agota, el descarte se recicla con el coste en puntos correspondiente.',
        'Cada carta que llega a una fundación suma 10 puntos, descubrir una carta de una columna suma 5 y devolver una carta de la fundación a la mesa resta 15. Al ganar se añade una bonificación por tiempo.',
        'Desde el menú Juego también puedes empezar una partida nueva (F2), volver a repartir la misma partida, deshacer el último movimiento (Ctrl+Z) o completar automáticamente cuando ya no queden cartas boca abajo.',
      ],
      ca: [
        'L’objectiu és col·locar les 52 cartes en les quatre piles de fundació, ordenades per coll des de l’as fins al rei.',
        'Les cartes es mouen arrossegant-les amb el ratolí o el dit, o amb doble clic per enviar-les directament a la seva fundació. Les columnes es construeixen en ordre descendent i amb colors alterns; una columna buida només accepta un rei.',
        'La baralla reparteix cartes al descart. Al menú Joc pots triar entre robar una o tres cartes; quan la baralla s’esgota, el descart es recicla amb el cost en punts corresponent.',
        'Cada carta que arriba a una fundació suma 10 punts, descobrir una carta d’una columna suma 5 i tornar una carta de la fundació a la taula resta 15. En guanyar s’afegeix una bonificació per temps.',
        'Des del menú Joc també pots començar una partida nova (F2), tornar a repartir la mateixa partida, desfer l’últim moviment (Ctrl+Z) o completar automàticament quan ja no quedin cartes boca avall.',
      ],
      en: [
        'The goal is to move all 52 cards to the four foundation piles, ordered by suit from ace to king.',
        'Drag cards with the mouse or a finger, or double click to send them straight to their foundation. Columns build downwards in alternating colours; an empty column only accepts a king.',
        'The deck deals cards to the waste. In the Game menu you can choose one or three cards per draw; when the deck runs out, the waste recycles with its score cost.',
        'Every card that reaches a foundation scores 10, turning over a column card scores 5, and pulling a card back from a foundation to the table costs 15. Winning adds a time bonus.',
        'The Game menu also starts a new deal (F2), redeals the same game, undoes the last move (Ctrl+Z) or finishes automatically once no face-down cards are left.',
      ],
    },
  },
  {
    id: 'poker',
    title: {
      es: 'Póker (Texas Hold’em)',
      ca: 'Pòquer (Texas Hold’em)',
      en: 'Poker (Texas Hold’em)',
    },
    body: {
      es: [
        'El objetivo es ganar todas las fichas de la mesa. Se juega al Texas Hold’em sin límite con dinero ficticio: no hay apuestas reales, premios ni compras.',
        'Cada jugador recibe dos cartas y hay cinco comunitarias que se descubren en tres rondas: el flop (tres cartas), el turn (una) y el river (una). Gana la mejor combinación de cinco cartas, formada con las tuyas y las de la mesa.',
        'En cada ronda puedes retirarte, pasar (si nadie ha apostado), igualar la apuesta o subir. Las subidas tienen un mínimo: la última subida completa; si a alguien le queda menos, puede irse «todo» por menos cantidad y la acción no se reabre para quien ya había hablado. Cuando alguien se queda sin fichas en la mano, se crean botes laterales y cada bote se lo lleva la mejor mano entre sus aspirantes.',
        'Las ciegas son fijas (10/20) y el botón del repartidor marca quién paga la ciega pequeña en cada mano. Arriba, en el menú Juego, tienes «Partida nueva» y «Siguiente mano» (F2). La partida sigue hasta que un jugador se queda con todas las fichas.',
        'Los rivales los controla el ordenador, sin trampas: no ven tus cartas. En la mesa nueva eliges cuántos quieres, su estilo (tranquilos, variados o agresivos) y las fichas iniciales. Cada partida reparte nombres y caracteres distintos para que no se juegue siempre igual.',
        'Órdenes de manos, de menor a mayor: carta alta, pareja, doble pareja, trío, escalera, color, full, póker y escalera de color (la escalera real es la más alta). En la mesa verás el nombre de tu mano actual bajo el fieltro.',
      ],
      ca: [
        'L’objectiu és guanyar totes les fitxes de la taula. Es juga al Texas Hold’em sense límit amb diners ficticis: no hi ha apostes reals, premis ni compres.',
        'Cada jugador rep dues cartes i n’hi ha cinc de comunitàries que es descobreixen en tres rondes: el flop (tres cartes), el turn (una) i el river (una). Guanya la millor combinació de cinc cartes, formada amb les teves i les de la taula.',
        'A cada ronda pots retirar-te, passar (si ningú ha apostat), igualar l’aposta o apujar. Les apujades tenen un mínim: l’última apujada completa; si a algú li queda menys, pot anar «tot» per menys quantitat i l’acció no es reobre per a qui ja havia parlat. Quan algú es queda sense fitxes a la mà, es creen pots laterals i cada pot se’l queda la millor mà entre els seus aspirants.',
        'Les cegues són fixes (10/20) i el botó del repartidor marca qui paga la cega petita a cada mà. A dalt, al menú Joc, tens «Partida nova» i «Mà següent» (F2). La partida continua fins que un jugador es queda amb totes les fitxes.',
        'Els rivals els controla l’ordinador, sense trampes: no veuen les teves cartes. A la taula nova tries quants en vols, el seu estil (tranquils, variats o agressius) i les fitxes inicials. Cada partida reparteix noms i caràcters diferents perquè no es jugui sempre igual.',
        'Ordre de mans, de menor a major: carta alta, parella, doble parella, trio, escala, color, full, pòquer i escala de color (l’escala reial és la més alta). A la taula veuràs el nom de la teva mà actual sota el feltre.',
      ],
      en: [
        'The goal is to win every chip on the table. This is no-limit Texas Hold’em played with play money: there is no real betting, no prizes and nothing to buy.',
        'Every player gets two cards and five community cards are revealed in three rounds: the flop (three cards), the turn (one) and the river (one). The best five-card combination of your cards and the board wins.',
        'On each round you can fold, check (when nobody has bet), call or raise. Raises have a minimum: the last full raise; a player with fewer chips may go all in for less and that does not reopen the action for those who already acted. When someone runs out of chips in a hand, side pots appear and each pot goes to the best hand among its contenders.',
        'Blinds are fixed (10/20) and the dealer button decides who posts the small blind each hand. The Game menu holds “New match” and “Next hand” (F2). The match runs until one player holds every chip.',
        'Rivals are controlled by the computer and never cheat: they cannot see your cards. In the lobby you choose how many you want, their style (calm, mixed or wild) and the starting chips. Every match deals fresh names and characters, so no two games feel the same.',
        'Hand ranking, from lowest to highest: high card, pair, two pair, three of a kind, straight, flush, full house, four of a kind and straight flush (a royal flush is the highest). The table shows the name of your current hand under the felt.',
      ],
    },
  },
  {
    id: 'credits',
    title: {
      es: 'Créditos y licencias',
      ca: 'Crèdits i llicències',
      en: 'Credits and licences',
    },
    body: {
      es: [
        'Este proyecto es un homenaje no oficial y no está afiliado a Microsoft. Windows es una marca registrada de Microsoft Corporation y aquí solo se usa para describir el estilo de la recreación.',
        'El código fuente y los recursos creados específicamente para este repositorio se publican bajo la licencia MIT, salvo que se indique lo contrario. Los logotipos de centros, empresas y proyectos, las marcas de las herramientas y los fondos de escritorio de Windows 95 son recursos de terceros o materiales archivados: pertenecen a sus titulares y conservan sus propias condiciones.',
        'Los iconos, los cursores, las cartas y los sonidos generados por los scripts del repositorio son obra propia. El puntero clásico sigue el de JS Paint (licencia MIT).',
        'La tipografía MS Sans Serif procede del proyecto React95. Sus condiciones y atribuciones se documentan en src/assets/fonts/README.md.',
        'Consulta los README de public/education, public/experience, public/portfolio y public/wallpapers/windows95 para ver el origen y las condiciones de los recursos de terceros.',
      ],
      ca: [
        'Aquest projecte és un homenatge no oficial i no està afiliat a Microsoft. Windows és una marca registrada de Microsoft Corporation i aquí només s’utilitza per descriure l’estil de la recreació.',
        'El codi font i els recursos creats específicament per a aquest repositori es publiquen amb llicència MIT, tret que s’indiqui el contrari. Els logotips de centres, empreses i projectes, les marques de les eines i els fons d’escriptori de Windows 95 són recursos de tercers o materials arxivats: pertanyen als seus titulars i conserven les seves pròpies condicions.',
        'Les icones, els cursors, les cartes i els sons generats pels scripts del repositori són obra pròpia. El punter clàssic segueix el de JS Paint (llicència MIT).',
        'La tipografia MS Sans Serif prové del projecte React95. Les seves condicions i atribucions es documenten a src/assets/fonts/README.md.',
        'Consulta els README de public/education, public/experience, public/portfolio i public/wallpapers/windows95 per veure l’origen i les condicions dels recursos de tercers.',
      ],
      en: [
        'This project is an unofficial homage and is not affiliated with Microsoft. Windows is a registered trademark of Microsoft Corporation and is only used here to describe the style of the recreation.',
        'The source code and resources created specifically for this repository are released under the MIT licence unless stated otherwise. School, company and project logos, tool marks and the Windows 95 desktop wallpapers are third-party resources or archived material: they belong to their respective owners and keep their own terms.',
        'The icons, cursors, cards and sounds generated by the repository scripts are original work. The classic pointer follows the one in JS Paint (MIT licence).',
        'The MS Sans Serif typeface comes from the React95 project. Its terms and attribution are documented in src/assets/fonts/README.md.',
        'See the README files in public/education, public/experience, public/portfolio and public/wallpapers/windows95 for the source and terms of third-party resources.',
      ],
    },
  },
];

export function findHelpTopic(id: string): HelpTopic | undefined {
  return HELP_TOPICS.find((topic) => topic.id === id);
}
