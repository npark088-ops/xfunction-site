// Types matching the real Schoology REST API v1 response shapes.
// Docs: https://developers.schoology.com/api-documentation/rest-api-v1/
// Keeping these accurate means swapping mock data for real API calls
// later requires zero changes to UI logic downstream.

// Schoology's OAuth1 token endpoints (request_token, access_token)
// respond with a raw application/x-www-form-urlencoded body — NOT
// JSON — same as classic Twitter-style OAuth1. e.g.
// "oauth_token=abc&oauth_token_secret=xyz"
export interface SchoologyOAuthTokenPair {
  oauth_token: string;
  oauth_token_secret: string;
}

// Response shape from GET /v1/users/me
export interface SchoologyUser {
  id: number;
  name_display: string;
  primary_email?: string;
}

export interface SchoologyCourse {
  id: number;
  title: string;
  course_code?: string;
}

export interface SchoologyGrade {
  assignment_id: number;
  grade: number | null;
  max_points: number;
}
