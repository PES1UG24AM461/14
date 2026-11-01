import { Link } from 'react-router-dom';

const REPO_URL = 'https://github.com/PES1UG24AM461/14';

// Contact page (FR-007).
export default function Contact() {
  return (
    <main className="page">
      <h1>Contact</h1>
      <p>
        Questions about a quiz or your score? Ask the faculty member who set the quiz, or send us a
        message through the <Link to="/feedback">Feedback</Link> page.
      </p>

      <h2>Project team</h2>
      <p>
        PES University, Bengaluru.
        <br />
        Software Engineering mini-project, Section H. Faculty guide: Arpitha K.
      </p>

      <h2>Report a problem</h2>
      <p>
        Bugs and feature requests can be raised as issues in the{' '}
        <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">
          project repository
        </a>
        .
      </p>
    </main>
  );
}
