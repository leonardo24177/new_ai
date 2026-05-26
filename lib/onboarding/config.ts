// lib/onboarding/config.ts
// Configurazione completa del flusso onboarding

export type Ambito = 'lavoro' | 'studio' | 'personale'
export type Professione = 'avvocato' | 'commercialista' | 'medico' | 'insegnante' | 'architetto' | 'imprenditore' | 'altro'
export type Utilizzo = string
export type Specializzazione = string

export interface Fonte {
  id: string
  label: string
  descrizione?: string
}

export interface OnboardingData {
  nome: string
  ambito: Ambito | ''
  professione: Professione | ''
  utilizzo: string
  specializzazioni: string[]        // multipla
  specializzazione_custom: string   // campo libero
  fonti: Fonte[]
  fonti_escluse: string[]
  citazione: 'sempre' | 'essenziale' | 'mai'
  conflitto_fonti: 'gerarchia' | 'entrambe' | 'chiedi'
  tono: 'formale' | 'diretto' | 'colloquiale'
  note_libere: string
}

// Utilizzi per professione
export const UTILIZZI: Record<Professione, { value: string; label: string }[]> = {
  avvocato: [
    { value: 'redazione_atti', label: 'Redazione atti processuali' },
    { value: 'ricerca_giurisprudenza', label: 'Ricerca giurisprudenza' },
    { value: 'gestione_clienti', label: 'Gestione clienti' },
    { value: 'preparazione_udienze', label: 'Preparazione udienze' },
  ],
  commercialista: [
    { value: 'analisi_bilanci', label: 'Lettura e analisi bilanci' },
    { value: 'dichiarazioni_fiscali', label: 'Dichiarazioni fiscali' },
    { value: 'consulenza_aziendale', label: 'Consulenza aziendale' },
    { value: 'gestione_scadenze', label: 'Gestione scadenze' },
  ],
  medico: [
    { value: 'redazione_referti', label: 'Redazione referti' },
    { value: 'ricerca_clinica', label: 'Ricerca clinica' },
    { value: 'gestione_pazienti', label: 'Gestione pazienti' },
    { value: 'normativa', label: 'Aggiornamento normativo' },
  ],
  insegnante: [
    { value: 'organizzare_lezioni', label: 'Organizzare lezioni' },
    { value: 'creare_esami', label: 'Creare verifiche ed esami' },
    { value: 'correzione', label: 'Correzione elaborati' },
    { value: 'comunicazione', label: 'Comunicazione con famiglie' },
  ],
  architetto: [
    { value: 'relazioni_tecniche', label: 'Redazione relazioni tecniche' },
    { value: 'pratiche_comunali', label: 'Gestione pratiche comunali' },
    { value: 'computi_metrici', label: 'Computi metrici' },
    { value: 'normativa_edilizia', label: 'Ricerca normativa edilizia' },
  ],
  imprenditore: [
    { value: 'analisi_dati', label: 'Analisi dati aziendali' },
    { value: 'marketing', label: 'Comunicazione e marketing' },
    { value: 'fornitori', label: 'Gestione fornitori' },
    { value: 'reportistica', label: 'Reportistica' },
  ],
  altro: [
    { value: 'generico', label: 'Uso generico' },
  ],
}

// Specializzazioni per professione + utilizzo (selezione multipla)
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
  'avvocato_preparazione_udienze': [
    { value: 'penale', label: 'Penale' },
    { value: 'civile', label: 'Civile' },
    { value: 'lavoro', label: 'Lavoro' },
    { value: 'amministrativo', label: 'Amministrativo' },
    { value: 'tributario', label: 'Tributario' },
  ],
  'insegnante_creare_esami': [
    { value: 'universita', label: 'Università' },
    { value: 'liceo', label: 'Liceo' },
    { value: 'media', label: 'Scuola media' },
    { value: 'professionale', label: 'Istituto professionale' },
  ],
  'insegnante_organizzare_lezioni': [
    { value: 'universita', label: 'Università' },
    { value: 'liceo', label: 'Liceo' },
    { value: 'media', label: 'Scuola media' },
    { value: 'professionale', label: 'Istituto professionale' },
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
  'medico_redazione_referti': [
    { value: 'medicina_generale', label: 'Medicina generale' },
    { value: 'cardiologia', label: 'Cardiologia' },
    { value: 'neurologia', label: 'Neurologia' },
    { value: 'oncologia', label: 'Oncologia' },
    { value: 'pediatria', label: 'Pediatria' },
    { value: 'ortopedia', label: 'Ortopedia' },
    { value: 'radiologia', label: 'Radiologia' },
    { value: 'psichiatria', label: 'Psichiatria' },
  ],
}

// Fonti predefinite per professione + utilizzo + specializzazione
export const FONTI_DEFAULT: Record<string, Fonte[]> = {
  'avvocato_penale': [
    { id: 'cp', label: 'Codice Penale', descrizione: 'D.Lgs. 19 ottobre 1930 n. 1398' },
    { id: 'cpp', label: 'Codice di Procedura Penale', descrizione: 'D.Lgs. 22 settembre 1988 n. 447' },
    { id: 'cass_pen', label: 'Cassazione Penale', descrizione: 'Giurisprudenza di legittimità' },
    { id: 'dottrina', label: 'Dottrina', descrizione: 'Letteratura giuridica' },
  ],
  'avvocato_civile': [
    { id: 'cc', label: 'Codice Civile', descrizione: 'R.D. 16 marzo 1942 n. 262' },
    { id: 'cpc', label: 'Codice di Procedura Civile', descrizione: 'R.D. 28 ottobre 1940 n. 1443' },
    { id: 'cass_civ', label: 'Cassazione Civile', descrizione: 'Giurisprudenza di legittimità' },
    { id: 'dottrina', label: 'Dottrina', descrizione: 'Letteratura giuridica' },
  ],
  'avvocato_lavoro': [
    { id: 'statuto_lav', label: 'Statuto dei Lavoratori', descrizione: 'L. 20 maggio 1970 n. 300' },
    { id: 'd_lgs_81', label: 'D.Lgs. 81/2015', descrizione: 'Jobs Act' },
    { id: 'cass_lav', label: 'Cassazione Lavoro', descrizione: 'Giurisprudenza di legittimità' },
    { id: 'ccnl', label: 'CCNL', descrizione: 'Contratti collettivi nazionali' },
    { id: 'dottrina', label: 'Dottrina', descrizione: 'Letteratura giuslavoristica' },
  ],
  'avvocato_societario': [
    { id: 'cc_societa', label: 'Codice Civile (Libro V)', descrizione: 'Artt. 2247 ss.' },
    { id: 'tuf', label: 'TUF', descrizione: 'D.Lgs. 58/1998' },
    { id: 'tub', label: 'TUB', descrizione: 'D.Lgs. 385/1993' },
    { id: 'cass_civ', label: 'Cassazione Civile', descrizione: 'Giurisprudenza societaria' },
    { id: 'dottrina', label: 'Dottrina', descrizione: 'Letteratura commercialistica' },
  ],
  'avvocato_bancario': [
    { id: 'tub', label: 'TUB', descrizione: 'D.Lgs. 385/1993' },
    { id: 'tuf', label: 'TUF', descrizione: 'D.Lgs. 58/1998' },
    { id: 'banca_italia', label: 'Circolari Banca d\'Italia', descrizione: 'Regolamentazione bancaria' },
    { id: 'cass_civ', label: 'Cassazione Civile', descrizione: 'Giurisprudenza bancaria' },
    { id: 'abf', label: 'Arbitro Bancario Finanziario', descrizione: 'Decisioni ABF' },
  ],
  'avvocato_fallimentare': [
    { id: 'ccii', label: 'Codice della Crisi d\'Impresa', descrizione: 'D.Lgs. 14/2019' },
    { id: 'l_fall', label: 'Legge Fallimentare', descrizione: 'R.D. 267/1942' },
    { id: 'cass_civ', label: 'Cassazione Civile', descrizione: 'Sezione fallimentare' },
    { id: 'dottrina', label: 'Dottrina', descrizione: 'Letteratura concorsuale' },
  ],
  'avvocato_tributario': [
    { id: 'tuir', label: 'TUIR', descrizione: 'D.P.R. 917/1986' },
    { id: 'iva', label: 'D.P.R. IVA', descrizione: 'D.P.R. 633/1972' },
    { id: 'statuto_contribuente', label: 'Statuto del Contribuente', descrizione: 'L. 212/2000' },
    { id: 'cass_trib', label: 'Cassazione Tributaria', descrizione: 'Giurisprudenza tributaria' },
    { id: 'ade_prassi', label: 'Prassi AdE', descrizione: 'Circolari e risoluzioni' },
  ],
  'avvocato_amministrativo': [
    { id: 'cpa', label: 'Codice del Processo Amministrativo', descrizione: 'D.Lgs. 104/2010' },
    { id: 'cons_stato', label: 'Consiglio di Stato', descrizione: 'Giurisprudenza amministrativa' },
    { id: 'tar', label: 'TAR', descrizione: 'Giurisprudenza di primo grado' },
    { id: 'dottrina', label: 'Dottrina', descrizione: 'Letteratura amministrativistica' },
  ],
  'avvocato_famiglia': [
    { id: 'cc_famiglia', label: 'Codice Civile (Libro I)', descrizione: 'Artt. 79 ss.' },
    { id: 'l_divorzio', label: 'Legge sul Divorzio', descrizione: 'L. 898/1970' },
    { id: 'cass_civ', label: 'Cassazione Civile', descrizione: 'Sezione famiglia' },
    { id: 'dottrina', label: 'Dottrina', descrizione: 'Letteratura familiare' },
  ],
  'avvocato_internazionale': [
    { id: 'trattati', label: 'Trattati internazionali', descrizione: 'Convenzioni ONU, UE' },
    { id: 'reg_ue', label: 'Regolamenti UE', descrizione: 'Diritto europeo' },
    { id: 'l_218_95', label: 'L. 218/1995', descrizione: 'DIP italiano' },
    { id: 'dottrina', label: 'Dottrina internazionale', descrizione: 'Letteratura specialistica' },
  ],
  'commercialista_analisi_bilanci': [
    { id: 'oic', label: 'Principi OIC', descrizione: 'Organismo Italiano di Contabilità' },
    { id: 'ifrs', label: 'IFRS/IAS', descrizione: 'Standard internazionali' },
    { id: 'cc_bilancio', label: 'Codice Civile (art. 2423 ss.)', descrizione: 'Norme sul bilancio' },
    { id: 'ade_prassi', label: 'Prassi Agenzia delle Entrate', descrizione: 'Circolari e risoluzioni' },
    { id: 'dottrina', label: 'Dottrina contabile', descrizione: 'Letteratura specializzata' },
  ],
  'commercialista_dichiarazioni_fiscali': [
    { id: 'tuir', label: 'TUIR', descrizione: 'D.P.R. 22 dicembre 1986 n. 917' },
    { id: 'circolari_ade', label: 'Circolari AdE', descrizione: 'Agenzia delle Entrate' },
    { id: 'interpelli', label: 'Risoluzioni e interpelli', descrizione: 'Prassi amministrativa' },
    { id: 'giur_tributaria', label: 'Giurisprudenza tributaria', descrizione: 'Corte di Cassazione' },
    { id: 'dottrina', label: 'Dottrina tributaria', descrizione: 'Letteratura fiscale' },
  ],
  'medico_redazione_referti': [
    { id: 'snlg', label: 'Linee guida SNLG', descrizione: 'Sistema Nazionale Linee Guida' },
    { id: 'who', label: 'Linee guida WHO', descrizione: 'World Health Organization' },
    { id: 'pubmed', label: 'Letteratura peer-reviewed', descrizione: 'PubMed / Cochrane' },
    { id: 'codice_deont', label: 'Codice deontologico', descrizione: 'FNOMCeO' },
  ],
  'insegnante_universita': [
    { id: 'miur', label: 'Normativa MIUR', descrizione: 'Ministero Istruzione' },
    { id: 'regolamento_ateneo', label: 'Regolamento di Ateneo', descrizione: 'Norme universitarie' },
    { id: 'libri_testo', label: 'Libri di testo adottati', descrizione: 'Testi del corso' },
    { id: 'letteratura', label: 'Letteratura scientifica', descrizione: 'Articoli e riviste' },
  ],
  'insegnante_liceo': [
    { id: 'miur', label: 'Programmi MIUR', descrizione: 'Indicazioni nazionali' },
    { id: 'libri_testo', label: 'Libri di testo adottati', descrizione: 'Testi in adozione' },
    { id: 'letteratura_did', label: 'Letteratura didattica', descrizione: 'Metodologia didattica' },
  ],
}

// Calcola la chiave per le fonti — supporta specializzazioni multiple
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

// Combina fonti da più specializzazioni (rimuove duplicati)
export function getFontiMultiple(professione: string, utilizzo: string, specializzazioni: string[]): Fonte[] {
  const fontiMap = new Map<string, Fonte>()
  for (const spe of specializzazioni) {
    const fonti = getFontiDefault(professione, utilizzo, spe)
    for (const f of fonti) {
      if (!fontiMap.has(f.id)) fontiMap.set(f.id, f)
    }
  }
  return Array.from(fontiMap.values())
}