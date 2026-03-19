import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import config from './index';
import logger from '../utils/logger';
import { OAuthProfile } from '../types/auth';

/**
 * Configure Google OAuth Strategy
 */
if (config.oauth.google.clientId && config.oauth.google.clientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.oauth.google.clientId,
        clientSecret: config.oauth.google.clientSecret,
        callbackURL: config.oauth.google.callbackURL,
        scope: ['profile', 'email'],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const oauthProfile: OAuthProfile = {
            provider: 'google',
            id: profile.id,
            email: profile.emails?.[0]?.value || '',
            name: profile.displayName || '',
            avatar_url: profile.photos?.[0]?.value,
            raw: profile,
          };

          logger.info('Google OAuth profile received', {
            provider: 'google',
            email: oauthProfile.email,
          });

          return done(null, oauthProfile as any);
        } catch (error) {
          logger.error('Google OAuth error', { error });
          return done(error as Error, undefined);
        }
      }
    )
  );
} else {
  logger.warn('Google OAuth not configured - missing credentials');
}

/**
 * Facebook OAuth temporarily disabled
 */
logger.info('Facebook OAuth temporarily disabled');

/**
 * Serialize user for session (not used in JWT auth, but required by passport)
 */
passport.serializeUser((user, done) => {
  done(null, user);
});

/**
 * Deserialize user from session (not used in JWT auth, but required by passport)
 */
passport.deserializeUser((user: any, done) => {
  done(null, user);
});

export default passport;
