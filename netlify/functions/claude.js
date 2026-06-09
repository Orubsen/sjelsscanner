/**
 * Dette endepunktet er deaktivert.
 *
 * Den opprinnelige implementasjonen videresendte vilkårlige forespørsler
 * til Anthropic API uten autentisering eller tilgangskontroll, og er
 * ikke lenger i bruk av frontend (appen bruker /api/gemini).
 *
 * Endepunktet returnerer 410 Gone for alle forespørsler.
 */
export default async () => {
  return new Response(
    JSON.stringify({ error: "Dette endepunktet er deaktivert." }),
    {
      status: 410,
      headers: { "Content-Type": "application/json" },
    }
  );
};

export const config = {
  path: "/api/claude",
};
