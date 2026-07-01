import { clearSession } from '@/lib/auth';
import { successResponse } from '@/lib/api-utils';

export async function POST() {
  await clearSession();
  return successResponse({ message: 'Logged out successfully' });
}
