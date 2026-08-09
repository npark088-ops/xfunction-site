// Types matching the real Blackboard Learn REST API response shapes.
// Docs: https://developer.blackboard.com/portal/displayApi
// Keeping these accurate means swapping mock data for real API calls
// later requires zero changes to UI logic downstream.

// Response shape from POST {baseUrl}/learn/api/public/v1/oauth2/token
export interface BlackboardOAuthTokenResponse {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  // Real Blackboard's three-legged (user context) token response
  // includes the authorizing user's id directly — unlike Canvas
  // (embeds a whole user object), Google (needs a separate id_token
  // decode), or Schoology/Moodle (needs a separate profile call), this
  // one's a middle ground: an id, but not a display name.
  user_id: string;
}

// Response shape from GET {baseUrl}/learn/api/public/v1/users/{userId}
export interface BlackboardUser {
  id: string;
  userName: string;
  name: {
    given: string;
    family: string;
  };
}
