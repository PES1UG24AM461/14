import { useState } from 'react';

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

const emptyQuestion = () => ({ prompt: '', options: ['', ''], correctOption: null });

function toFormState(quiz) {
  if (!quiz) return { title: '', topic: '', minutes: '10', questions: [emptyQuestion()] };
  return {
    title: quiz.title,
    topic: quiz.topic,
    minutes: String(quiz.durationSeconds / 60),
    questions: quiz.questions.length
      ? quiz.questions.map((q) => ({
          prompt: q.prompt,
          options: [...q.options],
          correctOption: q.correctOption,
        }))
      : [emptyQuestion()],
  };
}

// Create / edit form for a quiz and its multiple-choice questions (FR-008, FR-009, FR-010).
// The server validates everything again and its message is shown if it rejects the quiz.
export default function QuizForm({ quiz, onSave, onCancel }) {
  const [form, setForm] = useState(() => toFormState(quiz));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const setField = (field) => (event) => setForm((f) => ({ ...f, [field]: event.target.value }));

  function updateQuestion(index, change) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => (i === index ? change(q) : q)),
    }));
  }

  function removeOption(qIndex, oIndex) {
    updateQuestion(qIndex, (q) => {
      let correctOption = q.correctOption;
      if (correctOption === oIndex) correctOption = null;
      else if (correctOption > oIndex) correctOption -= 1;
      return { ...q, options: q.options.filter((_, i) => i !== oIndex), correctOption };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave({
        title: form.title.trim(),
        topic: form.topic.trim(),
        durationSeconds: Math.round(Number(form.minutes) * 60),
        questions: form.questions.map((q) => ({
          prompt: q.prompt.trim(),
          options: q.options.map((o) => o.trim()),
          correctOption: q.correctOption,
        })),
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the quiz. Please try again.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label={quiz ? 'Edit quiz' : 'New quiz'}>
      <h1>{quiz ? `Edit "${quiz.title}"` : 'New quiz'}</h1>

      <div className="field">
        <label htmlFor="quiz-title">Title</label>
        <input id="quiz-title" value={form.title} onChange={setField('title')} maxLength={200} />
      </div>
      <div className="field">
        <label htmlFor="quiz-topic">Topic</label>
        <input id="quiz-topic" value={form.topic} onChange={setField('topic')} maxLength={100} />
      </div>
      <div className="field">
        <label htmlFor="quiz-minutes">Time limit (minutes)</label>
        <input
          id="quiz-minutes"
          type="number"
          min={1}
          max={240}
          step={1}
          value={form.minutes}
          onChange={setField('minutes')}
        />
      </div>

      {form.questions.map((question, qIndex) => (
        <fieldset key={qIndex} className="question">
          <legend>Question {qIndex + 1}</legend>
          <div className="field">
            <label htmlFor={`q${qIndex}-prompt`}>Question {qIndex + 1} text</label>
            <input
              id={`q${qIndex}-prompt`}
              value={question.prompt}
              onChange={(e) => updateQuestion(qIndex, (q) => ({ ...q, prompt: e.target.value }))}
            />
          </div>

          {question.options.map((option, oIndex) => (
            <div key={oIndex} className="option-row">
              <input
                type="radio"
                name={`q${qIndex}-correct`}
                aria-label={`Question ${qIndex + 1}: option ${oIndex + 1} is correct`}
                checked={question.correctOption === oIndex}
                onChange={() => updateQuestion(qIndex, (q) => ({ ...q, correctOption: oIndex }))}
              />
              <input
                aria-label={`Question ${qIndex + 1} option ${oIndex + 1}`}
                value={option}
                onChange={(e) =>
                  updateQuestion(qIndex, (q) => ({
                    ...q,
                    options: q.options.map((o, i) => (i === oIndex ? e.target.value : o)),
                  }))
                }
              />
              {question.options.length > MIN_OPTIONS && (
                <button
                  type="button"
                  aria-label={`Remove option ${oIndex + 1} from question ${qIndex + 1}`}
                  onClick={() => removeOption(qIndex, oIndex)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          <div className="actions">
            {question.options.length < MAX_OPTIONS && (
              <button
                type="button"
                onClick={() =>
                  updateQuestion(qIndex, (q) => ({ ...q, options: [...q.options, ''] }))
                }
              >
                Add option
              </button>
            )}
            {form.questions.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, questions: f.questions.filter((_, i) => i !== qIndex) }))
                }
              >
                Remove question {qIndex + 1}
              </button>
            )}
          </div>
        </fieldset>
      ))}

      <div className="actions">
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, questions: [...f.questions, emptyQuestion()] }))}
        >
          Add question
        </button>
      </div>

      {error && <p role="alert">{error}</p>}

      <div className="actions">
        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save as draft'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  );
}
