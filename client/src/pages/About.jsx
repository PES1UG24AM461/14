import { Link } from 'react-router-dom';

// About page (FR-007).
export default function About() {
  return (
    <main className="page">
      <h1>About</h1>
      <p>
        The Online Quiz System lets students take timed multiple-choice quizzes and see their score
        as soon as they submit. Faculty and administrators create, edit and publish the quizzes.
      </p>

      <h2>How it works</h2>
      <ul>
        <li>Students browse published quizzes by topic and get one attempt per quiz.</li>
        <li>
          The time limit is enforced by the server, so changing the computer clock has no effect.
        </li>
        <li>Scores are calculated on the server; correct answers are never sent to the browser.</li>
        <li>Faculty manage their own quizzes; administrators can manage every quiz.</li>
      </ul>

      <h2>Project</h2>
      <p>
        Built for the Software Engineering course at PES University (Section H, faculty guide
        Arpitha K) by Batchu Hari Nainika, Avyukth KV and Samvith Vaddiparthi.
      </p>
      <p>
        <Link to="/quizzes">Browse quizzes</Link>
      </p>
    </main>
  );
}
