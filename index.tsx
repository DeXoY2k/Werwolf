
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

type AppMode = 'splash' | 'menu' | 'spielleiter' | 'spieler' | 'statistik';
type GamePhase = 'player_count' | 'name_entry' | 'role_selection' | 'role_assignment' | 'greis_group_selection' | 'pre_night' | 'pre_night_result' | 'night' | 'night_result' | 'day_discussion' | 'captain_selection' | 'nomination' | 'voting' | 'lynch_result' | 'game_over' | 'hunter_action' | 'captain_transfer' | 'scapegoat_action' | 'ergebene_magd_action';

type Team = 'Dorf' | 'Wolf' | 'Neutral' | 'Teamwechsler';

interface Character {
  name: string;
  team: Team;
  nightOrder: number | null;
  maxInGame: number;
  canHaveMultiple: boolean;
  description: string;
  groupSize?: number;
  oneTimeAction?: boolean;
  actionType?: 'target_one' | 'target_two' | 'protect' | 'see_role' | 'infect' | 'bewitch' | null;
  tips?: string;
}

// Extensive new character list based on user request with detailed descriptions and tips
const ALL_CHARACTERS: Character[] = [
    { name: 'Dorfbewohner', team: 'Dorf', nightOrder: null, maxInGame: 13, canHaveMultiple: true, description: 'Der Dorfbewohner ist das Herz der Gemeinschaft. Er hat keine besonderen Fähigkeiten und muss sich voll und ganz auf seine Menschenkenntnis und Überzeugungskraft verlassen, um die Werwölfe zu enttarnen.', tips: 'Deine Stimme ist deine Waffe. Sei aktiv in den Diskussionen, stelle kritische Fragen und achte auf Widersprüche. Versuche, Allianzen mit Spielern zu bilden, denen du vertraust. Deine Macht liegt in der Masse, also überzeuge andere von deinen Verdachtsmomenten.' },
    { name: 'Werwolf', team: 'Wolf', nightOrder: 6, maxInGame: 4, canHaveMultiple: true, description: 'Nachts erwachen die Werwölfe, erkennen einander und wählen gemeinsam ein Opfer, das sie aus dem Spiel entfernen. Tagsüber geben sie sich als unschuldige Dorfbewohner aus.', actionType: 'target_one', tips: 'Koordination ist alles. Sprecht euch leise ab, wer das Ziel sein soll. Tagsüber solltet ihr geschlossen auftreten, aber nicht zu einstimmig, um nicht aufzufallen. Lenkt den Verdacht geschickt auf laute oder stille Spieler. Ein gut platzierter Angriff auf einen vermeintlichen Verbündeten kann Wunder wirken, um eure Tarnung zu wahren.' },
    { name: 'Hexe', team: 'Dorf', nightOrder: 8, maxInGame: 1, canHaveMultiple: false, description: 'Die Hexe besitzt zwei mächtige Tränke: einen Heiltrank, um ein Opfer der Werwölfe (auch sich selbst) zu retten, und einen Gifttrank, um einen beliebigen Spieler zu töten. Jeder Trank kann nur einmal pro Spiel verwendet werden.', actionType: 'target_one', tips: 'Deine Tränke können den Spielverlauf entscheiden. Nutze den Heiltrank nicht vorschnell für einen unbekannten Spieler. Warte, bis eine wichtige Rolle wie die Seherin in Gefahr ist. Der Gifttrank ist ideal, um einen enttarnten Werwolf auszuschalten, ohne eine öffentliche Abstimmung zu riskieren. Sei dir bewusst: Nach dem Einsatz deiner Tränke bist du eine normale Dorfbewohnerin.' },
    { name: 'Seherin', team: 'Dorf', nightOrder: 4, maxInGame: 1, canHaveMultiple: false, description: 'Jede Nacht erwacht die Seherin und darf die wahre Identität eines Spielers aufdecken. Der Spielleiter zeigt ihr die Charakterkarte des gewählten Spielers.', actionType: 'see_role', tips: 'Du bist die wichtigste Informationsquelle des Dorfes. Aber Vorsicht: Sobald die Wölfe wissen, wer du bist, bist du ihr nächstes Ziel. Kommuniziere dein Wissen subtil. Verteidige Spieler, die du als "gut" erkannt hast, und leite den Verdacht geschickt auf die "bösen". Offenbare dich nur, wenn es absolut notwendig ist.' },
    { name: 'Amor', team: 'Dorf', nightOrder: 1, maxInGame: 1, canHaveMultiple: false, description: 'Amor schießt in der ersten Nacht seine Liebespfeile auf zwei beliebige Spieler (er kann auch sich selbst wählen). Diese beiden sind fortan unsterblich ineinander verliebt. Stirbt einer, stirbt der andere aus Kummer mit. Ihr Ziel ist es, gemeinsam zu überleben.', oneTimeAction: true, actionType: 'target_two', tips: 'Deine Wahl ist eine der folgenreichsten im ganzen Spiel. Ein Liebespaar aus Dorfbewohner und Werwolf bildet eine dritte Partei, die nur für sich selbst spielt und gegen alle anderen gewinnen muss. Das sorgt für Chaos und Spannung. Wähle weise!' },
    { name: 'Jäger', team: 'Dorf', nightOrder: null, maxInGame: 1, canHaveMultiple: false, description: 'Wenn der Jäger stirbt – egal ob durch die Wölfe oder das Dorf – feuert er einen letzten Schuss ab und reißt einen Spieler seiner Wahl mit in den Tod.', tips: 'Deine Fähigkeit ist eine letzte Rache. Wenn du stirbst, kannst du einen sicheren Werwolf mitnehmen. Du kannst sogar bluffen und die Dorfbewohner dazu provozieren, dich zu lynchen, wenn du dir bei einem Verdacht absolut sicher bist. Deine Drohung allein kann die Werwölfe schon einschüchtern.' },
    { name: 'Dieb', team: 'Teamwechsler', nightOrder: 0, maxInGame: 1, canHaveMultiple: false, description: 'Zu Beginn des Spiels liegen zwei zusätzliche Rollenkarten in der Mitte. Der Dieb darf sich diese ansehen und seine eigene Karte gegen eine der beiden tauschen. Lehnt er ab, bleibt er Dieb (und ist quasi Dorfbewohner). Liegen zwei Werwolfkarten, muss er tauschen.', oneTimeAction: true, tips: 'Deine Wahl zu Beginn bestimmt dein Schicksal. Du hast die Chance, eine mächtige Rolle zu ergattern. Ein Tausch zur Seherin oder zum Werwolf kann sehr verlockend sein. Wähle die Rolle, die am besten zu deinem Spielstil passt oder dem Dorf am meisten nützt.' },
    { name: 'Mädchen', team: 'Dorf', nightOrder: 5, maxInGame: 1, canHaveMultiple: false, description: 'Das kleine Mädchen ist neugierig und darf während der Werwolf-Phase heimlich durch die Finger blinzeln, um zu sehen, wer die Werwölfe sind. Wird sie dabei erwischt, stirbt sie sofort.', tips: 'Hohes Risiko, hohe Belohnung. Wenn du es schaffst, die Wölfe unbemerkt zu identifizieren, ist dein Wissen Gold wert. Aber sei extrem vorsichtig. Ein kleines Geräusch oder eine zu auffällige Bewegung kann dein Todesurteil sein. Teile dein Wissen nur mit absolut vertrauenswürdigen Spielern.' },
    { name: 'Heiler', team: 'Dorf', nightOrder: 3, maxInGame: 1, canHaveMultiple: false, description: 'Jede Nacht wählt der Heiler einen Spieler aus, den er vor dem Angriff der Werwölfe beschützt. Er kann sich auch selbst schützen, darf aber niemals zwei Nächte hintereinander dieselbe Person wählen.', actionType: 'protect', tips: 'Du bist der Leibwächter des Dorfes. Versuche herauszufinden, wer die wichtigen Rollen (wie die Seherin) sind, und beschütze sie. Dich selbst in der ersten Nacht zu schützen ist oft eine sichere Strategie. Variiere deine Ziele, um nicht berechenbar zu sein.' },
    { name: 'Hauptmann', team: 'Dorf', nightOrder: null, maxInGame: 1, canHaveMultiple: false, description: 'Eine öffentliche Zusatzrolle, die durch Wahl bestimmt wird. Die Stimme des Hauptmanns zählt bei Abstimmungen doppelt. Stirbt der Hauptmann, bestimmt er im letzten Atemzug seinen Nachfolger.', tips: 'Du bist der Anführer. Leite die Diskussionen, fasse Argumente zusammen und sorge für Ordnung. Deine doppelte Stimme kann bei knappen Entscheidungen den Ausschlag geben. Nutze diese Macht weise und versuche, das Vertrauen des Dorfes zu gewinnen und zu behalten.' },
    { name: 'Flötenspieler', team: 'Neutral', nightOrder: 10, maxInGame: 1, canHaveMultiple: false, description: 'Der Flötenspieler ist eine eigene Partei. Jede Nacht verzaubert er zwei Spieler. Sein Ziel ist es, zu gewinnen, indem er alle noch lebenden Spieler gleichzeitig verzaubert hat.', actionType: 'bewitch', tips: 'Du spielst ein Spiel im Spiel. Bleibe unauffällig und tue so, als wärst du ein einfacher Dorfbewohner. Verzaubere Spieler aus allen Lagern (Dorf und Wölfe), um maximales Misstrauen zu säen. Niemand darf ahnen, dass eine unsichtbare Bedrohung das ganze Dorf in ihren Bann zieht.' },
    { name: 'Der Alte', team: 'Dorf', nightOrder: null, maxInGame: 1, canHaveMultiple: false, description: 'Aufgrund seiner Zähigkeit überlebt der Alte den ersten Angriff der Werwölfe. Wird er jedoch vom Dorf gelyncht, vom Jäger erschossen oder von der Hexe vergiftet, verliert das gesamte Dorf vor Schreck alle Sonderfähigkeiten.' },
    { name: 'Sündenbock', team: 'Dorf', nightOrder: null, maxInGame: 1, canHaveMultiple: false, description: 'Kommt es bei einer Abstimmung zu einem Unentschieden, stirbt automatisch der Sündenbock anstelle der beiden an den Pranger gestellten Spieler. Als letzte Amtshandlung darf er bestimmen, welche Spieler am nächsten Tag wählen dürfen.' },
    { name: 'Dorfdepp', team: 'Dorf', nightOrder: null, maxInGame: 1, canHaveMultiple: false, description: 'Wird der Dorfdepp vom Dorfgericht zum Tode verurteilt, erkennen alle seinen Fauxpas und er überlebt. Allerdings verliert er für den Rest des Spiels sein Stimmrecht.' },
    { name: 'Urwolf', team: 'Wolf', nightOrder: 7, maxInGame: 1, canHaveMultiple: false, description: 'Der Urwolf kann einmal pro Spiel, anstatt ein Opfer zu fressen, dieses stattdessen infizieren und in einen Werwolf verwandeln.', oneTimeAction: true, actionType: 'infect', tips: 'Stärke dein Rudel! Verwandle einen Spieler, der intelligent argumentiert oder bereits das Vertrauen des Dorfes hat. Ein starker Verbündeter, der mitten im Spiel die Seiten wechselt, ist eine unaufhaltbare Waffe.' },
    { name: 'Weißer Werwolf', team: 'Neutral', nightOrder: 9, maxInGame: 1, canHaveMultiple: false, description: 'Er erwacht mit den normalen Werwölfen, verfolgt aber sein eigenes Ziel: als Einziger zu überleben. Dafür erwacht er jede zweite Nacht allein und darf einen anderen Werwolf töten.', actionType: 'target_one', tips: 'Du bist der ultimative Verräter. Spiele tagsüber mit den Wölfen, aber nachts eliminierst du sie heimlich. Dein Ziel ist es, am Ende als einziger Überlebender dazustehen. Das erfordert ein Höchstmaß an Täuschung und strategischer Weitsicht.'},
    { name: 'Wildes Kind', team: 'Teamwechsler', nightOrder: 2, maxInGame: 1, canHaveMultiple: false, description: 'Am Anfang des Spiels wählt das Wilde Kind ein Vorbild. Solange dieses Vorbild lebt, ist es ein normaler Dorfbewohner. Stirbt das Vorbild jedoch, wird das Kind aus Rache zum Werwolf und schließt sich dem Rudel an.', oneTimeAction: true, actionType: 'target_one', tips: 'Wähle dein Vorbild clever. Ein starker Spieler, der wahrscheinlich lange überlebt? Oder ein schwacher, damit du schnell zum Wolf wirst? Deine Loyalität kann sich jederzeit ändern.'},
    { name: 'Zwei Schwestern', team: 'Dorf', nightOrder: 1.1, maxInGame: 1, canHaveMultiple: false, groupSize: 2, description: 'Die zwei Schwestern sind normale Dorfbewohnerinnen, die sich aber in der ersten Nacht erkennen und somit von Anfang an eine vertrauenswürdige Verbündete haben.', oneTimeAction: true, tips: 'Ihr seid ein starkes Duo. Ihr könnt euch gegenseitig in Abstimmungen schützen und Informationen austauschen. Aber seid vorsichtig, wenn ihr zu offensichtlich zusammenhaltet, macht ihr euch verdächtig.' },
    { name: 'Drei Brüder', team: 'Dorf', nightOrder: 1.2, maxInGame: 1, canHaveMultiple: false, groupSize: 3, description: 'Die drei Brüder sind normale Dorfbewohner, die sich in der ersten Nacht erkennen. Sie bilden von Beginn an eine starke und vertrauenswürdige Fraktion innerhalb des Dorfes.', oneTimeAction: true, tips: 'Als Trio habt ihr eine enorme Macht bei Abstimmungen. Koordiniert eure Stimmen, um gezielt Verdächtige anzugreifen. Euer Zusammenhalt ist eure größte Stärke.' },
    { name: 'Großer böser Wolf', team: 'Wolf', nightOrder: 6.1, maxInGame: 1, canHaveMultiple: false, description: 'Der große böse Wolf ist ein Wolf, der in der Nacht zweimal tötet. Er einigt sich zunächst mit den anderen Wölfen auf ein Opfer, dann wählt er sich allein ein zweites Opfer. Diese Rolle ist bei großen Gruppen geeignet oder für schnelle Runden. Der große böse Wolf verliert seine Macht, sobald ein Spieler aus dem Team der Werwölfe gestorben ist.', actionType: 'target_one', tips: 'Nutze deine Fähigkeit, um schnell wichtige Ziele auszuschalten. Aber sei vorsichtig, wenn einer deiner Wolfskameraden stirbt, bist du nur noch ein normaler Wolf.' },
    { name: 'Wolfshund', team: 'Teamwechsler', nightOrder: 0.1, maxInGame: 1, canHaveMultiple: false, description: 'Wenn er vom Spielleiter aufgerufen wird, kann er entscheiden, ob er zum Werwolf werden oder Dorfbewohner bleiben möchte. Seine Wahl wird auch nach seinem Tod nicht bekannt werden.', oneTimeAction: true, actionType: null, tips: 'Deine Entscheidung prägt das ganze Spiel. Willst du dem Dorf helfen oder mit den Wölfen jagen? Deine Tarnung ist perfekt, niemand wird deine wahre Gesinnung erfahren.' },
    { name: 'Reine Seele', team: 'Dorf', nightOrder: null, maxInGame: 1, canHaveMultiple: false, description: 'Die reine Seele ist die einzig offen gespielte Identität, deren Rollekarte auf beiden Seiten das Bild eines normalen Dorfbewohner zeigt. Die Person mit dieser Rolle hat zwar dementsprechend keine Sonderfähigkeiten, verkörpert aber dafür einen eindeutig verifizierten Guten und ist damit eine sichere Option bei der Wahl des Hauptmannes oder Büttels.', actionType: null, tips: 'Du bist der Leuchtturm der Wahrheit im Dorf. Dein Wort hat Gewicht. Nutze dein Vertrauen, um das Dorf zu einen und die Wölfe zu entlarven. Aber Vorsicht, diese Offenheit macht dich auch zu einem klaren Ziel.' },
    { name: 'Engel', team: 'Neutral', nightOrder: null, maxInGame: 1, canHaveMultiple: false, description: 'Wenn er in der Abstimmung der ersten Runde eliminiert wird (nicht von den Werwölfen), gewinnt er das Spiel allein. Schafft er das nicht, gewinnt er zusammen mit den Dorfbewohnern.', actionType: null, tips: 'Deine erste Mission ist es, dich verdächtig zu machen, aber nicht zu sehr. Ein früher, erfolgreicher Lynch macht dich zum alleinigen Sieger. Scheiterst du, musst du dein Verhalten komplett ändern und dem Dorf zum Sieg verhelfen.' },
    { name: 'Fuchs', team: 'Dorf', nightOrder: 4.1, maxInGame: 1, canHaveMultiple: false, description: 'Wenn er in der Nacht aufgerufen wird, wählt er einen Spieler aus und erfährt vom Spielleiter, ob dieser oder einer seiner beiden Nachbarn ein Werwolf ist oder nicht. Ist bei dem Trio mindestens ein Werwolf dabei, darf er es in der nächsten Nacht ein weiteres Mal versuchen. Ist aber keiner der drei ein Werwolf, verliert er seine Fähigkeit.', actionType: 'see_role', tips: 'Deine Fähigkeit ist eine gute Mischung aus Information und Risiko. Wähle eine Gruppe von drei Spielern, die verdächtig sind. Ein Treffer gibt dir wertvolle Informationen, aber eine Niete macht dich zu einem normalen Dorfbewohner.' },
    { name: 'Ergebene Magd', team: 'Teamwechsler', nightOrder: null, maxInGame: 1, canHaveMultiple: false, description: 'Die Magd opfert sich für andere Rollen. Der Spieler der ergebenen Magd kann sich einmalig als Magd offenbaren und seine Karte offenlegen, um die Karte eines anderen Spielers an sich zu nehmen, in dem Moment, in dem dieser per Abstimmung aus dem Spiel ausscheidet. Der Spieler der Magd übernimmt damit dessen Rolle. Dies muss geschehen, bevor die Karte des ausscheidenden Spielers offengelegt wird und die Rolle wird auch bei der Übernahme nicht offenbart. Übernimmt die Magd eine Rolle mit Spezialfähigkeiten, so werden diese zurückgesetzt. Die Magd kann nicht die Rolle des Jägers übernehmen. Ist die Magd durch Amor verliebt worden, verliert sie ihre Fähigkeit, andere Rollen zu übernehmen, vollständig.', oneTimeAction: true, actionType: null, tips: 'Dein Opfer kann das Spiel wenden. Rette eine wichtige Rolle wie die Seherin oder die Hexe vor dem Tod, indem du ihren Platz einnimmst. Dein Timing muss perfekt sein.' },
    { name: 'Bärenführer', team: 'Dorf', nightOrder: null, maxInGame: 1, canHaveMultiple: false, description: 'Wenn sich der Bärenführer am Morgen in seiner Sitzposition unmittelbar neben einem Werwolf befindet (ausgeschiedene Spieler werden ignoriert), zeigt der Spielleiter dies durch ein Bärenknurren. Ist der Bärenführer vom Urwolf infiziert, knurrt der Spielleiter jeden Morgen, bis der Bärenführer aus dem Spiel ausscheidet.', actionType: null, tips: 'Deine Fähigkeit hängt von der Sitzordnung ab. Achte genau auf die Reaktionen deiner Nachbarn, wenn der Spielleiter knurrt. Es ist ein starker, aber situativer Hinweis.' },
    { name: 'Ritter mit dem verrosteten Schwert', team: 'Dorf', nightOrder: null, maxInGame: 1, canHaveMultiple: false, description: 'Der Ritter infiziert mit seinem rostigen Schwert den Werwolf zu seiner Linken mit Tetanus, wenn er von ihnen in der Nacht gefressen wird. Dieser Werwolf stirbt dann in der folgenden Nacht. Entsprechend sind alle Spieler zwischen ihm und dem toten Wolf freigesprochen.', actionType: null, tips: 'Dein Tod kann eine mächtige Waffe sein. Die Wölfe werden es sich zweimal überlegen, dich anzugreifen. Dein Tod gibt dem Dorf eine fast sichere Information über einen Werwolf.' },
    { name: 'Verbitterter Greis', team: 'Neutral', nightOrder: null, maxInGame: 1, canHaveMultiple: false, description: 'Zu Beginn teilt der Spielleiter anhand eines offensichtlich einsehbaren, binären Kriteriums das Dorf in zwei Gruppen (z. B. Brille/keine Brille, Bart/kein Bart, größer als 170 cm/kleiner als 170 cm, Geschlecht) – der Greis gehört dann zu einer der beiden Gruppen. Sein Ziel, um das Spiel alleine zu gewinnen, ist es die andere Gruppe komplett zu beseitigen. Wie der weiße Werwolf profitiert auch diese Rolle davon, möglicherweise im Spiel zu sein.', actionType: null, tips: 'Du bist ein Meister der Manipulation. Säe Zwietracht zwischen den beiden Gruppen und spiele sie gegeneinander aus. Dein Ziel ist es, unbemerkt die eine Hälfte des Dorfes auszulöschen.' },
    { name: 'Gaukler', team: 'Dorf', nightOrder: 2.5, maxInGame: 1, canHaveMultiple: false, description: 'Der Spielleiter wählt vor dem Start drei zusätzliche Rollen aus, die er offen in die Mitte legt. Zu Beginn jeder Nacht wählt sich der Schauspieler eine dieser Rollen aus und spielt sie bis zur folgenden Nacht. Dies wiederholt er solange, bis es keine Rollen mehr zur Auswahl gibt und er zum normalen Dorfbewohner wird.', actionType: null, tips: 'Deine Flexibilität ist deine Stärke. Passe dich jeder Situation an. Bist du heute die Seherin? Oder der Heiler? Deine wechselnden Fähigkeiten können die Wölfe zur Verzweiflung bringen.' },
    { name: 'Stotternder Richter', team: 'Dorf', nightOrder: null, maxInGame: 1, canHaveMultiple: false, oneTimeAction: true, description: 'Der Spielleiter und der Richter einigen sich in der ersten Nacht auf ein Zeichen. Wenn der Richter nach der regulären Abstimmung des Dorfes und dem Tod eines Spielers dieses Zeichen gibt, führt der Spielleiter sofort noch eine Abstimmung ohne erneute Diskussion durch.', actionType: null, tips: 'Nutze deine Macht, um einen kritischen Moment zu erzwingen. Wenn du das Gefühl hast, das Dorf ist auf der falschen Fährte oder ein zweiter Wolf ist fast enttarnt, kannst du eine zweite Abstimmung erzwingen und das Blatt wenden.' },
];

interface Player {
    id: string;
    name: string;
    role: Character | null;
    isAlive: boolean;
    canVote: boolean;
}

interface NightAction {
    actorIds: string[];
    roleName: string;
    targetIds: string[];
    actionType?: 'target_one' | 'target_two' | 'protect' | 'see_role' | 'infect' | 'bewitch' | null;
    actionSubType?: 'heal' | 'poison' | 'dorf' | 'wolf';
}

interface GameLogEntry {
    round: number | string;
    type: 'night' | 'day' | 'pre_night';
    events: string[];
}

interface NightResult {
    summary: string;
    details: string[];
    deadPlayerIds: string[];
}

interface PlayerStats {
    [playerName: string]: {
        [roleName: string]: number;
    };
}

interface GameStats {
    totalGames: number;
    playerStats: PlayerStats;
}

const App = () => {
    // App-level state
    const [appMode, setAppMode] = useState<AppMode>('splash');
    const [viewingRole, setViewingRole] = useState<Character | null>(null);
    const [viewingLog, setViewingLog] = useState(false);
    const [stats, setStats] = useState<GameStats>({ totalGames: 0, playerStats: {} });
    const [isGmOverlayVisible, setIsGmOverlayVisible] = useState(false);


    // Game-level state
    const [gamePhase, setGamePhase] = useState<GamePhase>('player_count');
    const [playerCount, setPlayerCount] = useState(5);
    const [players, setPlayers] = useState<Player[]>([]);
    
    const [selectedRoles, setSelectedRoles] = useState<Record<string, number>>({});
    const [roleAssignments, setRoleAssignments] = useState<Record<string, string | string[]>>({});
    
    const [nightStep, setNightStep] = useState(0);
    const [nightCount, setNightCount] = useState(1);
    
    // Game Logic State
    const [witchPotions, setWitchPotions] = useState({ heal: true, poison: true });
    const [completedOneTimeActions, setCompletedOneTimeActions] = useState<Set<string>>(new Set());
    const [lovers, setLovers] = useState<[string, string] | null>(null);
    const [lastProtectedPlayer, setLastProtectedPlayer] = useState<string | null>(null);
    const [nightActions, setNightActions] = useState<NightAction[]>([]);
    const [nightResult, setNightResult] = useState<NightResult | null>(null);
    const [gameLog, setGameLog] = useState<GameLogEntry[]>([]);
    const [captainId, setCaptainId] = useState<string | null>(null);
    const [dorfdeppRevealedId, setDorfdeppRevealedId] = useState<string | null>(null);
    const [nominatedPlayerIds, setNominatedPlayerIds] = useState<string[]>([]);
    const [currentVoteIndex, setCurrentVoteIndex] = useState(0);
    const [votes, setVotes] = useState<Record<string, Set<string>>>({});
    const [lynchResult, setLynchResult] = useState<{message: string, deadPlayerIds: string[]}>({message: '', deadPlayerIds: []});
    const [enchantedPlayerIds, setEnchantedPlayerIds] = useState<Set<string>>(new Set());
    const [gameOver, setGameOver] = useState<{ isOver: boolean; message: string } | null>(null);
    const [isRunOffVote, setIsRunOffVote] = useState(false);
    const [playerToTakeHunterShot, setPlayerToTakeHunterShot] = useState<{playerId: string, source: 'night' | 'day'} | null>(null);
    const [derAlteAttacked, setDerAlteAttacked] = useState(false);
    const [wildChildModelId, setWildChildModelId] = useState<string | null>(null);
    const [thiefExtraRoles, setThiefExtraRoles] = useState<Character[]>([]);
    const [areDorfPowersDisabled, setAreDorfPowersDisabled] = useState(false);
    const [playerToElectCaptain, setPlayerToElectCaptain] = useState<{ id: string, source: 'night' | 'day' } | null>(null);
    const [scapegoatPunisherId, setScapegoatPunisherId] = useState<string | null>(null);
    const [scapegoatSelectedVoters, setScapegoatSelectedVoters] = useState<string[]>([]);
    const [ergebeneMagdAction, setErgebeneMagdAction] = useState<{ lynchedPlayerId: string; magdPlayerId: string } | null>(null);
    const [tetanusVictim, setTetanusVictim] = useState<{ id: string; nightToDie: number } | null>(null);
    const [gauklerRepertoire, setGauklerRepertoire] = useState<Character[]>([]);
    const [gauklerRepertoireSelection, setGauklerRepertoireSelection] = useState<string[]>([]);
    const [gauklerChosenRoleForNight, setGauklerChosenRoleForNight] = useState<Character | null>(null);
    const [greisGroups, setGreisGroups] = useState<{ groupA: string[], groupB: string[] }>({ groupA: [], groupB: [] });
    const [isJudgeSecondVote, setIsJudgeSecondVote] = useState(false);
    const [bearGrowl, setBearGrowl] = useState(false);
    const [hunterShotTarget, setHunterShotTarget] = useState('');
    const [newCaptainTarget, setNewCaptainTarget] = useState('');


    // Day Timer
    const [timerDuration, setTimerDuration] = useState(180);
    const [timeLeft, setTimeLeft] = useState(timerDuration);
    const [isTimerRunning, setIsTimerRunning] = useState(false);

    // Night action state
    const [actionTarget1, setActionTarget1] = useState<string>('');
    const [actionTarget2, setActionTarget2] = useState<string>('');
    const [witchHealTarget, setWitchHealTarget] = useState<string>('');
    const [witchPoisonTarget, setWitchPoisonTarget] = useState<string>('');
    const [wolfsHundChoice, setWolfsHundChoice] = useState<'dorf' | 'wolf' | ''>('');
    
    // Load stats from localStorage on initial render
    useEffect(() => {
        try {
            const storedStats = localStorage.getItem('werwolfStats');
            if (storedStats) {
                setStats(JSON.parse(storedStats));
            }
        } catch (error) {
            console.error("Could not load stats from localStorage", error);
        }
    }, []);
    
    const nightPlayers = useMemo(() => {
        if (gauklerChosenRoleForNight) {
            const gauklerPlayer = players.find(p => p.role?.name === 'Gaukler' && p.isAlive);
            if (gauklerPlayer) {
                return players.map(p => p.id === gauklerPlayer.id ? { ...p, role: gauklerChosenRoleForNight } : p);
            }
        }
        return players;
    }, [players, gauklerChosenRoleForNight]);


    const preNightOrderCharacters = useMemo(() => {
       const activeRoles = new Map<string, Character>();
        players.forEach(p => {
            if (p.isAlive && p.role && p.role.oneTimeAction && p.role.nightOrder !== null && p.role.nightOrder < 3) {
                 if (!completedOneTimeActions.has(p.role.name)) {
                     activeRoles.set(p.role.name, p.role);
                 }
            }
        });
        return Array.from(activeRoles.values()).sort((a, b) => a.nightOrder! - b.nightOrder!);
    }, [players, completedOneTimeActions]);

    const nightOrderCharacters = useMemo(() => {
        const activeRoles = new Map<string, Character>();
        const isWolfDead = nightPlayers.some(p => p.role?.team === 'Wolf' && !p.isAlive);

        nightPlayers.forEach(p => {
            if (p.isAlive && p.role && p.role.nightOrder !== null && p.role.nightOrder >= 3) {
                if (p.role.name === 'Weißer Werwolf' && nightCount % 2 !== 0) return;
                
                // Gaukler handling: his chosen role is now his real role for the night
                const originalPlayer = players.find(origP => origP.id === p.id);
                if (originalPlayer?.role?.name === 'Gaukler') {
                    // Always allow Gaukler to act as his chosen role for the night
                } else if (p.role.oneTimeAction && completedOneTimeActions.has(p.role.name)) {
                    return;
                }

                if (p.role.name === 'Großer böser Wolf' && isWolfDead) return;
                if (areDorfPowersDisabled && p.role.team === 'Dorf' && originalPlayer?.role?.name !== 'Gaukler') return;
                
                activeRoles.set(p.role.name, p.role);
            }
        });
        return Array.from(activeRoles.values()).sort((a, b) => a.nightOrder! - b.nightOrder!);
    }, [nightPlayers, players, nightCount, completedOneTimeActions, areDorfPowersDisabled]);
    
    const livingPlayers = useMemo(() => players.filter(p => p.isAlive), [players]);
    const voters = useMemo(() => livingPlayers.filter(p => p.canVote), [livingPlayers]);

    const groupedRoles = useMemo(() => {
        const groups: { [key in Team]?: Character[] } = {};
        ALL_CHARACTERS.forEach(char => {
            const team = char.team === 'Teamwechsler' ? 'Neutral' : char.team;
            if (!groups[team]) {
                groups[team] = [];
            }
            groups[team]!.push(char);
        });
        
        for (const key in groups) {
            (groups as any)[key].sort((a: Character, b: Character) => a.name.localeCompare(b.name));
        }
        return {
          'Dorf': groups['Dorf'] || [],
          'Wolf': groups['Wolf'] || [],
          'Neutral': groups['Neutral'] || [],
        };
    }, []);

    const totalSelectedSlots = useMemo(() => {
        return Object.entries(selectedRoles).reduce((sum, [roleName, count]) => {
            const char = ALL_CHARACTERS.find(c => c.name === roleName);
            const groupSize = char?.groupSize || 1;
            return sum + (count * groupSize);
        }, 0);
    }, [selectedRoles]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;
        if (isTimerRunning && timeLeft > 0) {
            interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (timeLeft === 0) {
            setIsTimerRunning(false);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [isTimerRunning, timeLeft]);

    useEffect(() => {
        setActionTarget1('');
        setActionTarget2('');
        setWitchHealTarget('');
        setWitchPoisonTarget('');
        setWolfsHundChoice('');
        setGauklerChosenRoleForNight(null);
    }, [nightStep, nightCount, gamePhase]);
    
    useEffect(() => {
        if (!playerToTakeHunterShot) {
            setHunterShotTarget('');
        }
    }, [playerToTakeHunterShot]);

    useEffect(() => {
        if (!playerToElectCaptain) {
            setNewCaptainTarget('');
        }
    }, [playerToElectCaptain]);

    const getPlayerNameById = useCallback((id: string) => {
        return players.find(p => p.id === id)?.name || 'Unbekannt';
    }, [players]);

    const getNeighbors = useCallback((playerId: string, currentPlayers: Player[]) => {
        const living = currentPlayers.filter(p => p.isAlive);
        const playerIndex = living.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return { left: null, right: null };
        
        const leftIndex = (playerIndex - 1 + living.length) % living.length;
        const rightIndex = (playerIndex + 1) % living.length;
        
        return {
            left: living[leftIndex],
            right: living[rightIndex],
        };
    }, []);
    
    const updateStats = useCallback((finalPlayers: Player[]) => {
        setStats(prevStats => {
            const newStats = { ...prevStats };
            newStats.totalGames++;
            
            finalPlayers.forEach(player => {
                if(player.name && player.role) {
                    if(!newStats.playerStats[player.name]) {
                        newStats.playerStats[player.name] = {};
                    }
                    const currentRoleCount = newStats.playerStats[player.name][player.role.name] || 0;
                    newStats.playerStats[player.name][player.role.name] = currentRoleCount + 1;
                }
            });

            try {
              localStorage.setItem('werwolfStats', JSON.stringify(newStats));
            } catch (error) {
              console.error("Could not save stats to localStorage", error);
            }
            return newStats;
        });
    }, []);

    const handlePlayerCountSubmit = useCallback((count: number) => {
        setPlayerCount(count);
        setPlayers(Array.from({ length: count }, (_, i) => ({ id: `player-${i}`, name: '', role: null, isAlive: true, canVote: true })));
        setGamePhase('name_entry');
    }, []);

    const handleNameChange = useCallback((id: string, name: string) => {
        setPlayers(prev => prev.map(p => p.id === id ? { ...p, name } : p));
    }, []);

    const handleNameEntrySubmit = useCallback(() => {
        if (players.every(p => p.name.trim() !== '')) setGamePhase('role_selection');
        else alert('Bitte allen Spielern einen Namen geben.');
    }, [players]);
    
    const addRole = useCallback((name: string, isForGaukler: boolean = false) => {
      const char = ALL_CHARACTERS.find(c => c.name === name);
      if (!char) return;
      
      if (isForGaukler) {
          setGauklerRepertoireSelection(prev => {
              if (prev.length >= 3) {
                  alert("Der Gaukler kann nur 3 Rollen im Repertoire haben.");
                  return prev;
              }
              if (prev.includes(name)) return prev;
              return [...prev, name];
          });
          return;
      }
      
      if ((selectedRoles[name] || 0) >= char.maxInGame) {
        alert(`Die Rolle "${name}" kann maximal ${char.maxInGame} Mal ausgewählt werden.`);
        return;
      }
      
      const groupSize = char.groupSize || 1;
      const totalRoleLimit = playerCount + (selectedRoles['Dieb'] > 0 ? 2 : 0);
      if (totalSelectedSlots + groupSize > totalRoleLimit) {
          alert("Maximale Anzahl an Rollen für die Spieleranzahl erreicht.");
          return;
      }

      setSelectedRoles(prev => {
        return { ...prev, [name]: (prev[name] || 0) + 1 };
      });
    }, [playerCount, selectedRoles, totalSelectedSlots]);

    const removeRole = useCallback((name: string, isForGaukler: boolean = false) => {
      if (isForGaukler) {
          setGauklerRepertoireSelection(prev => prev.filter(r => r !== name));
          return;
      }
      setSelectedRoles(prev => {
          const newRoles = { ...prev };
          if (newRoles[name] > 1) newRoles[name]--;
          else delete newRoles[name];
          return newRoles;
      });
    }, []);
    
    const handleRoleAssignmentChange = useCallback((roleName: string, playerId: string | string[]) => {
        setRoleAssignments(prev => ({ ...prev, [roleName]: playerId }));
    }, []);

    const handleStartGame = () => {
        const assignedPlayerIds = new Set(Object.values(roleAssignments).flat());
        if (assignedPlayerIds.size !== playerCount) {
            alert('Jeder Spieler muss genau eine Rolle haben.');
            return;
        }

        const finalPlayers = players.map(p => {
            for (const roleKey in roleAssignments) {
                const assigned = roleAssignments[roleKey];
                const baseRoleName = roleKey.includes('-') ? roleKey.substring(0, roleKey.lastIndexOf('-')) : roleKey;
                if ((Array.isArray(assigned) && assigned.includes(p.id)) || assigned === p.id) {
                    return { ...p, role: ALL_CHARACTERS.find(c => c.name === baseRoleName) || null, canVote: true, isAlive: true };
                }
            }
            return p;
        });

        // Reset game state first
        setNightStep(0);
        setNightCount(1);
        setWitchPotions({ heal: true, poison: true });
        setCompletedOneTimeActions(new Set());
        setLovers(null);
        setLastProtectedPlayer(null);
        setNightActions([]);
        setNightResult(null);
        setGameLog([]);
        setCaptainId(null);
        setDorfdeppRevealedId(null);
        setNominatedPlayerIds([]);
        setVotes({});
        setLynchResult({message: '', deadPlayerIds: []});
        setEnchantedPlayerIds(new Set());
        setGameOver(null);
        setIsRunOffVote(false);
        setPlayerToTakeHunterShot(null);
        setPlayerToElectCaptain(null);
        setScapegoatPunisherId(null);
        setDerAlteAttacked(false);
        setWildChildModelId(null);
        setWolfsHundChoice('');
        setThiefExtraRoles([]);
        setAreDorfPowersDisabled(false);
        setTetanusVictim(null);
        setErgebeneMagdAction(null);
        setGreisGroups({ groupA: [], groupB: [] });
        setGauklerChosenRoleForNight(null);
        setBearGrowl(false);
        setIsJudgeSecondVote(false);


        // Handle Gaukler
        if (finalPlayers.some(p => p.role?.name === 'Gaukler')) {
            const repertoireChars = gauklerRepertoireSelection.map(name => ALL_CHARACTERS.find(c => c.name === name)!);
            setGauklerRepertoire(repertoireChars);
        } else {
            setGauklerRepertoire([]);
        }


        // Handle Thief extra roles
        if (finalPlayers.some(p => p.role?.name === 'Dieb')) {
            const allSelectedRoleInstances = Object.entries(selectedRoles).flatMap(([name, count]) => Array(count).fill(name));
            const assignedRoles = finalPlayers.map(p => p.role?.name).filter(Boolean);

            assignedRoles.forEach(roleName => {
                const index = allSelectedRoleInstances.indexOf(roleName as string);
                if (index > -1) {
                    allSelectedRoleInstances.splice(index, 1);
                }
            });
            const extraRoles = allSelectedRoleInstances.map(name => ALL_CHARACTERS.find(c => c.name === name)!);
            setThiefExtraRoles(extraRoles);
        }
        
        setPlayers(finalPlayers);
        
        if (finalPlayers.some(p => p.role?.name === 'Verbitterter Greis')) {
            setGamePhase('greis_group_selection');
            return;
        }

        startGameCommon(finalPlayers);
    };

    const startGameCommon = (currentPlayers: Player[]) => {
        const hasPreNightActions = currentPlayers.some(p => 
            p.role && p.role.oneTimeAction && p.role.nightOrder !== null && p.role.nightOrder < 3
        );
        
        if (hasPreNightActions) {
            setGamePhase('pre_night');
        } else {
            setGamePhase('pre_night_result');
        }
    }

    const handleGoToSetup = useCallback(() => {
        setGamePhase('player_count');
        setPlayers([]);
        setSelectedRoles({});
        setRoleAssignments({});
        setGauklerRepertoireSelection([]);
    }, []);

    const checkWinConditions = useCallback((currentPlayers: Player[], currentLovers: [string, string] | null, currentEnchanted: Set<string>) => {
        const alivePlayers = currentPlayers.filter(p => p.isAlive);
        if (alivePlayers.length === 0) {
            return { isOver: true, message: "Alle Spieler sind tot. Es gibt keine Gewinner." };
        }

        const aliveWolves = alivePlayers.filter(p => p.role?.team === 'Wolf');
        
        // Greis Win
        const greisPlayer = currentPlayers.find(p => p.isAlive && p.role?.name === 'Verbitterter Greis');
        if (greisPlayer && greisGroups.groupA.length > 0) {
            const greisIsInA = greisGroups.groupA.includes(greisPlayer.id);
            const oppositionGroupIds = greisIsInA ? greisGroups.groupB : greisGroups.groupA;
            const oppositionIsDead = oppositionGroupIds.every(id => !currentPlayers.find(p => p.id === id)?.isAlive);
            if (oppositionIsDead) {
                return { isOver: true, message: `Der Verbitterte Greis (${greisPlayer.name}) hat die gesamte gegnerische Gruppe ausgelöscht und gewinnt alleine!` };
            }
        }
        
        // Lovers Win
        if (currentLovers && alivePlayers.length === 2 && alivePlayers.every(p => currentLovers.includes(p.id))) {
            return { isOver: true, message: `Nur noch das Liebespaar (${getPlayerNameById(currentLovers[0])} und ${getPlayerNameById(currentLovers[1])}) ist übrig! Sie haben gewonnen.` };
        }
        
        // Villager Win
        const nonVillagersAlive = alivePlayers.some(p => {
             if (p.role?.name === 'Engel' && nightCount > 1) return false; // After R1, Angel wins with village
             return p.role?.team !== 'Dorf';
        });
        if (!nonVillagersAlive) {
             const angelIsAlive = alivePlayers.some(p => p.role?.name === 'Engel');
             let message = "Alle Bedrohungen wurden eliminiert! Das Dorf hat gewonnen.";
             if(angelIsAlive) message += " Der überlebende Engel gewinnt mit ihnen."
             return { isOver: true, message: message };
        }

        // Flötenspieler Win
        const flötenspieler = currentPlayers.find(p => p.role?.name === 'Flötenspieler');
        if (flötenspieler && flötenspieler.isAlive) {
            const isEveryoneElseEnchanted = alivePlayers.filter(p => p.id !== flötenspieler.id).every(p => currentEnchanted.has(p.id));
            if (isEveryoneElseEnchanted) {
                return { isOver: true, message: "Alle lebenden Spieler wurden vom Flötenspieler verzaubert! Der Flötenspieler gewinnt." };
            }
        }
        
        // Weißer Werwolf Win
        if (alivePlayers.length === 1 && alivePlayers[0].role?.name === 'Weißer Werwolf') {
             return { isOver: true, message: "Der Weiße Werwolf hat alle überlistet und gewinnt alleine!" };
        }

        // Werewolf Win
        if (aliveWolves.length > 0 && aliveWolves.length >= alivePlayers.filter(p => p.role?.team !== 'Wolf').length) {
            const hunterIsAlive = alivePlayers.some(p => p.role?.name === 'Jäger');
            const witchHasPoison = witchPotions.poison && currentPlayers.some(p => p.isAlive && p.role?.name === 'Hexe');
            
            if (!hunterIsAlive && !witchHasPoison) {
                return { isOver: true, message: "Die Werwölfe sind in der Überzahl und können nicht mehr verlieren. Die Werwölfe haben gewonnen!" };
            }
        }

        return { isOver: false, message: "" };
    }, [getPlayerNameById, witchPotions, nightCount, greisGroups]);
    
    const checkWinAndAdvance = useCallback((currentPlayers: Player[], source: 'night' | 'lynch' | 'hunter_shot') => {
        const gameStatus = checkWinConditions(currentPlayers, lovers, enchantedPlayerIds);
        if (gameStatus.isOver) {
            updateStats(players);
            setGameOver(gameStatus);
            setGamePhase('game_over');
            return true; // Game ended
        }
        return false; // Game continues
    }, [checkWinConditions, lovers, enchantedPlayerIds, players, updateStats]);

    const confirmAction = (action: NightAction) => {
      const newActions = [...nightActions, action];
      setNightActions(newActions);

      const characterList = gamePhase === 'pre_night' ? preNightOrderCharacters : nightOrderCharacters;
      const currentRole = characterList[nightStep];
      if (currentRole?.oneTimeAction) {
          setCompletedOneTimeActions(prev => new Set(prev).add(currentRole.name));
      }
      
      if (nightStep < characterList.length - 1) {
          setNightStep(s => s + 1);
      } else {
          if (gamePhase === 'pre_night') {
              processPreNightResults(newActions, players);
              setGamePhase('pre_night_result');
          } else {
             processNightResults(newActions);
          }
      }
    };
    
    const processPreNightResults = (actions: NightAction[], currentPlayers: Player[]) => {
        let playersAfterPreNight = [...currentPlayers];
        const events: string[] = [];
        let tempLovers: [string, string] | null = null;
        let tempWildChildModel: string | null = null;

        for (const action of actions) {
             switch (action.roleName) {
                case 'Dieb': {
                    const actorId = action.actorIds[0];
                    const actorName = getPlayerNameById(actorId);
                    const chosenRoleName = action.targetIds.length > 0 ? action.targetIds[0] : null;
                    if(chosenRoleName) {
                        const newRole = ALL_CHARACTERS.find(c => c.name === chosenRoleName);
                        if(newRole){
                            playersAfterPreNight = playersAfterPreNight.map(p => p.id === actorId ? {...p, role: newRole} : p);
                        }
                    }
                    const eventText = chosenRoleName 
                        ? `${actorName} (Dieb) hat seine Karte getauscht und ist nun ${chosenRoleName}.`
                        : `${actorName} (Dieb) hat seine Rolle behalten.`;
                    events.push(eventText);
                    break;
                }
                case 'Amor':
                    if(action.targetIds.length === 2) {
                        tempLovers = [action.targetIds[0], action.targetIds[1]];
                        events.push(`Amor hat ${getPlayerNameById(action.targetIds[0])} und ${getPlayerNameById(action.targetIds[1])} verliebt gemacht.`);
                    }
                    break;
                case 'Wildes Kind':
                    if(action.targetIds.length === 1) {
                       tempWildChildModel = action.targetIds[0];
                       events.push(`Das Wilde Kind hat ${getPlayerNameById(action.targetIds[0])} als Vorbild gewählt.`);
                    }
                    break;
                case 'Zwei Schwestern':
                     events.push(`Die Zwei Schwestern haben sich gefunden.`);
                     break;
                case 'Drei Brüder':
                     events.push(`Die Drei Brüder haben sich gefunden.`);
                     break;
                case 'Wolfshund':
                    if (action.actorIds.length > 0 && (action.actionSubType === 'dorf' || action.actionSubType === 'wolf')) {
                        const wolfshundPlayerId = action.actorIds[0];
                        const wolfshundChoice = action.actionSubType;
                        const newRoleName = wolfshundChoice === 'wolf' ? 'Werwolf' : 'Dorfbewohner';
                        const newRole = ALL_CHARACTERS.find(c => c.name === newRoleName);
                        if(newRole){
                            playersAfterPreNight = playersAfterPreNight.map(p => p.id === wolfshundPlayerId ? {...p, role: newRole} : p);
                        }
                        events.push(`${getPlayerNameById(wolfshundPlayerId)} (Wolfshund) hat sich entschieden, auf der Seite der ${wolfshundChoice === 'wolf' ? 'Werwölfe' : 'Dorfbewohner'} zu stehen.`);
                    }
                    break;
             }
        }
        
        setPlayers(playersAfterPreNight);
        setLovers(tempLovers);
        setWildChildModelId(tempWildChildModel);
        setGameLog(prev => [...prev, { round: 'Setup', type: 'pre_night', events }]);
        setNightActions([]);
    }

    const processNightResults = (actions: NightAction[]) => {
        const details: string[] = [];
        const protections = new Set<string>();
        const deathIntents = new Map<string, string>(); // victimId -> cause of death string
        let localLastProtected = lastProtectedPlayer;
        let localEnchanted = new Set(enchantedPlayerIds);
        let witchHealedThisNight: string | null = null;
        let localDerAlteAttacked = derAlteAttacked;
    
        const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || 'Unbekannt';
    
        // Pass 0: Tetanus from previous night
        if (tetanusVictim && tetanusVictim.nightToDie === nightCount) {
            deathIntents.set(tetanusVictim.id, 'an Tetanus vom rostigen Schwert des Ritters gestorben');
            details.push(`${getPlayerName(tetanusVictim.id)} stirbt an Tetanus.`);
            setTetanusVictim(null);
        }

        // Pass 1: Gather all intents
        for (const action of actions) {
            const actorPlayer = players.find(p => action.actorIds.includes(p.id));
            if (!actorPlayer || !actorPlayer.isAlive) continue;
    
            switch (action.roleName) {
                case 'Heiler':
                    if (action.targetIds.length > 0) {
                        protections.add(action.targetIds[0]);
                        localLastProtected = action.targetIds[0];
                        details.push(`${getPlayerName(actorPlayer.id)} (Heiler) beschützt ${getPlayerName(action.targetIds[0])}.`);
                    }
                    break;
                case 'Urwolf':
                    if (action.targetIds.length > 0) {
                        // This is an infection, handled in Pass 4. Just log it.
                        details.push(`Der Urwolf versucht, ${getPlayerName(action.targetIds[0])} zu infizieren.`);
                    }
                    break;
                case 'Werwolf':
                case 'Weißer Werwolf':
                case 'Großer böser Wolf':
                    if(action.targetIds.length > 0){
                        const victimId = action.targetIds[0];
                        const victim = players.find(p => p.id === victimId);
                        const attackerRoleName = action.roleName === 'Weißer Werwolf' ? 'dem Weißen Werwolf' : action.roleName === 'Großer böser Wolf' ? 'dem Großen bösen Wolf' : 'den Werwölfen';
                        details.push(`Die ${attackerRoleName.replace('dem ', '').replace('den ', '')} greifen ${getPlayerName(victimId)} an.`);
                        
                        if (victim?.role?.name === 'Der Alte' && !localDerAlteAttacked) {
                            localDerAlteAttacked = true;
                            details.push(`${getPlayerName(victimId)} (Der Alte) überlebt den ersten Angriff der Werwölfe!`);
                        } else {
                            deathIntents.set(victimId, `von ${attackerRoleName} gefressen`);
                        }
                    }
                    break;
                case 'Flötenspieler':
                    if (action.targetIds.length === 2) {
                        localEnchanted.add(action.targetIds[0]);
                        localEnchanted.add(action.targetIds[1]);
                        details.push(`Der Flötenspieler verzaubert ${getPlayerName(action.targetIds[0])} und ${getPlayerName(action.targetIds[1])}.`);
                    }
                    break;
                case 'Hexe':
                    if (action.actionSubType === 'heal' && action.targetIds.length > 0) {
                        witchHealedThisNight = action.targetIds[0];
                    } else if (action.actionSubType === 'poison' && action.targetIds.length > 0) {
                        const poisonTargetId = action.targetIds[0];
                        const poisonTarget = players.find(p => p.id === poisonTargetId);
                        details.push(`Die Hexe vergiftet ${getPlayerName(poisonTargetId)}.`);
                        deathIntents.set(poisonTargetId, 'von der Hexe vergiftet');
                        if (poisonTarget?.role?.name === 'Der Alte') {
                            setAreDorfPowersDisabled(true);
                            details.push("Der Schock über den Tod des Alten lässt die Dorfbewohner ihre Fähigkeiten verlieren!");
                        }
                    }
                    break;
            }
        }
    
        // Pass 2: Resolve protections and heals
        const deathIntentsAfterHeal = new Map(deathIntents);
        if (witchHealedThisNight && deathIntentsAfterHeal.has(witchHealedThisNight)) {
            details.push(`Die Hexe setzt ihren Heiltrank ein und rettet ${getPlayerName(witchHealedThisNight)}.`);
            deathIntentsAfterHeal.delete(witchHealedThisNight);
        }
        
        const actuallyDead = new Set<string>();
        for (const [victimId, cause] of deathIntentsAfterHeal.entries()) {
            if (protections.has(victimId)) {
                details.push(`Der Angriff auf ${getPlayerName(victimId)} war erfolglos, da er/sie beschützt war.`);
            } else {
                actuallyDead.add(victimId);
            }
        }
    
        // Pass 3: Handle chained deaths (lovers) and get all dead players this round
        const deadPlayerIds = getChainedDeaths(Array.from(actuallyDead), details);
        
        // Pass 3.5: Handle Knight's revenge
        deadPlayerIds.forEach(deadId => {
            const deadPlayer = players.find(p => p.id === deadId);
            const deathCause = deathIntentsAfterHeal.get(deadId) || '';
            if (deadPlayer?.role?.name === 'Ritter mit dem verrosteten Schwert' && deathCause.toLowerCase().includes('wolf')) {
                const neighbors = getNeighbors(deadId, players);
                if (neighbors.left?.role?.team === 'Wolf') {
                    setTetanusVictim({ id: neighbors.left.id, nightToDie: nightCount + 1 });
                    details.push(`Das rostige Schwert des Ritters hat ${neighbors.left.name} infiziert! Er wird in der nächsten Nacht sterben.`);
                }
            }
        });

        let finalPlayers = players.map(p => ({ ...p, isAlive: !deadPlayerIds.includes(p.id) }));

        // Pass 4: Handle transformations (Wild Child, Urwolf)
        finalPlayers = handleTransformations(finalPlayers, deadPlayerIds, details, actions);
    
        let summary = '';
        if (deadPlayerIds.length === 0) {
            summary = 'Das Dorf erwacht und eine friedliche Nacht liegt hinter ihnen. Niemand ist gestorben.';
        } else {
            const deadPlayerNames = deadPlayerIds.map(id => {
                const player = players.find(p => p.id === id);
                return `${player?.name || 'Unbekannt'} (${player?.role?.name || 'Unbekannt'})`;
            });
            summary = `Das Dorf erwacht und muss Verluste beklagen: ${deadPlayerNames.join(' und ')} sind gestorben.`;
        }
    
        setPlayers(finalPlayers);
        setLastProtectedPlayer(localLastProtected);
        setEnchantedPlayerIds(localEnchanted);
        setNightResult({ summary, details, deadPlayerIds });
        setGameLog(prev => [...prev, { round: nightCount, type: 'night', events: details }]);
        setNightActions([]); // Clear actions for next night
        setDerAlteAttacked(localDerAlteAttacked);
    
        if (!checkWinAndAdvance(finalPlayers, 'night')) {
             const deadHunter = players.find(p => deadPlayerIds.includes(p.id) && p.role?.name === 'Jäger');
             const deadCaptainId = deadPlayerIds.find(id => id === captainId);

             // Correctly chain post-death events: Captain first, then Hunter.
             if (deadCaptainId && finalPlayers.some(p => p.isAlive)) {
                setPlayerToElectCaptain({ id: deadCaptainId, source: 'night' });
                // Also set hunter state if he died. The captain transfer component will transition to the hunter phase.
                if (deadHunter) {
                    setPlayerToTakeHunterShot({playerId: deadHunter.id, source: 'night'});
                }
                setGamePhase('captain_transfer');
             } else if (deadHunter) {
                // This case handles when a hunter dies but the captain does not.
                setPlayerToTakeHunterShot({playerId: deadHunter.id, source: 'night'});
                setGamePhase('hunter_action');
            } else {
                setGamePhase('night_result');
            }
        }
    };

    const getChainedDeaths = (initialDead: string[], logEvents: string[]): string[] => {
        const allDead = new Set(initialDead);
        let changed = true;
        while(changed) {
            changed = false;
            // Lovers
            if (lovers) {
                const [l1, l2] = lovers;
                const l1IsDead = allDead.has(l1);
                const l2IsDead = allDead.has(l2);
                if (l1IsDead && !l2IsDead) {
                    allDead.add(l2);
                    logEvents.push(`${getPlayerNameById(l2)} stirbt aus Kummer um ${getPlayerNameById(l1)}.`);
                    changed = true;
                }
                if (l2IsDead && !l1IsDead) {
                    allDead.add(l1);
                    logEvents.push(`${getPlayerNameById(l1)} stirbt aus Kummer um ${getPlayerNameById(l2)}.`);
                    changed = true;
                }
            }
        }
        return Array.from(allDead);
    }

    const handleTransformations = (currentPlayers: Player[], deadIds: string[], logEvents: string[], nightActions: NightAction[]): Player[] => {
        let transformedPlayers = [...currentPlayers];
        
        // Wild Child
        if (wildChildModelId && deadIds.includes(wildChildModelId)) {
            const wildChild = transformedPlayers.find(p => p.role?.name === 'Wildes Kind' && p.isAlive);
            if(wildChild) {
                const newRole = ALL_CHARACTERS.find(c => c.name === 'Werwolf')!;
                logEvents.push(`${wildChild.name} (Wildes Kind) war schockiert über den Tod seines Vorbilds und ist nun ein Werwolf!`);
                transformedPlayers = transformedPlayers.map(p => p.id === wildChild.id ? { ...p, role: newRole } : p);
                setWildChildModelId(null); // Transformation happens once
            }
        }
        
        // Urwolf Infection
        const infectionAction = nightActions.find(a => a.roleName === 'Urwolf' && a.actionType === 'infect' && a.targetIds.length > 0);
        if (infectionAction && infectionAction.targetIds[0]) {
            const infectedId = infectionAction.targetIds[0];
            const infectedPlayer = transformedPlayers.find(p => p.id === infectedId);
            // Check if player is still alive AFTER other deaths are processed, and not already a wolf
            if (infectedPlayer && infectedPlayer.isAlive && infectedPlayer.role?.team !== 'Wolf') {
                const newRole = ALL_CHARACTERS.find(c => c.name === 'Werwolf')!;
                logEvents.push(`${infectedPlayer.name} wurde vom Urwolf infiziert und ist jetzt ein Werwolf!`);
                transformedPlayers = transformedPlayers.map(p => p.id === infectedPlayer.id ? { ...p, role: newRole } : p);
            }
        }

        return transformedPlayers;
    }
    
    const handleTimerStartPause = useCallback(() => {
        if (timeLeft === 0) setTimeLeft(timerDuration);
        setIsTimerRunning(prev => !prev);
    }, [timeLeft, timerDuration]);
    
    const handleTimerReset = useCallback(() => {
        setIsTimerRunning(false);
        setTimeLeft(timerDuration);
    }, [timerDuration]);
    
    const handleTimerDurationChange = useCallback((duration: number) => {
        setTimerDuration(duration);
        if (!isTimerRunning) {
            setTimeLeft(duration);
        }
    }, [isTimerRunning]);

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };
    
    const handleNominationToggle = useCallback((id: string) => {
        setNominatedPlayerIds(prev => {
            const newNoms = new Set(prev);
            if (newNoms.has(id)) newNoms.delete(id);
            else newNoms.add(id);
            return Array.from(newNoms);
        });
    }, []);
    
    const startVoting = useCallback(() => {
        if (nominatedPlayerIds.length < 2 || nominatedPlayerIds.length > 3) {
            alert("Bitte 2 oder 3 Spieler für die Abstimmung nominieren.");
            return;
        }
        if (!isRunOffVote && !isJudgeSecondVote) {
          const dayEvents: string[] = [`Nominierung: ${nominatedPlayerIds.map(id => getPlayerNameById(id)).join(', ')}`];
          setGameLog(prev => [...prev, { round: nightCount, type: 'day', events: dayEvents }]);
        }
        
        setCurrentVoteIndex(0);
        setVotes({});
        setGamePhase('voting');
    }, [isRunOffVote, isJudgeSecondVote, nightCount, nominatedPlayerIds, getPlayerNameById]);

    const handleVoteToggle = useCallback((voterId: string) => {
        const nomineeId = nominatedPlayerIds[currentVoteIndex];
        setVotes(prev => {
            const newVotes = { ...prev };
            const currentVotes = new Set(newVotes[nomineeId]);
            if (currentVotes.has(voterId)) currentVotes.delete(voterId);
            else currentVotes.add(voterId);
            newVotes[nomineeId] = currentVotes;
            return newVotes;
        });
    }, [nominatedPlayerIds, currentVoteIndex]);

    const nextVote = () => {
        if (currentVoteIndex < nominatedPlayerIds.length - 1) {
            setCurrentVoteIndex(prev => prev + 1);
        } else {
            processLynch();
        }
    };
    
    const continueFromLynch = (finalDeadIds: string[], playersAfterLynch: Player[]) => {
        let playersAfterTransform = handleTransformations(playersAfterLynch, finalDeadIds, gameLog[gameLog.length - 1].events, []);
        
        setPlayers(playersAfterTransform);

        if (!checkWinAndAdvance(playersAfterTransform, 'lynch')) {
            const finalLivingPlayers = playersAfterTransform.filter(p => p.isAlive);
            const deadCaptainId = finalDeadIds.find(id => id === captainId);
            const deadHunter = players.find(p => finalDeadIds.includes(p.id) && p.role?.name === 'Jäger');

            if (scapegoatPunisherId && finalLivingPlayers.length > 0) {
                setGamePhase('scapegoat_action');
            } else if (deadCaptainId && finalLivingPlayers.length > 0) {
                setPlayerToElectCaptain({ id: deadCaptainId, source: 'day' });
                 if (deadHunter) {
                    setPlayerToTakeHunterShot({playerId: deadHunter.id, source: 'day'});
                }
                setGamePhase('captain_transfer');
            } else if (deadHunter) {
                setPlayerToTakeHunterShot({playerId: deadHunter.id, source: 'day'});
                setGamePhase('hunter_action');
            } else {
                setGamePhase('lynch_result');
            }
        }
    };


    const continueLynchAfterMagd = (lynchedPlayerId: string | null) => {
        const latestLog = gameLog[gameLog.length - 1];
        let finalDeadIds: string[] = [];
        if (lynchedPlayerId) {
            const lynchedPlayer = players.find(p => p.id === lynchedPlayerId)!;
             if (nightCount === 1 && lynchedPlayer.role?.name === 'Engel') {
                const gameStatus = { isOver: true, message: `${lynchedPlayer.name} war der Engel und gewinnt das Spiel alleine, da er in der ersten Runde gelyncht wurde!` };
                updateStats(players);
                setGameOver(gameStatus);
                setGamePhase('game_over');
                return;
            }
             if(lynchedPlayer.role?.name === 'Der Alte') {
                setAreDorfPowersDisabled(true);
                latestLog.events.push("Der Schock über den Tod des Alten lässt die Dorfbewohner ihre Fähigkeiten verlieren!");
            }
            finalDeadIds = getChainedDeaths([lynchedPlayerId], latestLog.events);
        }
        
        setLynchResult(prev => ({...prev, deadPlayerIds: finalDeadIds}));
        setIsRunOffVote(false); // Reset for next day
        let playersAfterLynch = players.map(p => ({ ...p, isAlive: !finalDeadIds.includes(p.id) }));
        
        continueFromLynch(finalDeadIds, playersAfterLynch);
    };

    const processLynch = () => {
        const scores: Record<string, number> = {};
        nominatedPlayerIds.forEach(id => scores[id] = 0);

        for (const nomineeId in votes) {
            let nomineeScore = 0;
            votes[nomineeId]?.forEach(voterId => {
                nomineeScore += (voterId === captainId ? 2 : 1);
            });
            scores[nomineeId] = nomineeScore;
        }
        
        const voteEvents = Object.entries(scores).map(([id, score]) => `${getPlayerNameById(id)}: ${score} Stimme(n)`);
        const latestLog = gameLog[gameLog.length - 1];
        if (latestLog?.type === 'day') {
            latestLog.events.push(...voteEvents);
        }
        
        const maxScore = Math.max(...Object.values(scores));
        const tiedPlayers = Object.keys(scores).filter(id => scores[id] === maxScore);
        
        let resultMessage = '';
        let playersAfterLynch = [...players];
        let lynchedPlayerId: string | null = null;
        let didDorfdeppSurvive = false;
        
        if (tiedPlayers.length > 1 && maxScore > 0) {
            const scapegoat = players.find(p => p.isAlive && p.role?.name === 'Sündenbock');
            if (scapegoat) {
                resultMessage = `Gleichstand! Anstelle der Nominierten stirbt der Sündenbock: ${scapegoat.name}.`;
                lynchedPlayerId = scapegoat.id;
                setScapegoatPunisherId(scapegoat.id); 
            } else if (!isRunOffVote) {
                setIsRunOffVote(true);
                setNominatedPlayerIds(tiedPlayers);
                startVoting();
                return;
            } else {
                resultMessage = 'Erneuter Gleichstand bei der Stichwahl! Heute wird niemand gelyncht.';
            }
        } else if (tiedPlayers.length === 1 && maxScore > 0) {
             const potentialLynchId = tiedPlayers[0];
             const potentialLynchPlayer = players.find(p => p.id === potentialLynchId)!;
             if (potentialLynchPlayer.role?.name === 'Dorfdepp' && potentialLynchPlayer.id !== dorfdeppRevealedId) {
                 resultMessage = `Das Dorf wollte ${potentialLynchPlayer.name} lynchen, hat aber den Dorfdepp enttarnt! Er überlebt, verliert aber sein Stimmrecht.`;
                 setDorfdeppRevealedId(potentialLynchId);
                 playersAfterLynch = playersAfterLynch.map(p => p.id === potentialLynchId ? { ...p, canVote: false } : p);
                 didDorfdeppSurvive = true;
             } else {
                 resultMessage = `${potentialLynchPlayer.name} (${potentialLynchPlayer.role?.name}) wurde vom Dorf gelyncht.`;
                 lynchedPlayerId = potentialLynchId;
             }
        } else {
            resultMessage = 'Niemand hat genügend Stimmen erhalten. Heute wird keiner gelyncht.';
        }
        
        if (latestLog) latestLog.events.push(resultMessage);
        setLynchResult({message: resultMessage, deadPlayerIds: []});
        
        if (didDorfdeppSurvive) {
            setPlayers(playersAfterLynch);
            if (!checkWinAndAdvance(playersAfterLynch, 'lynch')) {
                 setGamePhase('night');
                 setNightStep(0);
                 setNightCount(prev => prev + 1);
            }
            return;
        }

        if (lynchedPlayerId) {
            const magd = players.find(p => p.isAlive && p.role?.name === 'Ergebene Magd');
            const lynchedPlayer = players.find(p => p.id === lynchedPlayerId)!;
            const isMagdActionPossible = magd && !completedOneTimeActions.has('Ergebene Magd') && lynchedPlayer.role?.name !== 'Jäger' && (!lovers || !lovers.includes(magd.id));

            if(isMagdActionPossible) {
                setErgebeneMagdAction({ lynchedPlayerId, magdPlayerId: magd.id });
                setGamePhase('ergebene_magd_action');
                return;
            }
        }
        
        continueLynchAfterMagd(lynchedPlayerId);
    };
    
    const handleHunterShot = useCallback((targetId: string) => {
        if (!playerToTakeHunterShot || !targetId) return;

        const hunterName = getPlayerNameById(playerToTakeHunterShot.playerId);
        const targetName = getPlayerNameById(targetId);
        const event = `Im Tod schießt ${hunterName} (Jäger) und tötet ${targetName}.`;
        
        let logExists = true;
        let latestLog = gameLog[gameLog.length - 1];
        if (!latestLog) {
            logExists = false;
            latestLog = {round: nightCount, type: 'day', events: []};
        }
        const logEvents = latestLog.events;
        logEvents.push(event);
        
        const targetPlayer = players.find(p => p.id === targetId)!;
        if(targetPlayer.role?.name === 'Der Alte') {
            setAreDorfPowersDisabled(true);
            logEvents.push("Der Schock über den Tod des Alten lässt die Dorfbewohner ihre Fähigkeiten verlieren!");
        }

        const deadAfterShot = getChainedDeaths([targetId], logEvents);
        let playersAfterShot = players.map(p => ({...p, isAlive: deadAfterShot.includes(p.id) ? false : p.isAlive}));
        playersAfterShot = handleTransformations(playersAfterShot, deadAfterShot, logEvents, []);
        
        if (logExists) setGameLog([...gameLog.slice(0, -1), latestLog]);
        else setGameLog([latestLog]);
        
        setPlayers(playersAfterShot);
        
        if (!checkWinAndAdvance(playersAfterShot, 'hunter_shot')) {
            const finalLivingPlayers = playersAfterShot.filter(p => p.isAlive);
            const deadCaptainId = deadAfterShot.find(id => id === captainId);

            if (deadCaptainId && finalLivingPlayers.length > 0) {
                 //This case should be handled by the pre-emptive check in captain transfer, but as a fallback:
                setPlayerToElectCaptain({ id: deadCaptainId, source: playerToTakeHunterShot.source });
                setGamePhase('captain_transfer');
            } else if (playerToTakeHunterShot.source === 'day') {
                setGamePhase('lynch_result');
            } else { 
                setGamePhase('night_result');
            }
        }
        
        setPlayerToTakeHunterShot(null);
    }, [playerToTakeHunterShot, gameLog, players, nightCount, getPlayerNameById, checkWinAndAdvance, captainId]);


    // --- RENDER METHODS ---
    const renderSplashScreen = () => (
        <div className="splash-screen" onClick={() => setAppMode('menu')}>
            <h1 className="splash-title">Werwolf</h1>
            <p className="splash-subtitle">Hail the titbird</p>
            <p className="splash-instruction">Klicken zum Starten</p>
        </div>
    );
    
    const renderMainMenu = () => (
        <div className="setup-container">
            <header><h1>Werwolf Spielleiter</h1></header>
            <div className="menu-container">
                <button className="menu-button" onClick={() => setAppMode('spielleiter')}><span className="menu-button-title">Spielleiter</span><span className="menu-button-desc">Starte und verwalte ein neues Spiel.</span></button>
                <button className="menu-button" onClick={() => setAppMode('spieler')}><span className="menu-button-title">Rollen-Lexikon</span><span className="menu-button-desc">Schlage Rollen und deren Fähigkeiten nach.</span></button>
                <button className="menu-button" onClick={() => setAppMode('statistik')}><span className="menu-button-title">Statistik</span><span className="menu-button-desc">Sieh dir die Highscores vergangener Spiele an.</span></button>
            </div>
        </div>
    );
    
    const renderStatisticsPage = () => {
        const roleLeaderboards: { [roleName: string]: { name: string; count: number }[] } = {};

        ALL_CHARACTERS.forEach(char => {
            roleLeaderboards[char.name] = [];
        });

        for (const playerName in stats.playerStats) {
            for (const roleName in stats.playerStats[playerName]) {
                if (roleLeaderboards[roleName]) {
                    roleLeaderboards[roleName].push({
                        name: playerName,
                        count: stats.playerStats[playerName][roleName]
                    });
                }
            }
        }

        for (const roleName in roleLeaderboards) {
            roleLeaderboards[roleName].sort((a, b) => b.count - a.count);
            roleLeaderboards[roleName] = roleLeaderboards[roleName].slice(0, 5);
        }

        return (
            <div className="setup-container">
                <div className="navigation-buttons" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <button className="secondary-button" onClick={() => setAppMode('menu')}>‹ Hauptmenü</button>
                </div>
                <h2>Statistiken</h2>
                <div className="stats-summary-card">
                    <h3>Gespielte Spiele insgesamt</h3>
                    <p>{stats.totalGames}</p>
                </div>
                <h3>Rollen-Highscores</h3>
                <div className="stats-grid">
                    {ALL_CHARACTERS.map(char => (
                        <div key={char.name} className="stat-card">
                            <h4>{char.name}</h4>
                            <ol>
                                {roleLeaderboards[char.name].length > 0 ? (
                                    roleLeaderboards[char.name].map((player, index) => (
                                        <li key={index}>
                                            <span>{player.name}</span>
                                            <span>{player.count}x</span>
                                        </li>
                                    ))
                                ) : (
                                    <p className="no-stats-text">Noch nicht gespielt</p>
                                )}
                            </ol>
                        </div>
                    ))}
                </div>
            </div>
        );
    };
    
    const renderGameLogModal = () => (
      <div className="role-detail-modal">
        <div className="role-detail-content">
          <button className="close-button" onClick={() => setViewingLog(false)}>×</button>
          <h2>Spielverlauf</h2>
          <div className="game-log-container">
            {gameLog.map((entry, i) => (
              <div key={`round-${entry.round}-${entry.type}-${i}`} className={`log-entry ${entry.type}`}>
                <h3>{entry.type === 'pre_night' ? 'Vorrunde' : (entry.type === 'night' ? `Nacht ${entry.round}` : `Tag ${entry.round}`)}</h3>
                <ul>
                  {entry.events.map((event, index) => <li key={index}>{event}</li>)}
                </ul>
              </div>
            ))}
            {gameLog.length === 0 && <p>Bisher ist nichts passiert.</p>}
          </div>
        </div>
      </div>
    );

    const renderPlayerView = () => {
        if (viewingRole) return (
            <div className="role-detail-modal">
                <div className="role-detail-content">
                    <button className="close-button" onClick={() => setViewingRole(null)}>×</button>
                    <h2>{viewingRole.name}</h2>
                    <p><strong>Team:</strong> <span className={`team-tag team-${(viewingRole.team || 'neutral').toLowerCase()}`}>{viewingRole.team}</span></p>
                    <p className="role-description">{viewingRole.description}</p>
                    {viewingRole.tips && <div className="role-tips"><strong>Strategische Tipps:</strong><p>{viewingRole.tips}</p></div>}
                </div>
            </div>
        );

        return (
            <div className="setup-container">
                <div className="navigation-buttons" style={{ justifyContent: 'space-between', marginBottom: '1rem' }}><button className="secondary-button" onClick={() => setAppMode('menu')}>‹ Hauptmenü</button></div>
                <h2>Rollen-Lexikon</h2><p>Klicke auf eine Rolle, um mehr zu erfahren.</p>
                <div>
                    <h3 className="role-category-header">Dorfgemeinschaft</h3>
                    <div className="character-grid">{groupedRoles.Dorf.map(char => (<div key={char.name} className="character-card" onClick={() => setViewingRole(char)}>{char.name}</div>))}</div>
                    <h3 className="role-category-header">Die Werwölfe</h3>
                    <div className="character-grid">{groupedRoles.Wolf.map(char => (<div key={char.name} className="character-card" onClick={() => setViewingRole(char)}>{char.name}</div>))}</div>
                    <h3 className="role-category-header">Neutrale & Einzelgänger</h3>
                    <div className="character-grid">{groupedRoles.Neutral.map(char => (<div key={char.name} className="character-card" onClick={() => setViewingRole(char)}>{char.name}</div>))}</div>
                </div>
            </div>
        );
    };

    const renderPlayerCount = () => (
        <div className="setup-container">
            <h2>Spieleranzahl</h2><p>Wie viele Personen spielen mit?</p>
            <input type="number" className="player-count-input" value={playerCount} onChange={e => setPlayerCount(parseInt(e.target.value, 10) || 1)} min="3"/>
            <div className="navigation-buttons">
                <button className="secondary-button" onClick={() => setAppMode('menu')}>Zurück</button>
                <button className="primary-button" onClick={() => handlePlayerCountSubmit(playerCount)}>Weiter</button>
            </div>
        </div>
    );
    
    const renderNameEntry = () => (
        <div className="setup-container">
            <h2>Spielernamen</h2>
            <p>Bitte trage die Namen aller Spieler ein.<br/><strong>Wichtig:</strong> Die Reihenfolge der Eingabe bestimmt die Sitzordnung am Tisch.</p>
            <div className="name-entry-grid">{players.map(p => (<input key={p.id} type="text" placeholder={`Spieler ${parseInt(p.id.split('-')[1]) + 1}`} value={p.name} onChange={e => handleNameChange(p.id, e.target.value)} className="player-name-input large"/>))}</div>
            <div className="navigation-buttons">
              <button className="secondary-button" onClick={() => setGamePhase('player_count')}>Zurück</button>
              <button className="primary-button" onClick={handleNameEntrySubmit}>Rollen auswählen</button>
            </div>
        </div>
    );

    const renderRoleSelection = () => {
        const totalRoleLimit = playerCount + (selectedRoles['Dieb'] > 0 ? 2 : 0);
        const isGauklerSelected = selectedRoles['Gaukler'] > 0;

        return (
            <div className="setup-container">
                <h2>Rollen auswählen</h2>
                 {selectedRoles['Dieb'] > 0 && <p style={{color: 'var(--selected-color)'}}>Der Dieb benötigt 2 zusätzliche Rollen in der Mitte.</p>}
                <div className="role-selection-header">
                    <h3>Ausgewählte Rollenplätze: {totalSelectedSlots} / {totalRoleLimit}</h3>
                    <div className="selected-roles-container">
                        {Object.keys(selectedRoles).map(name => (
                            <div key={name} className="multi-select-tag">
                                {name} ({selectedRoles[name]})
                                <button onClick={() => removeRole(name)}>x</button>
                            </div>
                        ))}
                        {totalSelectedSlots === 0 && <p>Noch keine Rollen ausgewählt.</p>}
                    </div>
                </div>

                {isGauklerSelected && (
                    <div className="role-selection-header" style={{borderColor: 'var(--team-color-neutral)'}}>
                        <h3 style={{color: 'var(--team-color-neutral)'}}>Gaukler Repertoire: {gauklerRepertoireSelection.length} / 3</h3>
                        <p>Wähle 3 Rollen, die der Gaukler nachahmen kann.</p>
                         <div className="selected-roles-container">
                            {gauklerRepertoireSelection.map(name => (
                                <div key={name} className="multi-select-tag" style={{backgroundColor: 'var(--team-color-neutral)'}}>
                                    {name}
                                    <button onClick={() => removeRole(name, true)}>x</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div>
                    <h3 className="role-category-header">Dorfgemeinschaft</h3>
                    <div className="character-grid">{groupedRoles.Dorf.map(char => (<div key={char.name} className="character-card" onClick={() => addRole(char.name, isGauklerSelected)}>{char.name} {char.groupSize && `(${char.groupSize})`}</div>))}</div>
                    <h3 className="role-category-header">Die Werwölfe</h3>
                    <div className="character-grid">{groupedRoles.Wolf.map(char => (<div key={char.name} className="character-card" onClick={() => addRole(char.name, isGauklerSelected)}>{char.name}</div>))}</div>
                    <h3 className="role-category-header">Neutrale & Einzelgänger</h3>
                    <div className="character-grid">{groupedRoles.Neutral.map(char => (<div key={char.name} className="character-card" onClick={() => addRole(char.name, isGauklerSelected)}>{char.name}</div>))}</div>
                </div>
                <div className="navigation-buttons">
                    <button className="secondary-button" onClick={() => setGamePhase('name_entry')}>Zurück</button>
                    <button className="primary-button" onClick={() => setGamePhase('role_assignment')} disabled={totalSelectedSlots !== totalRoleLimit || (isGauklerSelected && gauklerRepertoireSelection.length !== 3)}>Rollen zuweisen</button>
                </div>
            </div>
        );
    };

    const renderRoleAssignment = () => {
        const rolesToAssign = ALL_CHARACTERS.filter(c => selectedRoles[c.name] > 0);
        const assignedPlayerIds = new Set(Object.values(roleAssignments).flat());
    
        const renderMultiPlayerRoleAssignment = (role: Character, roleKey: string, requiredCount: number, label: string) => {
            const playersInThisRole = new Set(roleAssignments[roleKey] || []);
            return (
                <div key={roleKey} className="assignment-row">
                    <label>{label}</label>
                    <div className="multi-select-container">
                        {(roleAssignments[roleKey] as string[] || []).map(pId => (
                           <span key={pId} className="multi-select-tag">
                             {getPlayerNameById(pId)}
                             <button onClick={() => handleRoleAssignmentChange(roleKey, (roleAssignments[roleKey] as string[]).filter(id => id !== pId))}>x</button>
                           </span>
                        ))}
                        {(roleAssignments[roleKey] as string[] || []).length < requiredCount && (
                            <select value="" onChange={e => {
                                const current = (roleAssignments[roleKey] as string[] || []);
                                if (e.target.value && !current.includes(e.target.value)) handleRoleAssignmentChange(roleKey, [...current, e.target.value]);
                            }}>
                              <option value="">Spieler hinzufügen...</option>
                              {players.filter(p => !assignedPlayerIds.has(p.id) || playersInThisRole.has(p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        )}
                    </div>
                </div>
            );
        };
    
        const renderSinglePlayerRoleAssignment = (role: Character, roleKey: string) => {
            const assignedId = roleAssignments[roleKey] as string || '';
            return (
                <div key={roleKey} className="assignment-row">
                    <label>{role.name}</label>
                    <select value={assignedId} onChange={e => handleRoleAssignmentChange(roleKey, e.target.value)}>
                        <option value="">Wähle einen Spieler...</option>
                        {players.filter(p => !assignedPlayerIds.has(p.id) || p.id === assignedId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            );
        };
    
        return (
            <div className="setup-container">
                <h2>Rollen zuweisen</h2><p>Weise jedem Spieler eine Rolle zu.</p>
                <div className="assignment-list">
                    {rolesToAssign.map(role => {
                        const count = selectedRoles[role.name];
                        const groupSize = role.groupSize || 1;
                        const playersToAssign = groupSize > 1 ? groupSize : count;
    
                        if (playersToAssign > 1 && (groupSize > 1 || role.canHaveMultiple)) {
                            const label = `${role.name} (${playersToAssign})`;
                            return renderMultiPlayerRoleAssignment(role, role.name, playersToAssign, label);
                        } else {
                            return Array.from({ length: count }).map((_, index) => {
                                const roleKey = `${role.name}-${index}`;
                                return renderSinglePlayerRoleAssignment(role, roleKey);
                            });
                        }
                    })}
                </div>
                <div className="navigation-buttons">
                    <button className="secondary-button" onClick={() => setGamePhase('role_selection')}>Zurück</button>
                    <button className="primary-button" onClick={handleStartGame}>Spiel starten</button>
                </div>
            </div>
        );
    };

    const renderGreisGroupSelection = () => {
        const greisPlayer = players.find(p => p.role?.name === 'Verbitterter Greis')!;
        const unassignedPlayers = players.filter(p => !greisGroups.groupA.includes(p.id) && !greisGroups.groupB.includes(p.id));

        const assignToGroup = (playerId: string, group: 'A' | 'B') => {
            setGreisGroups(prev => {
                const newGroups = { ...prev };
                // Remove from other group if present
                newGroups.groupA = newGroups.groupA.filter(id => id !== playerId);
                newGroups.groupB = newGroups.groupB.filter(id => id !== playerId);
                
                if (group === 'A') newGroups.groupA.push(playerId);
                else newGroups.groupB.push(playerId);
                
                return newGroups;
            });
        };

        return (
            <div className="setup-container">
                <h2>Verbitterter Greis: Gruppen einteilen</h2>
                <p>Der Greis ({greisPlayer.name}) gewinnt, wenn die gegnerische Gruppe komplett eliminiert ist. Teile alle Spieler einer Gruppe zu.</p>
                <div className="greis-container">
                    <div className="greis-group">
                        <h3>Gruppe A</h3>
                        {greisGroups.groupA.map(id => <div key={id} className="player-tag">{getPlayerNameById(id)}</div>)}
                    </div>
                    <div className="greis-unassigned">
                        <h3>Nicht zugewiesen</h3>
                        {unassignedPlayers.map(p => (
                            <div key={p.id} className="unassigned-player">
                                <span>{p.name}</span>
                                <div>
                                    <button onClick={() => assignToGroup(p.id, 'A')}>‹ A</button>
                                    <button onClick={() => assignToGroup(p.id, 'B')}>B ›</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="greis-group">
                        <h3>Gruppe B</h3>
                        {greisGroups.groupB.map(id => <div key={id} className="player-tag">{getPlayerNameById(id)}</div>)}
                    </div>
                </div>
                <div className="navigation-buttons">
                     <button className="secondary-button" onClick={() => setGamePhase('role_assignment')}>Zurück</button>
                     <button className="primary-button" disabled={unassignedPlayers.length > 0} onClick={() => startGameCommon(players)}>Spiel beginnen</button>
                </div>
            </div>
        );
    };

    const renderActionComponent = () => {
        const isPreNight = gamePhase === 'pre_night';
        const characterList = isPreNight ? preNightOrderCharacters : nightOrderCharacters;

        if (nightStep >= characterList.length) return null;

        const currentChar = characterList[nightStep];
        if (!currentChar) return null;

        // Find actor, considering Gaukler
        let actors = nightPlayers.filter(p => p.isAlive && p.role?.name === currentChar.name);
        if (actors.length === 0) return <p>{currentChar.name} ist nicht im Spiel oder tot.</p>;

        const originalActorRoleName = players.find(p => p.id === actors[0].id)?.role?.name;
        const isGauklerActing = originalActorRoleName === 'Gaukler';
        
        if (currentChar.name === 'Dieb') {
            const handleThiefChoice = (chosenRole: Character | null) => {
                const thiefId = actors[0].id;
                const action: NightAction = {
                    actorIds: [thiefId],
                    roleName: 'Dieb',
                    targetIds: chosenRole ? [chosenRole.name] : [],
                };
                confirmAction(action);
            };
            
            const mustSwap = thiefExtraRoles.length === 2 && thiefExtraRoles.every(r => r.team === 'Wolf');

            return (
                <div className="action-panel">
                    <h4>Aktion für: Dieb</h4>
                    <p>{actors.map(p=>p.name).join(', ')} darf eine der zwei übrigen Karten wählen oder seine behalten.</p>
                    <div className="character-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        {thiefExtraRoles.map((role, index) => (
                            <button key={index} className="primary-button" onClick={() => handleThiefChoice(role)}>
                                Wähle {role.name}
                            </button>
                        ))}
                    </div>
                     {mustSwap ? (
                        <p style={{color: 'var(--selected-color)'}}>Beide Karten sind Werwölfe. Der Dieb muss eine wählen.</p>
                    ) : (
                        <button className="secondary-button" onClick={() => handleThiefChoice(null)}>
                            Keine Karte wählen (bleibt Dieb)
                        </button>
                    )}
                </div>
            )
        }


        if (currentChar.name === 'Wolfshund') {
            const handleWolfshundConfirm = () => {
                if (!wolfsHundChoice) {
                    alert("Bitte eine Seite für den Wolfshund wählen.");
                    return;
                }
                const action: NightAction = { 
                    actorIds: actors.map(a => a.id), 
                    roleName: 'Wolfshund', 
                    targetIds: [],
                    actionSubType: wolfsHundChoice 
                };
                confirmAction(action);
            };

            return (
                <div className="action-panel">
                    <h4>Aktion für: Wolfshund</h4>
                    <p>{actors.map(p => p.name).join(', ')} muss sich entscheiden, welcher Seite er angehören möchte:</p>
                    <div className="action-control">
                        <label>Wähle ein Team</label>
                        <select value={wolfsHundChoice} onChange={e => setWolfsHundChoice(e.target.value as any)}>
                            <option value="">Wähle eine Seite...</option>
                            <option value="dorf">Dorfbewohner</option>
                            <option value="wolf">Werwolf</option>
                        </select>
                    </div>
                    <div className="navigation-buttons" style={{marginTop: '1rem'}}>
                        <button className="primary-button" onClick={handleWolfshundConfirm}>Wahl bestätigen</button>
                    </div>
                </div>
            );
        }

        // Handle simple info/no-action roles
        if (!currentChar.actionType || (currentChar.oneTimeAction && completedOneTimeActions.has(currentChar.name) && !isGauklerActing)) {
            return (
                 <div className="navigation-buttons">
                     <button className="primary-button" onClick={() => confirmAction({ actorIds: actors.map(p => p.id), roleName: currentChar.name, targetIds: [] })}>Weiter</button>
                 </div>
            );
        }

        const getValidTargets = (roleName: string, actorIds: string[], potentialTargets: Player[]): Player[] => {
            switch (roleName) {
                case 'Weißer Werwolf':
                    return potentialTargets.filter(p => p.role?.team === 'Wolf' && !actorIds.includes(p.id));
                case 'Werwolf':
                case 'Urwolf':
                case 'Großer böser Wolf':
                case 'Wildes Kind':
                case 'Flötenspieler':
                     return potentialTargets.filter(p => !actorIds.includes(p.id));
                case 'Heiler':
                     return potentialTargets.filter(p => p.id !== lastProtectedPlayer);
                default:
                    return potentialTargets;
            }
        };

        if (currentChar.name === 'Hexe') {
            const deathIntentsThisNight = new Map<string, string>();
            for (const action of nightActions) {
                if (['Werwolf', 'Weißer Werwolf', 'Großer böser Wolf'].includes(action.roleName) && action.targetIds.length > 0) {
                     deathIntentsThisNight.set(action.targetIds[0], action.roleName);
                }
            }
            const deathTargets = Array.from(deathIntentsThisNight.entries()).map(([victimId, attackerRole]) => ({ victimId, attackerRole }));

            const handleWitchConfirm = () => {
                const actorIds = actors.map(a => a.id);
                const actionsToAdd: NightAction[] = [];
                let healUsed = false;
                let poisonUsed = false;

                if (witchHealTarget && witchPotions.heal) {
                    actionsToAdd.push({ actorIds, roleName: 'Hexe', targetIds: [witchHealTarget], actionSubType: 'heal' });
                    healUsed = true;
                }
                if (witchPoisonTarget && witchPotions.poison) {
                    actionsToAdd.push({ actorIds, roleName: 'Hexe', targetIds: [witchPoisonTarget], actionSubType: 'poison' });
                    poisonUsed = true;
                }
                
                if (!isGauklerActing) {
                    setWitchPotions(prev => ({ heal: prev.heal && !healUsed, poison: prev.poison && !poisonUsed }));
                }
                
                const allNewActions = [...nightActions, ...actionsToAdd];
                setNightActions(allNewActions);
                
                if (nightStep < characterList.length - 1) {
                    setNightStep(s => s + 1);
                } else {
                    processNightResults(allNewActions);
                }
            };

            const validPoisonTargets = getValidTargets('Hexe', actors.map(a => a.id), livingPlayers);
            const canHeal = isGauklerActing || witchPotions.heal;
            const canPoison = isGauklerActing || witchPotions.poison;

            return (
                <div className="action-panel">
                    <h4>Aktion für: {isGauklerActing ? `${actors[0].name} (als Hexe)` : 'Hexe'}</h4>
                    <div className="action-control">
                        <label>Heiltrank benutzen { !isGauklerActing && `(verbleibend: ${witchPotions.heal ? 'Ja' : 'Nein'})`}</label>
                        <select value={witchHealTarget} onChange={e => setWitchHealTarget(e.target.value)} disabled={!canHeal || deathTargets.length === 0}>
                            <option value="">Keinen Heiltrank benutzen</option>
                            {deathTargets.map(({ victimId, attackerRole }) => (
                                <option key={victimId} value={victimId}>
                                    {getPlayerNameById(victimId)} (Opfer von: {attackerRole})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="action-control">
                        <label>Gifttrank benutzen { !isGauklerActing && `(verbleibend: ${witchPotions.poison ? 'Ja' : 'Nein'})`}</label>
                        <select value={witchPoisonTarget} onChange={e => setWitchPoisonTarget(e.target.value)} disabled={!canPoison}>
                            <option value="">Keinen Gifttrank benutzen</option>
                            {validPoisonTargets.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({players.find(pl => pl.id === p.id)?.role?.name})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="navigation-buttons" style={{marginTop: '1rem'}}>
                        <button className="primary-button" onClick={handleWitchConfirm}>Aktion(en) bestätigen & Weiter</button>
                    </div>
                </div>
            );
        }

        const handleSubmit = () => {
          let targets: string[] = [];
          if (['target_one', 'protect', 'see_role', 'infect'].includes(currentChar.actionType!)) {
            if (!actionTarget1) { alert("Bitte ein Ziel auswählen."); return; }
            targets = [actionTarget1];
          } else if (['target_two', 'bewitch'].includes(currentChar.actionType!)) {
            if (!actionTarget1 || !actionTarget2 || actionTarget1 === actionTarget2) { alert("Bitte zwei verschiedene Ziele auswählen."); return; }
            targets = [actionTarget1, actionTarget2];
          }
          
          if (isGauklerActing) {
              setCompletedOneTimeActions(prev => new Set(prev).add(`${currentChar.name}-Gaukler`));
          }
          
          const action: NightAction = { actorIds: actors.map(a => a.id), roleName: currentChar.name, targetIds: targets, actionType: currentChar.actionType };
          confirmAction(action);
        };

        const handleSkip = () => {
            confirmAction({ actorIds: actors.map(a => a.id), roleName: currentChar.name, targetIds: [] });
        };
        
        const renderTargetSelector = (label: string, value: string, onChange: (val: string) => void, exclude: string[] = [], actorIds: string[] = []) => {
            const validTargets = getValidTargets(currentChar.name, actorIds, livingPlayers).filter(p => !exclude.includes(p.id));
            return (
                <div className="action-control">
                    <label>{label}</label>
                    <select value={value} onChange={e => onChange(e.target.value)}>
                        <option value="">Wähle ein Ziel...</option>
                        {validTargets.map(p => <option key={p.id} value={p.id}>{p.name} ({players.find(pl => pl.id === p.id)?.role?.name})</option>)}
                    </select>
                </div>
            );
        }
        
        const actorIds = actors.map(a => a.id);
        const actionType = currentChar.actionType;
        const isOptional = ['Heiler', 'Weißer Werwolf', 'Urwolf', 'Großer böser Wolf', 'Hexe'].includes(currentChar.name);

        return (
            <div className="action-panel">
                 <h4>Aktion für: {isGauklerActing ? `${actors[0].name} (als ${currentChar.name})` : currentChar.name}</h4>
                 {(actionType === 'target_one' || actionType === 'protect' || actionType === 'see_role' || actionType === 'infect') &&
                        renderTargetSelector("Ziel:", actionTarget1, setActionTarget1, [], actorIds)}
                 {(actionType === 'target_two' || actionType === 'bewitch') && (<>
                        {renderTargetSelector("Ziel 1:", actionTarget1, setActionTarget1, [actionTarget2], actorIds)}
                        {renderTargetSelector("Ziel 2:", actionTarget2, setActionTarget2, [actionTarget1], actorIds)}</>)}
                <div className="navigation-buttons" style={{marginTop: '1rem'}}>
                    {isOptional && <button className="secondary-button" onClick={handleSkip}>Aktion überspringen</button>}
                    <button className="primary-button" onClick={handleSubmit}>Aktion bestätigen & Weiter</button>
                </div>
            </div>
        )
    }
    
    const renderPhaseBase = (title: string, characterList: Character[]) => {
      if (nightStep >= characterList.length) {
         // This can happen if the last active role gets disabled mid-phase
         return <div>Rollenaktionen abgeschlossen. Verarbeite...</div>;
      }
      const currentRole = characterList[nightStep];
      if (!currentRole) return <div>Lade...</div>;
      
      const playersWithCurrentRole = nightPlayers.filter(p => p.role?.name === currentRole.name && p.isAlive);
      const isGauklerActing = players.find(p => p.id === playersWithCurrentRole[0]?.id)?.role?.name === 'Gaukler';
      
      return (
            <div className="phase-container">
                <h2>{title}</h2>
                <p>Aktive Rolle: <strong>{currentRole.name}</strong></p>
                <p>Spieler: {playersWithCurrentRole.map(p => p.name).join(', ')}{isGauklerActing ? ` (als ${currentRole.name})` : ''} </p>
                <ul className="night-order-list">
                    {characterList.map((char, index) => (
                        <li key={char.name} className={`${index === nightStep ? 'active' : ''} ${completedOneTimeActions.has(char.name) ? 'completed' : ''}`}>
                            {char.nightOrder}. {char.name}
                        </li>
                    ))}
                </ul>
                {renderActionComponent()}
                 <button className="tertiary-button" onClick={handleGoToSetup}>Spiel neustarten</button>
            </div>
      );
    }
    
    const renderPreNight = () => {
        if (nightStep >= preNightOrderCharacters.length) {
            processPreNightResults(nightActions, players);
            setGamePhase('pre_night_result');
            return <div>Lade Vorrunden-Ergebnis...</div>;
        }
        return renderPhaseBase("Vorrunde (Setup)", preNightOrderCharacters);
    };

    const renderPreNightResult = () => {
        const werwoelfe = players.filter(p => p.role?.team === 'Wolf').map(p => p.name);
        const schwestern = players.filter(p => p.role?.name === 'Zwei Schwestern').map(p => p.name);
        const brueder = players.filter(p => p.role?.name === 'Drei Brüder').map(p => p.name);

        return (
            <div className="phase-container">
                <h2>Ergebnis der Vorrunde</h2>
                <div className="pre-night-result-box">
                    <h3>Setup-Informationen</h3>
                    <ul>
                        {werwoelfe.length > 0 && <li>Die Werwölfe sind: <strong>{werwoelfe.join(', ')}</strong></li>}
                        {lovers && <li>Das Liebespaar ist: <strong>{getPlayerNameById(lovers[0])} & {getPlayerNameById(lovers[1])}</strong></li>}
                        {schwestern.length > 0 && <li>Die zwei Schwestern sind: <strong>{schwestern.join(', ')}</strong></li>}
                        {brueder.length > 0 && <li>Die drei Brüder sind: <strong>{brueder.join(', ')}</strong></li>}
                        {wildChildModelId && <li>Das Vorbild des Wilden Kindes ist: <strong>{getPlayerNameById(wildChildModelId)}</strong></li>}
                        {gameLog.find(e => e.type === 'pre_night')?.events.length === 0 && werwoelfe.length === 0 && !lovers && <p>Keine besonderen Vorkommnisse in der Vorrunde.</p>}
                    </ul>
                </div>
                 <button className="primary-button" onClick={() => { setGamePhase('night'); setNightStep(0); }}>Nacht 1 beginnen</button>
            </div>
        )
    };

    const renderNight = () => {
      const gaukler = players.find(p => p.isAlive && p.role?.name === 'Gaukler');
      const hasGauklerAction = gaukler && !gauklerChosenRoleForNight && gauklerRepertoire.length > 0;

      if (hasGauklerAction) {
          return (
              <div className="phase-container">
                  <h2>Nachtphase {nightCount} - Gaukler wählt</h2>
                  <p>{gaukler.name} darf eine Rolle für diese Nacht wählen.</p>
                  <div className="action-panel">
                      <h4>Wähle eine Rolle aus dem Repertoire:</h4>
                      <div className="character-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                          {gauklerRepertoire.map(role => (
                              <button key={role.name} className="primary-button" onClick={() => {
                                  setGauklerChosenRoleForNight(role);
                                  setGauklerRepertoire(prev => prev.filter(r => r.name !== role.name));
                                  const event = `${gaukler.name} (Gaukler) agiert diese Nacht als ${role.name}.`;
                                  setGameLog(prev => {
                                      const newLog = [...prev];
                                      let nightEntry = newLog.find(e => e.type === 'night' && e.round === nightCount);
                                      if (nightEntry) {
                                          nightEntry.events.unshift(event);
                                      } else {
                                          newLog.push({ round: nightCount, type: 'night', events: [event] });
                                      }
                                      return newLog;
                                  });
                              }}>
                                  {role.name}
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          );
      }

      if(nightStep >= nightOrderCharacters.length) {
         processNightResults(nightActions);
         return <div>Verarbeite Nacht...</div>
      }
      return renderPhaseBase(`Nachtphase ${nightCount}`, nightOrderCharacters);
    };

    const renderNightResult = () => (
        <div className="phase-container">
            <h2>Ergebnis der Nacht {nightCount}</h2>
            <div className="night-result-box">
                <h3>Zusammenfassung</h3>
                <p className="summary-text">{nightResult?.summary}</p>
                <h4>Details:</h4>
                <ul className="log-details">
                    {nightResult?.details.map((detail, index) => <li key={index}>{detail}</li>)}
                </ul>
            </div>
            <button className="primary-button" onClick={() => { 
                // Bärenführer check
                const baerenfuehrer = players.find(p => p.isAlive && p.role?.name === 'Bärenführer');
                if (baerenfuehrer) {
                    const neighbors = getNeighbors(baerenfuehrer.id, players);
                    const isNextToWolf = (neighbors.left?.role?.team === 'Wolf') || (neighbors.right?.role?.team === 'Wolf');
                    setBearGrowl(isNextToWolf);
                } else {
                    setBearGrowl(false);
                }
                
                setGamePhase('day_discussion'); 
                handleTimerReset();
                // Reset voting rights for next day, in case Scapegoat was used
                setPlayers(prev => prev.map(p => ({...p, canVote: p.id === dorfdeppRevealedId ? false : true })))
            }}>Zur Tagesphase</button>
        </div>
    );
    
    const renderDayDiscussion = () => (
        <div className="phase-container">
            <h2>Tagphase {nightCount}</h2>
            {bearGrowl && <div className="bear-growl-alert">🐻 KNURREN! Der Bärenführer sitzt neben einem Werwolf! 🐻</div>}
            <div className="timer-display">{formatTime(timeLeft)}</div>
            <div className="timer-controls">
                <select value={timerDuration} onChange={e => handleTimerDurationChange(parseInt(e.target.value))}>
                    {[1, 2, 3, 4, 5].map(min => <option key={min} value={min * 60}>{min} Minute{min > 1 && 'n'}</option>)}
                </select>
                <button className="primary-button" onClick={handleTimerStartPause}>{isTimerRunning ? 'Pause' : 'Start'}</button>
                <button className="secondary-button" onClick={handleTimerReset}>Reset</button>
            </div>
            <div className="day-actions">
              <button className="secondary-button" onClick={() => setViewingLog(true)}>Spielverlauf</button>
              {nightCount === 1 && !captainId && <button className="primary-button" onClick={() => setGamePhase('captain_selection')}>Hauptmann wählen</button>}
              <button className="primary-button" onClick={() => { setIsJudgeSecondVote(false); setNominatedPlayerIds([]); setGamePhase('nomination'); }}>Nominierung</button>
            </div>
        </div>
    );
    
    const renderCaptainSelection = () => (
        <div className="phase-container">
            <h2>Hauptmann wählen</h2>
            <p>Wähle den ersten Hauptmann des Spiels. Seine Stimme zählt doppelt.</p>
            <div className="character-grid">
                {livingPlayers.map(p => (
                    <div key={p.id} className={`character-card nomination-card ${captainId === p.id ? 'selected' : ''}`} onClick={() => setCaptainId(p.id)}>
                        <span>{p.name}</span>
                        <span className="role-in-card">{p.role?.name}</span>
                    </div>
                ))}
            </div>
            <div className="navigation-buttons">
                <button className="secondary-button" onClick={() => setGamePhase('day_discussion')}>Zurück</button>
                <button className="primary-button" disabled={!captainId} onClick={() => {
                    const event = `${getPlayerNameById(captainId!)} wurde zum Hauptmann gewählt.`;
                    setGameLog(prev => [...prev, { round: nightCount, type: 'day', events: [event] }]);
                    setGamePhase('day_discussion');
                }}>Bestätigen</button>
            </div>
        </div>
    );

    const renderNomination = () => (
        <div className="phase-container">
            <h2>{isJudgeSecondVote ? 'Richter-Abstimmung: Nominierung' : 'Nominierung'}</h2>
            <p>{isJudgeSecondVote ? 'Der Richter verlangt eine zweite Abstimmung ohne Diskussion.' : 'Wähle 2 oder 3 Spieler aus, die an den Pranger gestellt werden sollen.'}</p>
            <div className="character-grid">
                {livingPlayers.map(p => (
                    <div key={p.id} className={`character-card nomination-card ${nominatedPlayerIds.includes(p.id) ? 'selected' : ''}`} onClick={() => handleNominationToggle(p.id)}>
                        <span>{p.name}</span>
                        <span className="role-in-card">{p.role?.name}</span>
                    </div>
                ))}
            </div>
            <p>Nominiert: {nominatedPlayerIds.length} / 3</p>
            <div className="navigation-buttons">
                <button className="secondary-button" onClick={() => setGamePhase('day_discussion')}>Zurück</button>
                <button className="primary-button" disabled={nominatedPlayerIds.length < 2 || nominatedPlayerIds.length > 3} onClick={startVoting}>Abstimmung starten</button>
            </div>
        </div>
    );

    const renderVoting = () => {
        const nomineeId = nominatedPlayerIds[currentVoteIndex];
        const nomineeName = getPlayerNameById(nomineeId);
        const currentVotes = votes[nomineeId] || new Set();

        return (
            <div className="phase-container">
                <h2>{isRunOffVote ? 'Stichwahl' : isJudgeSecondVote ? 'Richter-Abstimmung' : 'Abstimmung'}</h2>
                <h3>Wer stimmt für <strong>{nomineeName}</strong>?</h3>
                <p>Wähle alle Spieler aus, die für den aktuellen Kandidaten stimmen.</p>
                <div className="character-grid">
                    {voters.map(p => (
                        <div key={p.id} className={`character-card voter-card ${currentVotes.has(p.id) ? 'selected' : ''}`} onClick={() => handleVoteToggle(p.id)}>
                            {p.name}
                            <span className="role-in-card">{p.role?.name} {p.id === captainId && <strong>(x2)</strong>}</span>
                        </div>
                    ))}
                </div>
                <div className="navigation-buttons">
                    <button className="primary-button" onClick={nextVote}>
                        {currentVoteIndex < nominatedPlayerIds.length - 1 ? 'Nächster Kandidat' : 'Abstimmung beenden'}
                    </button>
                </div>
            </div>
        );
    };

    const renderLynchResult = () => {
        const richter = players.find(p => p.isAlive && p.role?.name === 'Stotternder Richter');
        const canRichterAct = richter && !completedOneTimeActions.has('Stotternder Richter');

        return (
            <div className="phase-container">
                <h2>Ergebnis der Abstimmung</h2>
                <div className="night-result-box">
                    <h3>Zusammenfassung</h3>
                    <p className="summary-text">{lynchResult.message}</p>
                </div>
                {canRichterAct && (
                    <div className="day-actions">
                         <button className="secondary-button" style={{borderColor: 'var(--selected-color)'}} onClick={() => {
                             setCompletedOneTimeActions(prev => new Set(prev).add('Stotternder Richter'));
                             setIsJudgeSecondVote(true);
                             const event = `Der stotternde Richter (${richter.name}) verlangt eine zweite Abstimmung!`;
                             const latestLog = gameLog[gameLog.length - 1];
                             if(latestLog) latestLog.events.push(event);
                             setNominatedPlayerIds([]);
                             setGamePhase('nomination');
                         }}>
                            Richter verlangt 2. Abstimmung
                        </button>
                    </div>
                )}
                <button className="primary-button" onClick={() => { setGamePhase('night'); setNightStep(0); setNightCount(prev => prev + 1); }}>Zur Nacht {nightCount + 1}</button>
            </div>
        );
    };
    
    const renderGameOver = () => (
        <div className="phase-container">
            <h2>Spiel beendet!</h2>
            <div className="night-result-box">
                <h3>Ergebnis</h3>
                <p className="summary-text">{gameOver?.message}</p>
            </div>
             <div className="navigation-buttons">
                <button className="secondary-button" onClick={() => setViewingLog(true)}>Spielverlauf ansehen</button>
                <button className="primary-button" onClick={handleGoToSetup}>Neues Spiel starten</button>
            </div>
        </div>
    );
    
    const renderHunterAction = () => {
        if (!playerToTakeHunterShot) return null;
        
        const hunterName = getPlayerNameById(playerToTakeHunterShot.playerId);
        const relevantResult = playerToTakeHunterShot.source === 'day' ? lynchResult.message : nightResult?.summary;

        return (
            <div className="phase-container">
                <h2>Aktion des Jägers</h2>
                 <div className="night-result-box" style={{borderColor: 'var(--selected-color)'}}>
                    <h3>Letzter Wille</h3>
                    <p className="summary-text">{relevantResult}</p>
                    <p><strong>{hunterName}</strong> war der Jäger und darf einen letzten Schuss abfeuern!</p>
                </div>
                <div className="action-panel">
                    <h4>Wen nimmt der Jäger mit in den Tod?</h4>
                    <select value={hunterShotTarget} onChange={e => setHunterShotTarget(e.target.value)} className="action-control">
                        <option value="">Wähle ein Ziel...</option>
                        {livingPlayers.map(p => (
                            <option key={p.id} value={p.id}>
                                {p.name} ({p.role?.name})
                            </option>
                        ))}
                    </select>
                    <div className="navigation-buttons">
                        <button className="primary-button" disabled={!hunterShotTarget} onClick={() => handleHunterShot(hunterShotTarget)}>Schuss abfeuern</button>
                    </div>
                </div>
            </div>
        )
    }

    const renderCaptainTransfer = () => {
        if (!playerToElectCaptain) return null;

        const deadCaptainName = getPlayerNameById(playerToElectCaptain.id);

        return (
            <div className="phase-container">
                <h2>Nachfolge des Hauptmanns</h2>
                <div className="night-result-box" style={{borderColor: 'var(--selected-color)'}}>
                    <p><strong>{deadCaptainName}</strong>, der Hauptmann, ist gestorben!</p>
                    <p>Er muss einen Nachfolger bestimmen.</p>
                </div>
                <div className="action-panel">
                    <h4>Wähle den neuen Hauptmann:</h4>
                     <select value={newCaptainTarget} onChange={e => setNewCaptainTarget(e.target.value)} className="action-control">
                        <option value="">Wähle einen Nachfolger...</option>
                        {livingPlayers.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                    <div className="navigation-buttons">
                        <button className="primary-button" disabled={!newCaptainTarget} onClick={() => {
                            setCaptainId(newCaptainTarget);
                            const event = `${deadCaptainName} hat im Tod ${getPlayerNameById(newCaptainTarget)} zum neuen Hauptmann ernannt.`;
                            const latestLog = gameLog[gameLog.length - 1];
                            if(latestLog) latestLog.events.push(event); else setGameLog(prev => [...prev, {round: nightCount, type: 'day', events: [event]}]);
                            
                            setPlayerToElectCaptain(null); // Clear this action first

                            // Check if a hunter shot from the same event is pending
                            if (playerToTakeHunterShot && playerToTakeHunterShot.source === playerToElectCaptain.source) {
                                setGamePhase('hunter_action');
                            } else {
                                // Otherwise, proceed to the normal result screen
                                setGamePhase(playerToElectCaptain.source === 'day' ? 'lynch_result' : 'night_result');
                            }
                        }}>Nachfolger bestätigen</button>
                    </div>
                </div>
            </div>
        );
    }
    
    const renderScapegoatAction = () => {
        if (!scapegoatPunisherId) return null;

        const scapegoatName = getPlayerNameById(scapegoatPunisherId);

        const handleVoterSelectionToggle = (id: string) => {
            setScapegoatSelectedVoters(prev => {
                const newSelection = new Set(prev);
                if (newSelection.has(id)) newSelection.delete(id);
                else newSelection.add(id);
                return Array.from(newSelection);
            });
        };

        return (
            <div className="phase-container">
                <h2>Letzte Amtshandlung des Sündenbocks</h2>
                <div className="night-result-box" style={{borderColor: 'var(--selected-color)'}}>
                     <p><strong>{scapegoatName}</strong> (Sündenbock) ist gestorben!</p>
                    <p>Er darf bestimmen, welche Spieler am nächsten Tag wählen dürfen.</p>
                </div>
                <div className="action-panel">
                    <h4>Wähle die Spieler aus, die Stimmrecht haben:</h4>
                    <div className="character-grid">
                        {livingPlayers.map(p => (
                             <div key={p.id} className={`character-card voter-card ${scapegoatSelectedVoters.includes(p.id) ? 'selected' : ''}`} onClick={() => handleVoterSelectionToggle(p.id)}>
                                {p.name}
                            </div>
                        ))}
                    </div>
                     <div className="navigation-buttons">
                        <button className="primary-button" onClick={() => {
                             const event = `${scapegoatName} hat entschieden, dass nur ${scapegoatSelectedVoters.map(id => getPlayerNameById(id)).join(', ')} am nächsten Tag wählen dürfen.`;
                             const latestLog = gameLog[gameLog.length - 1];
                             latestLog.events.push(event);
                             setGameLog([...gameLog.slice(0, -1), latestLog]);

                             setPlayers(prevPlayers => prevPlayers.map(p => {
                                 if (!p.isAlive) return p;
                                 return {...p, canVote: scapegoatSelectedVoters.includes(p.id)}
                             }));

                             setGamePhase('lynch_result');
                             setScapegoatPunisherId(null);
                             setScapegoatSelectedVoters([]);
                        }}>Auswahl bestätigen</button>
                    </div>
                </div>
            </div>
        );
    }
    
    const renderErgebeneMagdAction = () => {
        if (!ergebeneMagdAction) return null;
        const { lynchedPlayerId, magdPlayerId } = ergebeneMagdAction;
        const lynchedPlayerName = getPlayerNameById(lynchedPlayerId);
        const magdPlayerName = getPlayerNameById(magdPlayerId);

        const handleMagdChoice = (confirm: boolean) => {
            const latestLog = gameLog[gameLog.length - 1];
            if (confirm) {
                const lynchedPlayerRole = players.find(p => p.id === lynchedPlayerId)?.role;
                if (lynchedPlayerRole) {
                    setPlayers(prev => prev.map(p => p.id === magdPlayerId ? { ...p, role: lynchedPlayerRole } : p));
                    const event = `${magdPlayerName} (Ergebene Magd) offenbart sich und übernimmt die Rolle von ${lynchedPlayerName} (${lynchedPlayerRole.name}).`;
                    latestLog.events.push(event);
                    setCompletedOneTimeActions(prev => new Set(prev).add('Ergebene Magd'));
                }
            } else {
                latestLog.events.push(`${magdPlayerName} (Ergebene Magd) entscheidet sich, die Rolle nicht zu übernehmen.`);
            }
            setErgebeneMagdAction(null);
            continueLynchAfterMagd(lynchedPlayerId);
        };

        return (
            <div className="phase-container">
                <h2>Entscheidung der Ergebenen Magd</h2>
                <div className="night-result-box" style={{borderColor: 'var(--selected-color)'}}>
                    <p>{lynchResult.message}</p>
                    <p>Möchte <strong>{magdPlayerName}</strong> (Ergebene Magd) die Rolle des gelynchten Spielers übernehmen?</p>
                </div>
                <div className="navigation-buttons">
                    <button className="secondary-button" onClick={() => handleMagdChoice(false)}>Nein</button>
                    <button className="primary-button" onClick={() => handleMagdChoice(true)}>Ja, Rolle übernehmen</button>
                </div>
            </div>
        );
    };

    const renderGmOverlay = () => {
        const deadPlayers = players.filter(p => !p.isAlive);
        return (
            <div className="gm-overlay-modal" onClick={() => setIsGmOverlayVisible(false)}>
                <div className="gm-overlay-content" onClick={e => e.stopPropagation()}>
                    <button className="close-button" onClick={() => setIsGmOverlayVisible(false)}>×</button>
                    <h2>Spielübersicht</h2>
                    <div className="player-status-container">
                        <div className="player-status-list living">
                            <h3>Lebende Spieler ({livingPlayers.length})</h3>
                            <ul>
                                {livingPlayers.map(p => <li key={p.id}><span>{p.name}</span> <span>{p.role?.name}</span></li>)}
                            </ul>
                        </div>
                        <div className="player-status-list dead">
                             <h3>Tote Spieler ({deadPlayers.length})</h3>
                            <ul>
                                {deadPlayers.map(p => <li key={p.id}><span>{p.name}</span> <span>{p.role?.name}</span></li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        );
    };


    const renderGameMasterFlow = () => {
        return (
            <div style={{position: 'relative', width: '100%'}}>
                <button className="gm-overlay-trigger" onClick={() => setIsGmOverlayVisible(true)}>Spielübersicht</button>
                <header><h1>Spielleiter-Modus</h1></header>
                {viewingLog && renderGameLogModal()}
                {isGmOverlayVisible && renderGmOverlay()}
                {(() => {
                    switch (gamePhase) {
                        case 'player_count': return renderPlayerCount();
                        case 'name_entry': return renderNameEntry();
                        case 'role_selection': return renderRoleSelection();
                        case 'role_assignment': return renderRoleAssignment();
                        case 'greis_group_selection': return renderGreisGroupSelection();
                        case 'pre_night': return renderPreNight();
                        case 'pre_night_result': return renderPreNightResult();
                        case 'night': return renderNight();
                        case 'night_result': return renderNightResult();
                        case 'day_discussion': return renderDayDiscussion();
                        case 'captain_selection': return renderCaptainSelection();
                        case 'captain_transfer': return renderCaptainTransfer();
                        case 'scapegoat_action': return renderScapegoatAction();
                        case 'ergebene_magd_action': return renderErgebeneMagdAction();
                        case 'nomination': return renderNomination();
                        case 'voting': return renderVoting();
                        case 'lynch_result': return renderLynchResult();
                        case 'hunter_action': return renderHunterAction();
                        case 'game_over': return renderGameOver();
                        default: return <div>Error: Unknown game phase '{gamePhase}'</div>;
                    }
                })()}
            </div>
        );
    };

  const renderContent = () => {
    switch (appMode) {
      case 'splash': return renderSplashScreen();
      case 'spieler': return renderPlayerView();
      case 'spielleiter': return renderGameMasterFlow();
      case 'statistik': return renderStatisticsPage();
      case 'menu': default: return renderMainMenu();
    }
  };

  return <main className="app-container">{renderContent()}</main>;
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);