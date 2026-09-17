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
    id: 'credits',
    title: {
      es: 'Créditos, licencias y sustituciones',
      ca: 'Crèdits, llicències i substitucions',
      en: 'Credits, licences and substitutions',
    },
    body: {
      es: [
        'Este proyecto es un homenaje no oficial y no está afiliado a Microsoft. Windows es una marca registrada de Microsoft Corporation y aquí solo se usa para describir de qué estilo es la recreación.',
        'No se redistribuye ningún recurso original de Microsoft: los iconos, los cursores, los fondos y los sonidos de este sitio se han creado desde cero para el proyecto y su código fuente está en el repositorio.',
        'Los recursos de Microsoft (iconos, sonidos e imágenes del sistema original) se han sustituido por equivalentes propios. Las fuentes tipográficas son las del sistema del visitante, no se descarga ninguna fuente de Microsoft.',
        'El código del proyecto se publica bajo licencia MIT; consulta el archivo LICENSE y la sección de créditos del README.',
      ],
      ca: [
        'Aquest projecte és un homenatge no oficial i no està afiliat a Microsoft. Windows és una marca registrada de Microsoft Corporation i aquí només s’usa per descriure de quin estil és la recreació.',
        'No es redistribueix cap recurs original de Microsoft: les icones, els cursors, els fons i els sons d’aquest lloc s’han creat des de zero per al projecte i el seu codi font és al repositori.',
        'Els recursos de Microsoft (icones, sons i imatges del sistema original) s’han substituït per equivalents propis. Les fonts tipogràfiques són les del sistema del visitant, no es descarrega cap font de Microsoft.',
        'El codi del projecte es publica sota llicència MIT; consulta l’arxiu LICENSE i la secció de crèdits del README.',
      ],
      en: [
        'This project is an unofficial homage and is not affiliated with Microsoft. Windows is a trademark of Microsoft Corporation and it is only used here to describe the style of the recreation.',
        'No original Microsoft asset is redistributed: the icons, cursors, wallpapers and sounds of this site were created from scratch for the project and their source lives in the repository.',
        'Microsoft assets (icons, sounds and images of the original system) have been replaced by our own equivalents. The typefaces come from the visitor system; no Microsoft font is downloaded.',
        'The source code is released under the MIT licence; see the LICENSE file and the credits section of the README.',
      ],
    },
  },
];

export function findHelpTopic(id: string): HelpTopic | undefined {
  return HELP_TOPICS.find((topic) => topic.id === id);
}
