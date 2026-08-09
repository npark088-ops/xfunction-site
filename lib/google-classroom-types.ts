// Types matching the real Google OAuth2/OIDC + Classroom REST API
// response shapes. Docs:
//   OAuth2:    https://developers.google.com/identity/protocols/oauth2/web-server
//   Classroom: https://developers.google.com/classroom/reference/rest/v1/courses
// Keeping these accurate means swapping mock data for real API calls
// later requires zero changes to UI/calculator logic downstream.

// Response shape from POST https://oauth2.googleapis.com/token
export interface GoogleOAuthTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: "Bearer";
  // Only present when the authorization request included
  // access_type=offline (see buildAuthorizationUrl) — Google also won't
  // re-issue one on a re-consent unless prompt=consent was also set,
  // same as the real API.
  refresh_token?: string;
  // Only present when the "openid" scope was requested — a signed JWT
  // (header.payload.signature) carrying the user's identity claims.
  // Real integrations must verify the signature (e.g. via
  // google-auth-library) before trusting its contents; see the comment
  // in lib/google-classroom-oauth.ts's decodeIdToken().
  id_token?: string;
}

// Decoded payload of the id_token JWT (OIDC standard claims).
export interface GoogleIdTokenClaims {
  sub: string;
  name?: string;
  email?: string;
  email_verified?: boolean;
}

export interface GoogleClassroomCourse {
  id: string;
  name: string;
  section?: string;
  courseState: "ACTIVE" | "ARCHIVED" | "PROVISIONED" | "DECLINED" | "SUSPENDED";
}

export interface GoogleClassroomCourseWork {
  id: string;
  title: string;
  maxPoints?: number;
  dueDate?: { year: number; month: number; day: number };
}
