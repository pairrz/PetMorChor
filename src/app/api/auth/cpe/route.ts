import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET() {
  const clientId = process.env.CPE_OAUTH_CLIENT_ID!;
  const redirectUri = process.env.CPE_OAUTH_REDIRECT_URI!;
  const scope = 'openid profile email basic_info';

  // สุ่ม CSRF State Token
  const state = crypto.randomBytes(16).toString('hex');

  const authorizeUrl = new URL('https://oauth497.cpecmu.com/application/o/authorize/');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', scope);
  authorizeUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(authorizeUrl.toString());

  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 5,
    path: '/',
  });

  return response;
}