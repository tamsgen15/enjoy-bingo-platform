import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/["'\r\n]/g, '').trim() || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/["'\r\n]/g, '').trim() || ''
);

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    const { data: user } = await supabase
      .from('app_users')
      .select('*')
      .eq('username', username)
      .single();

    if (user && (user.role === 'owner' || user.role === 'platform_owner')) {
      return NextResponse.json({ 
        success: true, 
        user: { username: user.username, role: user.role }
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 500 });
  }
}