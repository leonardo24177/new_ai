// lib/onboarding/config.ts
// Configurazione completa del flusso onboarding — versione con Google Drive

export type Ambito = 'lavoro' | 'studio' | 'personale'
export type Professione =
  | 'avvocato' | 'notaio' | 'magistrato' | 'consulente_lavoro'
  | 'commercialista' | 'revisore_contabile'
  | 'medico' | 'farmacista' | 'psicologo' | 'fisioterapista'
  | 'ingegnere' | 'architetto' | 'geometra'
  | 'insegnante' | 'professore_universitario'
  | 'imprenditore' | 'manager' | 'libero_professionista'
  | 'giornalista' | 'editore' | 'ricercatore' | 'altro'

export interface Fonte {
  id: string
  label: string
  descrizione?: string
}

// ─── NUOVO ────────────────────────────────────────────────
export interface DriveFolder {
  folder_id: string    // ID cartella Google Drive
  nome: string         // Nome cartella (es. "Ricette di famiglia")
  contesto: string     // Descrizione libera dell'utente (es. "usala quando parlo di cucina o ingredienti")
}
// ──────────────────────────────────────────────────────────

export interface OnboardingData {
  nome: string
  ambito: Ambito | ''
  professione: Professione | ''
  utilizzo: string
  specializzazioni: string[]
  specializzazione_custom: string
  fonti: Fonte[]
  fonti_escluse: string[]
  citazione: 'sempre' | 'essenziale' | 'mai'
  conflitto_fonti: 'gerarchia' | 'entrambe' | 'chiedi'
  tono: 'formale' | 'diretto' | 'colloquiale'
  note_libere: string
  drive_folders: DriveFolder[]   // ← NUOVO: cartelle Google Drive collegate
}

// Il resto del file rimane identico...
// ============================================================
// UTILIZZI PER PROFESSIONE
// ============================================================
export const UTILIZZI: Record<Professione, { value: string; label: string }[]> = {
  avvocato: [
    { value: 'redazione_atti', label: 'Redazione atti processuali' },
    { value: 'ricerca_giurisprudenza', label: 'Ricerca giurisprudenza' },
    { value: 'gestione_clienti', label: 'Gestione clienti' },
    { value: 'preparazione_udienze', label: 'Preparazione udienze' },
    { value: 'pareri_legali', label: 'Redazione pareri legali' },
  ],
  notaio: [
    { value: 'atti_notarili', label: 'Redazione atti notarili' },
    { value: 'compravendite', label: 'Rogiti e compravendite' },
    { value: 'successioni', label: 'Successioni e testamenti' },
    { value: 'consulenza_societaria', label: 'Consulenza societaria' },
    { value: 'donazioni', label: 'Donazioni e liberalità' },
  ],
  magistrato: [
    { value: 'redazione_sentenze', label: 'Redazione sentenze e ordinanze' },
    { value: 'ricerca_giurisprudenza', label: 'Ricerca giurisprudenza' },
    { value: 'studio_fascicoli', label: 'Studio fascicoli processuali' },
    { value: 'motivazioni', label: 'Stesura motivazioni' },
  ],
  consulente_lavoro: [
    { value: 'gestione_paghe', label: 'Gestione paghe e contributi' },
    { value: 'contrattualistica', label: 'Contrattualistica del lavoro' },
    { value: 'vertenze', label: 'Vertenze e contenziosi' },
    { value: 'consulenza_hr', label: 'Consulenza HR aziendale' },
    { value: 'ammortizzatori', label: 'Ammortizzatori sociali' },
  ],
  commercialista: [
    { value: 'analisi_bilanci', label: 'Lettura e analisi bilanci' },
    { value: 'dichiarazioni_fiscali', label: 'Dichiarazioni fiscali' },
    { value: 'consulenza_aziendale', label: 'Consulenza aziendale' },
    { value: 'gestione_scadenze', label: 'Gestione scadenze' },
    { value: 'pianificazione_fiscale', label: 'Pianificazione fiscale' },
  ],
  revisore_contabile: [
    { value: 'revisione_bilanci', label: 'Revisione bilanci' },
    { value: 'controllo_interno', label: 'Controllo interno' },
    { value: 'relazioni_revisione', label: 'Redazione relazioni di revisione' },
    { value: 'compliance', label: 'Compliance normativa' },
  ],
  medico: [
    { value: 'redazione_referti', label: 'Redazione referti' },
    { value: 'ricerca_clinica', label: 'Ricerca clinica' },
    { value: 'gestione_pazienti', label: 'Gestione pazienti' },
    { value: 'normativa', label: 'Aggiornamento normativo' },
    { value: 'cartelle_cliniche', label: 'Cartelle cliniche' },
  ],
  farmacista: [
    { value: 'consulenza_farmacologica', label: 'Consulenza farmacologica' },
    { value: 'interazioni_farmaci', label: 'Verifica interazioni farmaci' },
    { value: 'normativa_aifa', label: 'Normativa AIFA e regolamentazione' },
    { value: 'gestione_magazzino', label: 'Gestione scorte e magazzino' },
  ],
  psicologo: [
    { value: 'relazioni_cliniche', label: 'Redazione relazioni cliniche' },
    { value: 'documentazione', label: 'Documentazione e cartelle' },
    { value: 'ricerca', label: 'Ricerca e letteratura scientifica' },
    { value: 'perizie', label: 'Perizie e consulenze tecniche' },
  ],
  fisioterapista: [
    { value: 'piani_terapeutici', label: 'Piani terapeutici' },
    { value: 'relazioni_cliniche', label: 'Relazioni cliniche' },
    { value: 'linee_guida', label: 'Linee guida e protocolli' },
    { value: 'documentazione', label: 'Documentazione paziente' },
  ],
  ingegnere: [
    { value: 'relazioni_tecniche', label: 'Relazioni tecniche' },
    { value: 'calcoli_strutturali', label: 'Calcoli strutturali' },
    { value: 'pratiche_edilizie', label: 'Pratiche e permessi edilizi' },
    { value: 'collaudi', label: 'Collaudi e certificazioni' },
    { value: 'normativa_tecnica', label: 'Ricerca normativa tecnica' },
    { value: 'capitolati', label: 'Capitolati e appalti' },
  ],
  architetto: [
    { value: 'relazioni_tecniche', label: 'Redazione relazioni tecniche' },
    { value: 'pratiche_comunali', label: 'Gestione pratiche comunali' },
    { value: 'computi_metrici', label: 'Computi metrici' },
    { value: 'normativa_edilizia', label: 'Ricerca normativa edilizia' },
    { value: 'progettazione', label: 'Documentazione di progetto' },
  ],
  geometra: [
    { value: 'pratiche_catastali', label: 'Pratiche catastali' },
    { value: 'perizie_immobiliari', label: 'Perizie immobiliari' },
    { value: 'pratiche_edilizie', label: 'Pratiche edilizie' },
    { value: 'computi_metrici', label: 'Computi metrici' },
    { value: 'successioni', label: 'Pratiche successorie' },
  ],
  insegnante: [
    { value: 'organizzare_lezioni', label: 'Organizzare lezioni' },
    { value: 'creare_esami', label: 'Creare verifiche ed esami' },
    { value: 'correzione', label: 'Correzione elaborati' },
    { value: 'comunicazione', label: 'Comunicazione con famiglie' },
    { value: 'programmazione', label: 'Programmazione didattica' },
  ],
  professore_universitario: [
    { value: 'ricerca', label: 'Ricerca e pubblicazioni' },
    { value: 'lezioni', label: 'Preparazione lezioni e corsi' },
    { value: 'tesi', label: 'Supervisione tesi' },
    { value: 'grant', label: 'Domande di finanziamento (grant)' },
    { value: 'peer_review', label: 'Peer review articoli scientifici' },
  ],
  imprenditore: [
    { value: 'analisi_dati', label: 'Analisi dati aziendali' },
    { value: 'marketing', label: 'Comunicazione e marketing' },
    { value: 'fornitori', label: 'Gestione fornitori' },
    { value: 'reportistica', label: 'Reportistica e KPI' },
    { value: 'business_plan', label: 'Business plan e strategie' },
  ],
  manager: [
    { value: 'reportistica', label: 'Report e presentazioni' },
    { value: 'gestione_team', label: 'Gestione team e HR' },
    { value: 'budget', label: 'Budget e pianificazione' },
    { value: 'analisi_dati', label: 'Analisi dati e KPI' },
    { value: 'comunicazione_interna', label: 'Comunicazione interna' },
  ],
  libero_professionista: [
    { value: 'preventivi', label: 'Preventivi e offerte' },
    { value: 'contratti', label: 'Contratti con clienti' },
    { value: 'fatturazione', label: 'Fatturazione e contabilità' },
    { value: 'comunicazione', label: 'Comunicazione e marketing' },
    { value: 'generico', label: 'Uso generico professionale' },
  ],
  giornalista: [
    { value: 'ricerca_fonti', label: 'Ricerca e verifica fonti' },
    { value: 'redazione_articoli', label: 'Redazione articoli' },
    { value: 'interviste', label: 'Preparazione interviste' },
    { value: 'rassegna_stampa', label: 'Rassegna stampa' },
    { value: 'fact_checking', label: 'Fact-checking' },
  ],
  editore: [
    { value: 'editing', label: 'Editing e revisione testi' },
    { value: 'comunicazione_editoriale', label: 'Schede, sinossi e testi marketing' },
    { value: 'contratti_editoriali', label: 'Contratti con autori e agenti' },
    { value: 'scouting', label: 'Valutazione manoscritti' },
    { value: 'marketing_editoriale', label: 'Marketing e promozione libri' },
  ],
  ricercatore: [
    { value: 'letteratura', label: 'Revisione letteratura scientifica' },
    { value: 'pubblicazioni', label: 'Redazione pubblicazioni' },
    { value: 'grant', label: 'Domande di finanziamento' },
    { value: 'analisi_dati', label: 'Analisi e interpretazione dati' },
    { value: 'presentazioni', label: 'Presentazioni e conferenze' },
  ],
  altro: [
    { value: 'generico', label: 'Uso generico' },
  ],
}

// ============================================================
// SPECIALIZZAZIONI (invariate)
// ============================================================
export const SPECIALIZZAZIONI: Record<string, { value: string; label: string }[]> = {
  'avvocato_redazione_atti': [
    { value: 'penale', label: 'Diritto penale' },
    { value: 'civile', label: 'Diritto civile' },
    { value: 'lavoro', label: 'Diritto del lavoro' },
    { value: 'societario', label: 'Diritto societario' },
    { value: 'amministrativo', label: 'Diritto amministrativo' },
    { value: 'bancario', label: 'Diritto bancario e finanziario' },
    { value: 'fallimentare', label: 'Diritto fallimentare' },
    { value: 'tributario', label: 'Diritto tributario' },
    { value: 'internazionale', label: 'Diritto internazionale' },
    { value: 'famiglia', label: 'Diritto di famiglia' },
    { value: 'successioni', label: 'Diritto successorio' },
    { value: 'immobiliare', label: 'Diritto immobiliare' },
    { value: 'assicurativo', label: 'Diritto assicurativo' },
    { value: 'sanitario', label: 'Diritto sanitario' },
    { value: 'ambientale', label: 'Diritto ambientale' },
    { value: 'informatico', label: 'Diritto informatico e privacy' },
    { value: 'sportivo', label: 'Diritto sportivo' },
    { value: 'europeo', label: 'Diritto europeo' },
  ],
  'avvocato_ricerca_giurisprudenza': [
    { value: 'penale', label: 'Penale' },
    { value: 'civile', label: 'Civile' },
    { value: 'tributario', label: 'Tributario' },
    { value: 'amministrativo', label: 'Amministrativo' },
    { value: 'bancario', label: 'Bancario' },
    { value: 'lavoro', label: 'Lavoro' },
    { value: 'famiglia', label: 'Famiglia' },
    { value: 'fallimentare', label: 'Fallimentare' },
  ],
  'avvocato_gestione_clienti': [
    { value: 'civile', label: 'Civile e contrattuale' },
    { value: 'penale', label: 'Penale' },
    { value: 'lavoro', label: 'Lavoro e previdenza' },
    { value: 'famiglia', label: 'Famiglia e separazioni' },
    { value: 'societario', label: 'Societario e commerciale' },
    { value: 'tributario', label: 'Tributario e fiscale' },
    { value: 'immobiliare', label: 'Immobiliare' },
    { value: 'amministrativo', label: 'Amministrativo' },
  ],
  'avvocato_preparazione_udienze': [
    { value: 'civile', label: 'Civile — Tribunale ordinario' },
    { value: 'penale', label: 'Penale — Tribunale/GUP/Corte Assise' },
    { value: 'lavoro', label: 'Lavoro — Sezione lavoro' },
    { value: 'amministrativo', label: 'Amministrativo — TAR/Consiglio di Stato' },
    { value: 'tributario', label: 'Tributario — Corte di Giustizia Tributaria' },
    { value: 'cassazione', label: 'Cassazione — ricorso per legittimità' },
    { value: 'arbitrato', label: 'Arbitrato — procedura arbitrale' },
  ],
  'avvocato_pareri_legali': [
    { value: 'civile', label: 'Civile e contrattuale' },
    { value: 'societario', label: 'Societario e commerciale' },
    { value: 'lavoro', label: 'Lavoro e previdenza' },
    { value: 'tributario', label: 'Tributario e fiscale' },
    { value: 'immobiliare', label: 'Immobiliare e urbanistica' },
    { value: 'amministrativo', label: 'Amministrativo e appalti' },
    { value: 'informatico', label: 'Privacy e diritto digitale' },
    { value: 'penale', label: 'Penale d\'impresa' },
  ],
  'notaio_atti_notarili': [
    { value: 'immobiliare', label: 'Immobiliare' },
    { value: 'societario', label: 'Societario' },
    { value: 'famiglia', label: 'Famiglia e successioni' },
    { value: 'trust', label: 'Trust e fondazioni' },
  ],
  'ingegnere_relazioni_tecniche': [
    { value: 'civile', label: 'Ingegneria civile' },
    { value: 'strutturale', label: 'Ingegneria strutturale' },
    { value: 'impiantistica', label: 'Impiantistica' },
    { value: 'ambientale', label: 'Ingegneria ambientale' },
    { value: 'elettrica', label: 'Ingegneria elettrica' },
    { value: 'meccanica', label: 'Ingegneria meccanica' },
    { value: 'informatica', label: 'Ingegneria informatica' },
    { value: 'industriale', label: 'Ingegneria industriale' },
  ],
  'ingegnere_normativa_tecnica': [
    { value: 'edilizia', label: 'Normativa edilizia' },
    { value: 'antincendio', label: 'Prevenzione incendi' },
    { value: 'sicurezza', label: 'Sicurezza sul lavoro' },
    { value: 'ambientale', label: 'Normativa ambientale' },
    { value: 'elettrica', label: 'Normativa elettrica (CEI)' },
  ],
  'commercialista_analisi_bilanci': [
    { value: 'pmi', label: 'PMI' },
    { value: 'grandi_imprese', label: 'Grandi imprese' },
    { value: 'startup', label: 'Startup' },
    { value: 'enti_no_profit', label: 'Enti no profit' },
    { value: 'internazionale', label: 'Consolidati internazionali' },
  ],
  'commercialista_dichiarazioni_fiscali': [
    { value: 'persone_fisiche', label: 'Persone fisiche' },
    { value: 'societa', label: 'Società' },
    { value: 'enti', label: 'Enti e associazioni' },
    { value: 'internazionale', label: 'Fiscalità internazionale' },
  ],
  'commercialista_consulenza_aziendale': [
    { value: 'startup', label: 'Startup e nuove imprese' },
    { value: 'ristrutturazione', label: 'Ristrutturazione aziendale' },
    { value: 'ma', label: 'M&A e operazioni straordinarie' },
    { value: 'internazionale', label: 'Operazioni internazionali' },
    { value: 'successione_aziendale', label: 'Passaggio generazionale' },
    { value: 'crisi', label: 'Crisi d\'impresa (D.Lgs. 14/2019)' },
  ],
  'commercialista_gestione_scadenze': [
    { value: 'iva', label: 'Scadenze IVA' },
    { value: 'f24', label: 'Modelli F24 e versamenti' },
    { value: 'dichiarazioni', label: 'Dichiarazioni periodiche' },
    { value: 'depositi', label: 'Depositi societari (CCIAA)' },
    { value: 'contributi', label: 'Contributi previdenziali' },
  ],
  'commercialista_pianificazione_fiscale': [
    { value: 'persone_fisiche', label: 'Persone fisiche e patrimoni' },
    { value: 'societa', label: 'Società e gruppi' },
    { value: 'holding', label: 'Strutture holding' },
    { value: 'internazionale', label: 'Tax planning internazionale' },
    { value: 'successoria', label: 'Pianificazione successoria' },
  ],
  'medico_redazione_referti': [
    { value: 'medicina_generale', label: 'Medicina generale' },
    { value: 'cardiologia', label: 'Cardiologia' },
    { value: 'neurologia', label: 'Neurologia' },
    { value: 'oncologia', label: 'Oncologia' },
    { value: 'pediatria', label: 'Pediatria' },
    { value: 'ortopedia', label: 'Ortopedia' },
    { value: 'radiologia', label: 'Radiologia' },
    { value: 'psichiatria', label: 'Psichiatria' },
    { value: 'dermatologia', label: 'Dermatologia' },
    { value: 'endocrinologia', label: 'Endocrinologia' },
    { value: 'gastroenterologia', label: 'Gastroenterologia' },
    { value: 'ginecologia', label: 'Ginecologia' },
    { value: 'urologia', label: 'Urologia' },
    { value: 'medicina_legale', label: 'Medicina legale' },
  ],
  'psicologo_relazioni_cliniche': [
    { value: 'clinica', label: 'Psicologia clinica' },
    { value: 'forense', label: 'Psicologia forense' },
    { value: 'lavoro', label: 'Psicologia del lavoro' },
    { value: 'neuropsicologia', label: 'Neuropsicologia' },
    { value: 'eta_evolutiva', label: 'Età evolutiva' },
  ],
  'insegnante_creare_esami': [
    { value: 'universita', label: 'Università' },
    { value: 'liceo', label: 'Liceo' },
    { value: 'media', label: 'Scuola media' },
    { value: 'professionale', label: 'Istituto professionale' },
    { value: 'primaria', label: 'Scuola primaria' },
  ],
  'insegnante_organizzare_lezioni': [
    { value: 'universita', label: 'Università' },
    { value: 'liceo', label: 'Liceo' },
    { value: 'media', label: 'Scuola media' },
    { value: 'professionale', label: 'Istituto professionale' },
    { value: 'primaria', label: 'Scuola primaria' },
  ],
  'giornalista_redazione_articoli': [
    { value: 'cronaca', label: 'Cronaca' },
    { value: 'politica', label: 'Politica' },
    { value: 'economia', label: 'Economia e finanza' },
    { value: 'cultura', label: 'Cultura e spettacolo' },
    { value: 'sport', label: 'Sport' },
    { value: 'scienza', label: 'Scienza e tecnologia' },
    { value: 'esteri', label: 'Esteri' },
    { value: 'investigativa', label: 'Giornalismo investigativo' },
  ],
  'editore_editing': [
    { value: 'narrativa', label: 'Narrativa' },
    { value: 'saggistica', label: 'Saggistica' },
    { value: 'ragazzi', label: 'Libri per bambini e ragazzi' },
    { value: 'scolastica', label: 'Editoria scolastica' },
    { value: 'scientifica', label: 'Testi scientifici e tecnici' },
    { value: 'fumetto', label: 'Fumetto e graphic novel' },
  ],
  'ricercatore_letteratura': [
    { value: 'medicina', label: 'Medicina e scienze biologiche' },
    { value: 'fisica', label: 'Fisica e matematica' },
    { value: 'scienze_sociali', label: 'Scienze sociali' },
    { value: 'umanistica', label: 'Area umanistica' },
    { value: 'ingegneria', label: 'Ingegneria e tecnologia' },
    { value: 'economia', label: 'Economia' },
    { value: 'giuridica', label: 'Area giuridica' },
  ],
}

// ============================================================
// FONTI DEFAULT (invariate)
// ============================================================
export const FONTI_DEFAULT: Record<string, Fonte[]> = {
  'avvocato_penale': [
    { id: 'cp', label: 'Codice Penale', descrizione: 'D.Lgs. 19 ottobre 1930 n. 1398' },
    { id: 'cpp', label: 'Codice di Procedura Penale', descrizione: 'D.Lgs. 22 settembre 1988 n. 447' },
    { id: 'cass_pen_ss', label: 'Cassazione Penale — Sezioni Unite', descrizione: 'Massime vincolanti' },
    { id: 'cass_pen', label: 'Cassazione Penale — Sezioni Semplici', descrizione: 'Giurisprudenza di legittimità' },
    { id: 'corte_cost', label: 'Corte Costituzionale', descrizione: 'Sentenze di incostituzionalità' },
    { id: 'cedu', label: 'CEDU', descrizione: 'Corte Europea dei Diritti dell\'Uomo' },
    { id: 'dottrina', label: 'Dottrina penalistica', descrizione: 'Letteratura giuridica' },
  ],
  'avvocato_civile': [
    { id: 'cc', label: 'Codice Civile', descrizione: 'R.D. 16 marzo 1942 n. 262' },
    { id: 'cpc', label: 'Codice di Procedura Civile', descrizione: 'R.D. 28 ottobre 1940 n. 1443' },
    { id: 'cass_civ_ss', label: 'Cassazione Civile — Sezioni Unite', descrizione: 'Massime vincolanti' },
    { id: 'cass_civ', label: 'Cassazione Civile — Sezioni Semplici', descrizione: 'Giurisprudenza di legittimità' },
    { id: 'corte_cost', label: 'Corte Costituzionale', descrizione: 'Sentenze di incostituzionalità' },
    { id: 'dottrina', label: 'Dottrina civilistica', descrizione: 'Letteratura giuridica' },
  ],
  'avvocato_lavoro': [
    { id: 'statuto_lav', label: 'Statuto dei Lavoratori', descrizione: 'L. 20 maggio 1970 n. 300' },
    { id: 'd_lgs_81', label: 'D.Lgs. 81/2015', descrizione: 'Jobs Act' },
    { id: 'cpc_lavoro', label: 'C.p.c. — Sezione lavoro', descrizione: 'Artt. 409 ss.' },
    { id: 'cass_lav', label: 'Cassazione Lavoro', descrizione: 'Giurisprudenza di legittimità' },
    { id: 'ccnl', label: 'CCNL di settore', descrizione: 'Contratti collettivi nazionali' },
    { id: 'dottrina', label: 'Dottrina giuslavoristica', descrizione: 'Letteratura specialistica' },
  ],
  'avvocato_societario': [
    { id: 'cc_societa', label: 'Codice Civile — Libro V', descrizione: 'Artt. 2247 ss.' },
    { id: 'tuf', label: 'TUF', descrizione: 'D.Lgs. 58/1998 — Testo Unico Finanza' },
    { id: 'tub', label: 'TUB', descrizione: 'D.Lgs. 385/1993 — Testo Unico Bancario' },
    { id: 'reg_consob', label: 'Regolamenti CONSOB', descrizione: 'Normativa mercati' },
    { id: 'cass_civ', label: 'Cassazione Civile', descrizione: 'Giurisprudenza societaria' },
    { id: 'dottrina', label: 'Dottrina commercialistica', descrizione: 'Letteratura specialistica' },
  ],
  'avvocato_tributario': [
    { id: 'tuir', label: 'TUIR', descrizione: 'D.P.R. 917/1986' },
    { id: 'iva', label: 'D.P.R. IVA', descrizione: 'D.P.R. 633/1972' },
    { id: 'statuto_contribuente', label: 'Statuto del Contribuente', descrizione: 'L. 212/2000' },
    { id: 'cass_trib', label: 'Cassazione Tributaria', descrizione: 'Giurisprudenza di legittimità' },
    { id: 'corte_giustizia_ue', label: 'Corte di Giustizia UE', descrizione: 'Giurisprudenza europea' },
    { id: 'ade_prassi', label: 'Prassi AdE', descrizione: 'Circolari e risoluzioni' },
    { id: 'dottrina', label: 'Dottrina tributaria', descrizione: 'Letteratura fiscale' },
  ],
  'avvocato_fallimentare': [
    { id: 'ccii', label: 'Codice della Crisi d\'Impresa', descrizione: 'D.Lgs. 14/2019' },
    { id: 'l_fall', label: 'Legge Fallimentare', descrizione: 'R.D. 267/1942 (residuale)' },
    { id: 'cc_societa', label: 'Codice Civile — norme societarie', descrizione: 'Responsabilità organi' },
    { id: 'cass_civ', label: 'Cassazione Civile', descrizione: 'Sezione fallimentare' },
    { id: 'dottrina', label: 'Dottrina concorsuale', descrizione: 'Letteratura specialistica' },
  ],
  'avvocato_amministrativo': [
    { id: 'cost', label: 'Costituzione', descrizione: 'Principi fondamentali PA' },
    { id: 'cpa', label: 'Codice del Processo Amministrativo', descrizione: 'D.Lgs. 104/2010' },
    { id: 'l241', label: 'L. 241/1990', descrizione: 'Procedimento amministrativo' },
    { id: 'cons_stato_ad_plen', label: 'Consiglio di Stato — Adunanza Plenaria', descrizione: 'Decisioni vincolanti' },
    { id: 'cons_stato', label: 'Consiglio di Stato', descrizione: 'Giurisprudenza amministrativa' },
    { id: 'tar', label: 'TAR', descrizione: 'Giurisprudenza di primo grado' },
    { id: 'dottrina', label: 'Dottrina amministrativistica', descrizione: 'Letteratura specialistica' },
  ],
  'avvocato_famiglia': [
    { id: 'cc_famiglia', label: 'Codice Civile — Libro I', descrizione: 'Artt. 79 ss.' },
    { id: 'l_divorzio', label: 'Legge sul Divorzio', descrizione: 'L. 898/1970' },
    { id: 'l_affidamento', label: 'L. 54/2006', descrizione: 'Affidamento condiviso' },
    { id: 'cass_civ', label: 'Cassazione Civile', descrizione: 'Sezione famiglia' },
    { id: 'cedu', label: 'CEDU', descrizione: 'Art. 8 — diritto alla vita familiare' },
    { id: 'dottrina', label: 'Dottrina familiare', descrizione: 'Letteratura specialistica' },
  ],
  'avvocato_internazionale': [
    { id: 'trattati_onu', label: 'Trattati ONU', descrizione: 'Convenzioni internazionali' },
    { id: 'tfue', label: 'TFUE', descrizione: 'Trattato sul Funzionamento dell\'UE' },
    { id: 'corte_giustizia_ue', label: 'Corte di Giustizia UE', descrizione: 'Giurisprudenza europea' },
    { id: 'reg_ue', label: 'Regolamenti UE', descrizione: 'Diritto europeo direttamente applicabile' },
    { id: 'l_218_95', label: 'L. 218/1995', descrizione: 'DIP italiano' },
    { id: 'dottrina', label: 'Dottrina internazionale', descrizione: 'Letteratura specialistica' },
  ],
  'avvocato_assicurativo': [
    { id: 'cap', label: 'Codice delle Assicurazioni Private', descrizione: 'D.Lgs. 209/2005' },
    { id: 'cc_assicurazione', label: 'Codice Civile — artt. 1882 ss.', descrizione: 'Contratto di assicurazione' },
    { id: 'ivass', label: 'Regolamenti IVASS', descrizione: 'Istituto per la Vigilanza sulle Assicurazioni' },
    { id: 'cass_civ_iii', label: 'Cassazione Civile — Sezione III', descrizione: 'Giurisprudenza RC e assicurazioni' },
    { id: 'dottrina', label: 'Dottrina assicurativistica', descrizione: 'Letteratura specialistica' },
  ],
  'avvocato_sanitario': [
    { id: 'l_24_2017', label: 'L. 24/2017 — Legge Gelli-Bianco', descrizione: 'Responsabilità medica e sicurezza cure' },
    { id: 'd_lgs_502', label: 'D.Lgs. 502/1992', descrizione: 'Riordino SSN' },
    { id: 'cc_responsabilita', label: 'Codice Civile — artt. 2043 ss.', descrizione: 'Responsabilità civile' },
    { id: 'linee_guida_snlg', label: 'Linee guida SNLG', descrizione: 'Standard di cura — ISS' },
    { id: 'cass_civ_iii', label: 'Cassazione Civile — Sezione III', descrizione: 'Responsabilità medica civile' },
    { id: 'cass_pen_iv', label: 'Cassazione Penale — Sezione IV', descrizione: 'Colpa medica penale' },
    { id: 'dottrina', label: 'Dottrina sanitaristica', descrizione: 'Letteratura specialistica' },
  ],
  'avvocato_ambientale': [
    { id: 'tua', label: 'T.U. Ambiente', descrizione: 'D.Lgs. 152/2006 — Codice dell\'Ambiente' },
    { id: 'd_lgs_231', label: 'D.Lgs. 231/2001', descrizione: 'Responsabilità enti — reati ambientali' },
    { id: 'direttive_ue_amb', label: 'Direttive UE Ambiente', descrizione: 'VIA, VAS, ETS, Habitat' },
    { id: 'cass_pen_iii', label: 'Cassazione Penale — Sezione III', descrizione: 'Reati ambientali' },
    { id: 'cons_stato', label: 'Consiglio di Stato', descrizione: 'Provvedimenti PA in materia ambientale' },
    { id: 'dottrina', label: 'Dottrina ambientalistica', descrizione: 'Letteratura specialistica' },
  ],
  'avvocato_informatico': [
    { id: 'gdpr', label: 'GDPR', descrizione: 'Reg. UE 2016/679 — Protezione dati personali' },
    { id: 'codice_privacy', label: 'Codice Privacy', descrizione: 'D.Lgs. 196/2003 (come modificato)' },
    { id: 'garante_privacy', label: 'Provvedimenti Garante Privacy', descrizione: 'Decisioni e linee guida GPDP' },
    { id: 'nis2', label: 'Direttiva NIS2', descrizione: 'Sicurezza delle reti e dei sistemi informativi' },
    { id: 'd_lgs_231_inf', label: 'D.Lgs. 231/2001 — reati informatici', descrizione: 'Artt. 24-bis' },
    { id: 'cass_pen_inf', label: 'Cassazione Penale', descrizione: 'Reati informatici' },
    { id: 'dottrina', label: 'Dottrina informatico-giuridica', descrizione: 'Letteratura specialistica' },
  ],
  'avvocato_sportivo': [
    { id: 'd_lgs_36_2021', label: 'D.Lgs. 36/2021', descrizione: 'Riforma dello sport' },
    { id: 'l_91_1981', label: 'L. 91/1981', descrizione: 'Rapporto di lavoro sportivo' },
    { id: 'cod_giustizia_coni', label: 'Codice di Giustizia Sportiva CONI', descrizione: 'Giustizia federale' },
    { id: 'reg_federali', label: 'Statuti e Regolamenti Federali', descrizione: 'CONI e federazioni di settore' },
    { id: 'cas', label: 'CAS — Tribunale Arbitrale dello Sport', descrizione: 'Arbitrato sportivo internazionale' },
    { id: 'cc_ass_sportive', label: 'Codice Civile — associazioni e società', descrizione: 'Artt. 36 ss. e 2247 ss.' },
    { id: 'dottrina', label: 'Dottrina sportivistica', descrizione: 'Letteratura specialistica' },
  ],
  'avvocato_europeo': [
    { id: 'tfue', label: 'TFUE', descrizione: 'Trattato sul Funzionamento dell\'UE' },
    { id: 'tue', label: 'TUE', descrizione: 'Trattato sull\'Unione Europea' },
    { id: 'cdfue', label: 'Carta dei Diritti Fondamentali UE', descrizione: 'Nizza 2000 — vincolante dal 2009' },
    { id: 'reg_ue', label: 'Regolamenti UE', descrizione: 'Diritto europeo direttamente applicabile' },
    { id: 'direttive_ue', label: 'Direttive UE', descrizione: 'Diritto europeo da recepire' },
    { id: 'cgue', label: 'Corte di Giustizia UE', descrizione: 'Giurisprudenza CGUE e Tribunale UE' },
    { id: 'dottrina', label: 'Dottrina europea', descrizione: 'Letteratura di diritto dell\'UE' },
  ],
  'avvocato_successioni': [
    { id: 'cc_successioni', label: 'Codice Civile — Libro II', descrizione: 'Artt. 456 ss. — successioni' },
    { id: 'd_lgs_346', label: 'D.Lgs. 346/1990', descrizione: 'Imposta sulle Successioni e Donazioni' },
    { id: 'dpr_131', label: 'D.P.R. 131/1986', descrizione: 'Imposta di Registro' },
    { id: 'reg_ue_650', label: 'Reg. UE 650/2012', descrizione: 'Successioni transfrontaliere' },
    { id: 'cass_civ_ii', label: 'Cassazione Civile — Sezione II', descrizione: 'Giurisprudenza successoria' },
    { id: 'dottrina', label: 'Dottrina successoria', descrizione: 'Letteratura specialistica' },
  ],
  'avvocato_immobiliare': [
    { id: 'cc_proprieta', label: 'Codice Civile — proprietà e contratti', descrizione: 'Artt. 810 ss., 1470 ss., 1571 ss.' },
    { id: 'dpr_380', label: 'D.P.R. 380/2001', descrizione: 'Testo Unico Edilizia' },
    { id: 'd_lgs_42', label: 'D.Lgs. 42/2004', descrizione: 'Codice dei Beni Culturali e del Paesaggio' },
    { id: 'l_392_1978', label: 'L. 392/1978', descrizione: 'Locazioni ad uso abitativo e commerciale' },
    { id: 'dpr_131', label: 'D.P.R. 131/1986', descrizione: 'Imposta di Registro — atti traslativi' },
    { id: 'cass_civ_ii_iii', label: 'Cassazione Civile — Sezioni II e III', descrizione: 'Giurisprudenza immobiliare' },
    { id: 'dottrina', label: 'Dottrina immobiliare', descrizione: 'Letteratura specialistica' },
  ],
  'avvocato_cassazione': [
    { id: 'cpc_cassazione', label: 'Codice di Procedura Civile — artt. 360 ss.', descrizione: 'Ricorso per cassazione civile' },
    { id: 'cpp_cassazione', label: 'Codice di Procedura Penale — artt. 606 ss.', descrizione: 'Ricorso per cassazione penale' },
    { id: 'cass_ss_uu', label: 'Cassazione — Sezioni Unite', descrizione: 'Giurisprudenza vincolante civile e penale' },
    { id: 'massimario', label: 'Massimario della Cassazione', descrizione: 'Massime ufficiali' },
    { id: 'd_lgs_40_2006', label: 'D.Lgs. 40/2006', descrizione: 'Riforma processo di cassazione civile' },
    { id: 'dottrina', label: 'Dottrina processualistica', descrizione: 'Letteratura sul giudizio di legittimità' },
  ],
  'avvocato_arbitrato': [
    { id: 'cpc_arbitrato', label: 'Codice di Procedura Civile — artt. 806 ss.', descrizione: 'Arbitrato rituale e irrituale' },
    { id: 'd_lgs_40_2006_arb', label: 'D.Lgs. 40/2006', descrizione: 'Riforma dell\'arbitrato' },
    { id: 'conv_new_york', label: 'Convenzione di New York 1958', descrizione: 'Riconoscimento lodi arbitrali stranieri' },
    { id: 'reg_cam', label: 'Regolamento CAM', descrizione: 'Camera Arbitrale di Milano' },
    { id: 'reg_cci', label: 'Regolamento ICC', descrizione: 'Camera di Commercio Internazionale' },
    { id: 'dottrina', label: 'Dottrina arbitralistica', descrizione: 'Letteratura specialistica' },
  ],
  'notaio_atti_notarili': [
    { id: 'cc', label: 'Codice Civile', descrizione: 'Disciplina contratti e proprietà' },
    { id: 'l_notariato', label: 'Legge Notariato', descrizione: 'L. 89/1913' },
    { id: 'dpr_131', label: 'D.P.R. 131/1986', descrizione: 'Testo Unico Imposta di Registro' },
    { id: 'cass_civ', label: 'Cassazione Civile', descrizione: 'Giurisprudenza notarile' },
    { id: 'cnn', label: 'CNN — Consiglio Nazionale Notariato', descrizione: 'Studi e massime notarili' },
    { id: 'dottrina', label: 'Dottrina notarile', descrizione: 'Letteratura specialistica' },
  ],
  'commercialista_analisi_bilanci': [
    { id: 'oic', label: 'Principi OIC', descrizione: 'Organismo Italiano di Contabilità' },
    { id: 'ifrs', label: 'IFRS/IAS', descrizione: 'Standard internazionali IASB' },
    { id: 'cc_bilancio', label: 'Codice Civile — art. 2423 ss.', descrizione: 'Norme civilistiche sul bilancio' },
    { id: 'ade_prassi', label: 'Prassi AdE', descrizione: 'Circolari e risoluzioni' },
    { id: 'dottrina', label: 'Dottrina contabile', descrizione: 'Letteratura specializzata' },
  ],
  'commercialista_dichiarazioni_fiscali': [
    { id: 'tuir', label: 'TUIR', descrizione: 'D.P.R. 22 dicembre 1986 n. 917' },
    { id: 'iva', label: 'D.P.R. IVA', descrizione: 'D.P.R. 633/1972' },
    { id: 'circolari_ade', label: 'Circolari AdE', descrizione: 'Agenzia delle Entrate' },
    { id: 'interpelli', label: 'Risoluzioni e interpelli', descrizione: 'Prassi amministrativa' },
    { id: 'giur_tributaria', label: 'Giurisprudenza tributaria', descrizione: 'Cassazione — sezione tributaria' },
    { id: 'dottrina', label: 'Dottrina tributaria', descrizione: 'Letteratura fiscale' },
  ],
  'commercialista_consulenza_aziendale': [
    { id: 'codice_civile', label: 'Codice Civile — diritto societario', descrizione: 'Artt. 2082 ss. c.c.' },
    { id: 'tuir', label: 'TUIR', descrizione: 'D.P.R. 917/1986' },
    { id: 'ccii', label: 'Codice della Crisi d\'Impresa', descrizione: 'D.Lgs. 14/2019' },
    { id: 'oic', label: 'Principi OIC', descrizione: 'Organismo Italiano di Contabilità' },
    { id: 'ade_prassi', label: 'Prassi AdE', descrizione: 'Circolari e risoluzioni Agenzia Entrate' },
  ],
  'commercialista_gestione_scadenze': [
    { id: 'calendario_ade', label: 'Calendario fiscale AdE', descrizione: 'Scadenzario ufficiale' },
    { id: 'tuir', label: 'TUIR', descrizione: 'D.P.R. 917/1986' },
    { id: 'dpr_iva', label: 'D.P.R. 633/1972 — IVA', descrizione: 'Adempimenti IVA' },
    { id: 'circolari_ade', label: 'Circolari AdE', descrizione: 'Agenzia delle Entrate' },
    { id: 'inps_circolari', label: 'Circolari INPS', descrizione: 'Contributi previdenziali' },
  ],
  'commercialista_pianificazione_fiscale': [
    { id: 'tuir', label: 'TUIR', descrizione: 'D.P.R. 917/1986' },
    { id: 'dpr_iva', label: 'D.P.R. 633/1972 — IVA', descrizione: 'Normativa IVA' },
    { id: 'convenzioni', label: 'Convenzioni contro doppia imposizione', descrizione: 'Trattati bilaterali OCSE' },
    { id: 'interpelli_ade', label: 'Interpelli e risoluzioni AdE', descrizione: 'Prassi su operazioni complesse' },
    { id: 'giur_tributaria', label: 'Giurisprudenza tributaria', descrizione: 'Cass. sezione tributaria + Corte Giustizia UE' },
  ],
  'ingegnere_relazioni_tecniche': [
    { id: 'ntc2018', label: 'NTC 2018', descrizione: 'Norme Tecniche per le Costruzioni' },
    { id: 'eurocodici', label: 'Eurocodici', descrizione: 'Standard strutturali europei' },
    { id: 'uni_norme', label: 'Norme UNI', descrizione: 'Standard tecnici italiani' },
    { id: 'cei', label: 'Norme CEI', descrizione: 'Comitato Elettrotecnico Italiano' },
    { id: 'dpr_380', label: 'D.P.R. 380/2001', descrizione: 'Testo Unico Edilizia' },
    { id: 'dottrina_tecnica', label: 'Letteratura tecnica', descrizione: 'Manuali e trattati di ingegneria' },
  ],
  'ingegnere_normativa_tecnica': [
    { id: 'dpr_380', label: 'D.P.R. 380/2001', descrizione: 'T.U. Edilizia' },
    { id: 'd_lgs_81_sicurezza', label: 'D.Lgs. 81/2008', descrizione: 'T.U. Sicurezza sul lavoro' },
    { id: 'ntc2018', label: 'NTC 2018', descrizione: 'Norme Tecniche Costruzioni' },
    { id: 'uni_norme', label: 'Norme UNI', descrizione: 'Standard tecnici' },
    { id: 'cei', label: 'Norme CEI', descrizione: 'Norme elettrotecniche' },
    { id: 'direttive_ue', label: 'Direttive UE', descrizione: 'Normativa tecnica europea' },
  ],
  'architetto_relazioni_tecniche': [
    { id: 'dpr_380', label: 'D.P.R. 380/2001', descrizione: 'Testo Unico Edilizia' },
    { id: 'ntc2018', label: 'NTC 2018', descrizione: 'Norme Tecniche Costruzioni' },
    { id: 'dm_antincendio', label: 'Norme antincendio', descrizione: 'D.M. Prevenzione incendi' },
    { id: 'uni_norme', label: 'Norme UNI', descrizione: 'Standard tecnici' },
    { id: 'norme_regionali', label: 'Norme regionali e comunali', descrizione: 'Regolamenti edilizi locali' },
    { id: 'dottrina_tecnica', label: 'Letteratura tecnica', descrizione: 'Manuali di architettura' },
  ],
  'medico_redazione_referti': [
    { id: 'linee_guida_snlg', label: 'Linee guida SNLG', descrizione: 'Sistema Nazionale Linee Guida — ISS' },
    { id: 'linee_guida_societa', label: 'Linee guida società scientifiche', descrizione: 'SIMG, SIC, ecc.' },
    { id: 'who_guidelines', label: 'Linee guida WHO', descrizione: 'World Health Organization' },
    { id: 'pubmed_cochrane', label: 'Letteratura peer-reviewed', descrizione: 'PubMed / Cochrane Library' },
    { id: 'aifa', label: 'Schede tecniche AIFA', descrizione: 'Agenzia Italiana del Farmaco' },
    { id: 'codice_deont', label: 'Codice deontologico medico', descrizione: 'FNOMCeO 2014' },
    { id: 'normativa_sanitaria', label: 'Normativa sanitaria', descrizione: 'D.Lgs. 502/1992 e ss.' },
  ],
  'farmacista_consulenza_farmacologica': [
    { id: 'aifa_rcp', label: 'RCP AIFA', descrizione: 'Riassunti caratteristiche prodotto' },
    { id: 'fi', label: 'Foglietti illustrativi AIFA', descrizione: 'Informazioni al paziente' },
    { id: 'fn', label: 'Farmacopea Nazionale', descrizione: 'Norme farmaceutiche ufficiali' },
    { id: 'ef', label: 'Farmacopea Europea', descrizione: 'Standard europei' },
    { id: 'micromedex', label: 'Database farmacologici', descrizione: 'Micromedex, Lexicomp' },
    { id: 'normativa_farmaceutica', label: 'Normativa farmaceutica', descrizione: 'D.Lgs. 219/2006 e ss.' },
  ],
  'psicologo_relazioni_cliniche': [
    { id: 'dsm5', label: 'DSM-5-TR', descrizione: 'Manuale diagnostico APA' },
    { id: 'icd11', label: 'ICD-11', descrizione: 'Classificazione OMS' },
    { id: 'linee_guida_iss', label: 'Linee guida ISS', descrizione: 'SNLG per salute mentale' },
    { id: 'pubmed', label: 'Letteratura peer-reviewed', descrizione: 'PubMed / PsycINFO' },
    { id: 'codice_deont_psico', label: 'Codice deontologico psicologi', descrizione: 'CNOP' },
    { id: 'normativa', label: 'Normativa professionale', descrizione: 'L. 56/1989 e ss.' },
  ],
  'insegnante_universita': [
    { id: 'miur', label: 'Normativa MIUR/MUR', descrizione: 'Decreti ministeriali' },
    { id: 'regolamento_ateneo', label: 'Regolamento di Ateneo', descrizione: 'Norme universitarie locali' },
    { id: 'libri_testo', label: 'Libri di testo adottati', descrizione: 'Testi del corso' },
    { id: 'letteratura_scientifica', label: 'Letteratura scientifica', descrizione: 'Articoli e riviste di settore' },
  ],
  'insegnante_liceo': [
    { id: 'indicazioni_nazionali', label: 'Indicazioni nazionali MIUR', descrizione: 'Curricoli e programmi' },
    { id: 'libri_testo', label: 'Libri di testo adottati', descrizione: 'Testi in adozione' },
    { id: 'om_esami', label: 'O.M. Esami di Stato', descrizione: 'Ordinanze ministeriali' },
    { id: 'letteratura_did', label: 'Letteratura didattica', descrizione: 'Metodologia didattica' },
  ],
  'consulente_lavoro_gestione_paghe': [
    { id: 'ccnl', label: 'CCNL di settore', descrizione: 'Contratti collettivi nazionali' },
    { id: 'statuto_lav', label: 'Statuto dei Lavoratori', descrizione: 'L. 300/1970' },
    { id: 'jobs_act', label: 'D.Lgs. 81/2015', descrizione: 'Jobs Act' },
    { id: 'inps_circolari', label: 'Circolari INPS', descrizione: 'Messaggi e circolari INPS' },
    { id: 'inail', label: 'Tariffe INAIL', descrizione: 'Normativa infortuni' },
    { id: 'cass_lav', label: 'Cassazione Lavoro', descrizione: 'Giurisprudenza di legittimità' },
    { id: 'dottrina', label: 'Dottrina giuslavoristica', descrizione: 'Letteratura specialistica' },
  ],
  'giornalista_ricerca_fonti': [
    { id: 'fonti_primarie', label: 'Fonti primarie verificate', descrizione: 'Documenti ufficiali, dati PA' },
    { id: 'agenzie_stampa', label: 'Agenzie di stampa', descrizione: 'ANSA, AGI, Reuters, AP' },
    { id: 'fonti_istituzionali', label: 'Fonti istituzionali', descrizione: 'Siti ufficiali governo, UE, ONU' },
    { id: 'databases', label: 'Database giornalistici', descrizione: 'Factiva, LexisNexis' },
    { id: 'carta_doveri', label: 'Carta dei Doveri del Giornalista', descrizione: 'Deontologia professionale' },
  ],
  'editore': [
    { id: 'treccani', label: 'Treccani', descrizione: 'Enciclopedia e vocabolario della lingua italiana' },
    { id: 'crusca', label: 'Accademia della Crusca', descrizione: 'Autorità normativa sulla lingua italiana' },
    { id: 'diritto_autore', label: 'L. 633/1941 — Diritto d\'autore', descrizione: 'Normativa italiana sul copyright' },
    { id: 'aie', label: 'AIE — Associazione Italiana Editori', descrizione: 'Linee guida e dati di settore' },
    { id: 'isbn', label: 'Agenzia ISBN italiana', descrizione: 'Catalogazione editoriale nazionale' },
    { id: 'bni', label: 'BNI — Biblioteca Nazionale Italiana', descrizione: 'Catalogo nazionale delle pubblicazioni' },
  ],
  'ricercatore_letteratura': [
    { id: 'pubmed', label: 'PubMed / MEDLINE', descrizione: 'Letteratura biomedica' },
    { id: 'scopus', label: 'Scopus / Web of Science', descrizione: 'Database multidisciplinare' },
    { id: 'cochrane', label: 'Cochrane Library', descrizione: 'Revisioni sistematiche' },
    { id: 'arxiv', label: 'arXiv / bioRxiv', descrizione: 'Preprint scientifici' },
    { id: 'riviste_settore', label: 'Riviste del settore (peer-reviewed)', descrizione: 'Nature, Science, NEJM, ecc.' },
    { id: 'linee_guida_ricerca', label: 'Linee guida metodologiche', descrizione: 'CONSORT, PRISMA, ecc.' },
  ],
}

// ============================================================
// HELPER FUNCTIONS (invariate)
// ============================================================
export function getFontiKey(professione: string, utilizzo: string, specializzazione: string): string {
  const keys = [
    `${professione}_${specializzazione}`,
    `${professione}_${utilizzo}_${specializzazione}`,
    `${professione}_${utilizzo}`,
    professione,
  ]
  for (const key of keys) {
    if (FONTI_DEFAULT[key]) return key
  }
  return ''
}

export function getFontiDefault(professione: string, utilizzo: string, specializzazione: string): Fonte[] {
  const key = getFontiKey(professione, utilizzo, specializzazione)
  return FONTI_DEFAULT[key] || []
}

export function getFontiMultiple(professione: string, utilizzo: string, specializzazioni: string[]): Fonte[] {
  const fontiMap = new Map<string, Fonte>()
  for (const spe of specializzazioni) {
    const fonti = getFontiDefault(professione, utilizzo, spe)
    for (const f of fonti) {
      if (!fontiMap.has(f.id)) fontiMap.set(f.id, f)
    }
  }
  if (fontiMap.size === 0) {
    const fonti = getFontiDefault(professione, utilizzo, '')
    for (const f of fonti) {
      if (!fontiMap.has(f.id)) fontiMap.set(f.id, f)
    }
  }
  return Array.from(fontiMap.values())
}

export const PROFESSIONI_LIST = [
  { value: 'avvocato', label: 'Avvocato', emoji: '⚖️', categoria: 'Legale' },
  { value: 'notaio', label: 'Notaio', emoji: '📜', categoria: 'Legale' },
  { value: 'magistrato', label: 'Magistrato', emoji: '🏛️', categoria: 'Legale' },
  { value: 'consulente_lavoro', label: 'Consulente del lavoro', emoji: '📋', categoria: 'Legale' },
  { value: 'commercialista', label: 'Commercialista', emoji: '📊', categoria: 'Economico' },
  { value: 'revisore_contabile', label: 'Revisore contabile', emoji: '🔍', categoria: 'Economico' },
  { value: 'medico', label: 'Medico', emoji: '🏥', categoria: 'Sanitario' },
  { value: 'farmacista', label: 'Farmacista', emoji: '💊', categoria: 'Sanitario' },
  { value: 'psicologo', label: 'Psicologo', emoji: '🧠', categoria: 'Sanitario' },
  { value: 'fisioterapista', label: 'Fisioterapista', emoji: '🦴', categoria: 'Sanitario' },
  { value: 'ingegnere', label: 'Ingegnere', emoji: '⚙️', categoria: 'Tecnico' },
  { value: 'architetto', label: 'Architetto', emoji: '📐', categoria: 'Tecnico' },
  { value: 'geometra', label: 'Geometra', emoji: '📏', categoria: 'Tecnico' },
  { value: 'insegnante', label: 'Insegnante', emoji: '📚', categoria: 'Istruzione' },
  { value: 'professore_universitario', label: 'Professore universitario', emoji: '🎓', categoria: 'Istruzione' },
  { value: 'ricercatore', label: 'Ricercatore', emoji: '🔬', categoria: 'Istruzione' },
  { value: 'imprenditore', label: 'Imprenditore', emoji: '💼', categoria: 'Business' },
  { value: 'manager', label: 'Manager / Dirigente', emoji: '📈', categoria: 'Business' },
  { value: 'libero_professionista', label: 'Libero professionista', emoji: '🧩', categoria: 'Business' },
  { value: 'giornalista', label: 'Giornalista', emoji: '📰', categoria: 'Comunicazione' },
  { value: 'editore', label: 'Editore / Editor', emoji: '📖', categoria: 'Comunicazione' },
  { value: 'altro', label: 'Altro', emoji: '👤', categoria: 'Altro' },
]
