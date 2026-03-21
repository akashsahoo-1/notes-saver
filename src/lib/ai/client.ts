export async function fetchAI<T>(endpoint: string, body: Record<string, any>): Promise<T> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  if (!res.ok) {
    throw new Error('Something went wrong. Try again.');
  }
  
  return res.json() as Promise<T>;
}
