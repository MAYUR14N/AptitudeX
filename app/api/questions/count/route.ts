import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-utils';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const db = await getDb();
    const counts = await db.all('SELECT category, COUNT(*) as count FROM questions GROUP BY category');
    
    // Format into a key-value pair of category: count
    const countMap: Record<string, number> = {};
    if (counts) {
      for (const row of counts) {
        countMap[row.category] = row.count;
      }
    }
    return successResponse(countMap);
  } catch (error) {
    console.error('Fetch question counts error:', error);
    return errorResponse('Internal server error', 500);
  }
}

