export const metadata = {
  title: 'Privacy Policy — Assistente AI',
  description: 'Informativa sul trattamento dei dati personali',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <a href="/login" className="text-sm text-gray-500 hover:text-gray-700">← Torna al sito</a>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Ultimo aggiornamento: giugno 2026</p>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">1. Titolare del trattamento</h2>
            <p>
              Il titolare del trattamento dei dati personali è Leonardo Stancati, contattabile all'indirizzo{' '}
              <a href="mailto:privacy@assistente-ai.it" className="text-blue-600 hover:underline">privacy@assistente-ai.it</a>.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">2. Dati raccolti</h2>
            <p className="mb-2">Raccogliamo le seguenti categorie di dati:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Dati di registrazione:</strong> nome, indirizzo email, password (cifrata).</li>
              <li><strong>Dati di configurazione:</strong> professione, ambiti di utilizzo, preferenze dell'assistente AI.</li>
              <li><strong>Contenuti delle conversazioni:</strong> messaggi inviati all'assistente e relative risposte.</li>
              <li><strong>File caricati:</strong> documenti PDF, Word, Excel e altri file caricati per il contesto.</li>
              <li><strong>Dati di utilizzo:</strong> numero di messaggi, modello AI usato, costi stimati (solo per uso interno).</li>
              <li><strong>Token Google Drive</strong> (opzionale): se connetti Google Drive, conserviamo il token di accesso per leggere i tuoi file.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">3. Finalità e base giuridica</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Erogazione del servizio</strong> (esecuzione del contratto, art. 6.1.b GDPR): autenticazione, generazione risposte AI, gestione file.</li>
              <li><strong>Sicurezza e antifrode</strong> (interesse legittimo, art. 6.1.f GDPR): rate limiting, prevenzione abusi.</li>
              <li><strong>Adempimenti di legge</strong> (art. 6.1.c GDPR): conservazione dati fiscali ove applicabile.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">4. Terze parti coinvolte</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Anthropic, PBC</strong> (USA) — elabora i messaggi per generare le risposte AI in qualità di responsabile del trattamento (art. 28 GDPR). I messaggi vengono trasmessi alle API Anthropic. Anthropic dispone di un Data Processing Agreement (DPA) per i clienti commerciali; le Clausole Contrattuali Standard si applicano ai trasferimenti verso gli USA. Anthropic non usa i dati degli utenti API per addestrare i propri modelli. Consulta la <a href="https://www.anthropic.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">privacy policy di Anthropic</a>.</li>
              <li><strong>Supabase Inc.</strong> (USA) — database, autenticazione e storage file. I dati sono conservati su server in regione EU ove selezionata. Consulta la <a href="https://supabase.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">privacy policy di Supabase</a>.</li>
              <li><strong>Vercel Inc.</strong> (USA) — hosting dell'applicazione web. Consulta la <a href="https://vercel.com/legal/privacy-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">privacy policy di Vercel</a>.</li>
              <li><strong>Google LLC</strong> (opzionale) — se abiliti l'integrazione Google Drive, Google tratta i dati dei tuoi file secondo la propria privacy policy.</li>
            </ul>
            <p className="mt-2">Per i trasferimenti verso paesi extra-UE applichiamo le Clausole Contrattuali Standard approvate dalla Commissione Europea.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">5. Conservazione dei dati</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>I dati dell'account e le conversazioni sono conservati finché l'account è attivo.</li>
              <li>I file caricati vengono eliminati insieme all'account o su richiesta esplicita.</li>
            </ul>
            <p className="mt-3 font-medium text-gray-900">Procedura di cancellazione (diritto all'oblio — art. 17 GDPR)</p>
            <ol className="list-decimal pl-5 space-y-1 mt-2">
              <li>Puoi eliminare il tuo account autonomamente dalla sezione <strong>Profilo → Zona pericolosa → Elimina account</strong>. L'operazione è immediata e cancella tutti i dati in tempo reale: conversazioni, messaggi, file, configurazioni e token di accesso.</li>
              <li>In alternativa puoi inviare una richiesta scritta a <a href="mailto:privacy@assistente-ai.it" className="text-blue-600 hover:underline">privacy@assistente-ai.it</a>. La richiesta viene evasa entro <strong>30 giorni</strong> dalla ricezione.</li>
              <li>Riceverai conferma via email una volta completata l'eliminazione.</li>
              <li>I backup infrastrutturali (Supabase) vengono sovrascritta o purgati entro <strong>30 giorni</strong> dall'eliminazione dell'account.</li>
              <li>Dati che il titolare è obbligato per legge a conservare (es. dati fiscali) vengono trattenuti per il solo periodo obbligatorio e poi eliminati.</li>
            </ol>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">6. I tuoi diritti (GDPR)</h2>
            <p className="mb-2">Hai diritto a:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Accesso</strong> — ottenere copia dei tuoi dati personali.</li>
              <li><strong>Rettifica</strong> — correggere dati inesatti.</li>
              <li><strong>Cancellazione</strong> — richiedere l'eliminazione del tuo account e di tutti i dati associati.</li>
              <li><strong>Portabilità</strong> — ricevere i tuoi dati in formato strutturato e leggibile da macchina.</li>
              <li><strong>Opposizione e limitazione</strong> — opporti o limitare il trattamento in determinati casi.</li>
              <li><strong>Reclamo</strong> — presentare reclamo al Garante per la Protezione dei Dati Personali (<a href="https://www.garanteprivacy.it" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">garanteprivacy.it</a>).</li>
            </ul>
            <p className="mt-2">Per esercitare i tuoi diritti scrivi a <a href="mailto:privacy@assistente-ai.it" className="text-blue-600 hover:underline">privacy@assistente-ai.it</a>.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">7. Violazioni dei dati (Data Breach)</h2>
            <p className="mb-2">In caso di violazione della sicurezza che comporti la perdita, la divulgazione o l'accesso non autorizzato a dati personali:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Il Titolare notifica la violazione al <strong>Garante per la Protezione dei Dati Personali entro 72 ore</strong> dalla scoperta, ove la violazione possa comportare un rischio per i diritti e le libertà delle persone (art. 33 GDPR).</li>
              <li>Se la violazione comporta un <strong>rischio elevato</strong> per gli interessati, questi ultimi vengono informati senza ingiustificato ritardo con indicazione della natura della violazione, dei dati coinvolti e delle misure adottate (art. 34 GDPR).</li>
              <li>Le violazioni vengono documentate internamente indipendentemente dall'obbligo di notifica.</li>
            </ul>
            <p className="mt-2">Per segnalare una potenziale violazione scrivi a <a href="mailto:privacy@assistente-ai.it" className="text-blue-600 hover:underline">privacy@assistente-ai.it</a>.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">8. Cookie e tracciamento</h2>

            <p>Usiamo solo cookie tecnici necessari al funzionamento del servizio (sessione di autenticazione). Non utilizziamo cookie di profilazione o di terze parti a fini pubblicitari.</p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">9. Modifiche</h2>
            <p>Ci riserviamo di aggiornare questa informativa. Le modifiche sostanziali saranno comunicate via email agli utenti registrati.</p>
          </section>

        </div>
      </div>
    </div>
  )
}
