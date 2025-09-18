// Error handler to prevent infinite polling loops
export class DatabaseError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export function handleSupabaseError(error: any): never {
  console.error('Supabase error:', error);
  
  if (error?.code === 'PGRST116' || error?.message?.includes('relation') || error?.message?.includes('does not exist')) {
    throw new DatabaseError('Database table not found. Please run the database setup script.', 404);
  }
  
  if (error?.code === 'PGRST301' || error?.status === 400) {
    throw new DatabaseError('Bad request to database. Check your query parameters.', 400);
  }
  
  throw new DatabaseError(error?.message || 'Unknown database error', error?.status || 500);
}

export function withErrorHandling<T>(promise: Promise<T>): Promise<T> {
  return promise.catch(handleSupabaseError);
}