# Responsive and accessibility audit (OQS-22)

Date: 14 Nov 2026. Branch `feature/OQS-22-responsive-accessible`, run against the local dev servers.

## Method

A Playwright script opened every page as a guest, a student, a faculty member and an administrator at
**375 px, 768 px and 1280 px** wide (22 page/role combinations, 66 checks). For each page it:

- compared `document.scrollWidth` with the viewport width (horizontal scrolling, NFR-004);
- looked for buttons, links and inputs that sit partly off-screen (the leaderboard table is excluded
  because it scrolls inside its own box by design);
- at 375 px and 1280 px, ran [axe-core](https://github.com/dequelabs/axe-core) 4.10 with the WCAG 2.0/2.1
  A and AA rule sets plus axe best practices.

Quiz-taking and result pages were checked with the attempt API mocked, so the audit wrote nothing to the
shared database. The quiz form was checked with six options open, its widest state.

Pages covered: Home, Register, Log in, Quiz Topics, Quiz details, Take Quiz, Quiz Result, My Scores,
Quiz Leaderboard, Feedback, About, Contact, Page not found, Quiz Management (list and the New quiz form),
User Management and Feedback Review.

## Results

| Run              | Layout problems (66 checks) | axe violations                                      |
| ---------------- | --------------------------- | --------------------------------------------------- |
| Before the fixes | 0                           | 1: `page-has-heading-one` on the New/Edit quiz form |
| After the fixes  | 0                           | 0                                                   |

## Fixes made in this story

| Problem found                                                                                | Fix                                                                                               | Requirement         |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------- |
| The countdown was an `aria-live` region, so a screen reader would read the time every second | Timer is plain text; a separate status region announces "One minute left." and "10 seconds left." | NFR-005             |
| Registration errors used `role="status"` (polite) like the success message                   | Errors are `role="alert"`; success stays `role="status"`                                          | NFR-005, TC-AUTH-03 |
| The password rule (8 characters) was only enforced, never shown                              | Hint under the field, linked with `aria-describedby`                                              | NFR-005, TC-UX-02   |
| The New/Edit quiz form had no level-1 heading                                                | Form heading is now `h1`                                                                          | NFR-005             |
| "Log in" link on Register reloaded the whole app                                             | Uses the router link like the rest of the app                                                     | —                   |

## STP test cases

| TC ID      | Result | Evidence                                                                                                    |
| ---------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| TC-NAV-05  | Passed | Home, About, Contact and Feedback at 375 px: no horizontal scrolling; navigation wraps and stays usable     |
| TC-UX-01   | Passed | All core pages at 375/768/1280 px: 0 layout problems                                                        |
| TC-UX-02   | Passed | axe: 0 violations; every field has a visible label; errors are `role="alert"`; automated tests `TC-UX-02 …` |
| TC-AUTH-03 | Passed | Automated test `TC-AUTH-03 …` (labels, required fields, input limits)                                       |
| TC-FB-02   | Passed | Automated tests `TC-FB-02 …` (client and server)                                                            |

Not done: the STP also suggests a pass with a screen reader. The announcements were verified through their
ARIA roles in automated tests and axe, not by listening with VoiceOver or NVDA.
