export function ProviderCatalog() {
  const providers = [
    {
      name: 'Google Gemini',
      id: 'gemini',
      docs: 'https://ai.google.dev/',
      howto: [
        'Create API key in Google AI Studio',
        'Add an Integration with provider "Google Gemini" and paste API key',
        'Use Test to verify connectivity',
      ],
    },
    {
      name: 'OpenAI',
      id: 'openai',
      docs: 'https://platform.openai.com/docs',
      howto: ['Create API key', 'Add an OpenAI integration', 'Test connection'],
    },
    {
      name: 'Anthropic',
      id: 'anthropic',
      docs: 'https://docs.anthropic.com/',
      howto: ['Create API key', 'Add an Anthropic integration', 'Test connection'],
    },
    {
      name: 'PostgreSQL',
      id: 'postgres',
      docs: 'https://www.postgresql.org/docs/',
      howto: ['Enter host/port/db/user/password', 'Test connection'],
    },
    {
      name: 'MySQL',
      id: 'mysql',
      docs: 'https://dev.mysql.com/doc/',
      howto: ['Enter host/port/db/user/password', 'Test connection'],
    },
    {
      name: 'HTTP / REST',
      id: 'http',
      docs: 'https://developer.mozilla.org/docs/Web/HTTP',
      howto: ['Provide base URL', 'Provide headers or token', 'Test request'],
    },
  ];

  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold mb-2">Provider Catalog</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map((p) => (
          <div key={p.id} className="border-2 border-border p-4 bg-card">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{p.name}</h3>
              <a className="text-xs underline" href={p.docs} target="_blank" rel="noreferrer">Docs</a>
            </div>
            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
              {p.howto.map((h, i) => (<li key={i}>{h}</li>))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
