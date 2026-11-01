import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import api from '../api/client.js';
import QuizManagement from './QuizManagement.jsx';

function renderQuizManagement() {
  return render(
    <MemoryRouter initialEntries={['/manage/quizzes']}>
      <Routes>
        <Route path="/manage/quizzes" element={<QuizManagement />} />
        <Route path="/quizzes" element={<div>Quizzes Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('OQS-09: Quiz Management page', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading state while fetching quizzes', () => {
    vi.spyOn(api, 'get').mockReturnValue(new Promise(() => {}));
    renderQuizManagement();

    expect(screen.getByRole('status')).toHaveTextContent('Loading managed quizzes...');
  });

  it('renders manageable quizzes for authorized staff', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: {
        quizzes: [
          {
            id: 'q1',
            title: 'Data Structures Quiz',
            topic: 'Computer Science',
            status: 'draft',
            questionCount: 10,
          },
          {
            id: 'q2',
            title: 'Linear Algebra Quiz',
            topic: 'Mathematics',
            status: 'published',
            questionCount: 1,
          },
        ],
      },
    });

    renderQuizManagement();

    expect(await screen.findByText(/Data Structures Quiz/)).toBeInTheDocument();
    expect(screen.getByText(/10 questions/)).toBeInTheDocument();
    expect(screen.getByText(/1 question/)).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/manage/quizzes');
  });

  it('shows empty message when no quizzes have been created', async () => {
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { quizzes: [] },
    });

    renderQuizManagement();

    expect(await screen.findByText('No quizzes created yet.')).toBeInTheDocument();
  });

  it('denies access with 403 for student role', async () => {
    vi.spyOn(api, 'get').mockRejectedValue({
      response: { status: 403, data: { error: 'Faculty or administrators only' } },
    });

    renderQuizManagement();

    expect(await screen.findByRole('alert')).toHaveTextContent('Faculty or administrators only');
    expect(screen.getByRole('link', { name: 'Back to quizzes' })).toHaveAttribute(
      'href',
      '/quizzes'
    );
  });

  it('prompts to log in when unauthenticated (401)', async () => {
    vi.spyOn(api, 'get').mockRejectedValue({
      response: { status: 401 },
    });

    renderQuizManagement();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please log in as faculty or administrator to manage quizzes.'
    );
  });

  it('handles generic server errors', async () => {
    vi.spyOn(api, 'get').mockRejectedValue(new Error('Network Failure'));

    renderQuizManagement();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load quizzes for management.'
    );
  });

  it('cleans up without error when unmounted before request completes', () => {
    let resolvePromise;
    vi.spyOn(api, 'get').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
    );

    const { unmount } = renderQuizManagement();
    unmount();
    resolvePromise({ data: { quizzes: [] } });
  });
});

const draft = {
  id: 'q1',
  title: 'JavaScript Basics',
  topic: 'Programming',
  status: 'draft',
  durationSeconds: 600,
  questionCount: 1,
};
const published = { ...draft, id: 'q2', title: 'Data Structures', status: 'published' };
const fullDraft = {
  ...draft,
  createdBy: 'f1',
  questions: [{ id: 'x1', prompt: 'What is 2 + 2?', options: ['3', '4'], correctOption: 1 }],
};

function listResponse(quizzes = [draft, published]) {
  return { data: { quizzes } };
}

const type = (label, value) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('OQS-09: creating, editing, publishing and deleting quizzes', () => {
  afterEach(() => vi.restoreAllMocks());

  async function openPage(quizzes) {
    vi.spyOn(api, 'get').mockResolvedValue(listResponse(quizzes));
    renderQuizManagement();
    await screen.findByText('Create, edit, and publish quizzes.');
  }

  it('TC-QM-01 creates a quiz with a question and saves it as a draft', async () => {
    await openPage([]);
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { quiz: fullDraft } });

    fireEvent.click(screen.getByRole('button', { name: 'New quiz' }));
    type('Title', 'JavaScript Basics');
    type('Topic', 'Programming');
    type('Time limit (minutes)', '5');
    type('Question 1 text', 'What is 2 + 2?');
    type('Question 1 option 1', '3');
    type('Question 1 option 2', '4');
    fireEvent.click(screen.getByLabelText('Question 1: option 2 is correct'));
    fireEvent.click(screen.getByRole('button', { name: 'Save as draft' }));

    expect(await screen.findByText('Quiz saved as a draft.')).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/quizzes', {
      title: 'JavaScript Basics',
      topic: 'Programming',
      durationSeconds: 300,
      questions: [{ prompt: 'What is 2 + 2?', options: ['3', '4'], correctOption: 1 }],
    });
    expect(api.get).toHaveBeenCalledTimes(2); // list reloaded
  });

  it('TC-QM-03 adds and removes options and questions, keeping the correct option in step', async () => {
    await openPage([]);
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { quiz: fullDraft } });

    fireEvent.click(screen.getByRole('button', { name: 'New quiz' }));
    type('Title', 'Quiz');
    type('Topic', 'Topic');
    fireEvent.click(screen.getByRole('button', { name: 'Add option' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add option' }));
    ['a', 'b', 'c', 'd'].forEach((v, i) => type(`Question 1 option ${i + 1}`, v));
    fireEvent.click(screen.getByLabelText('Question 1: option 4 is correct'));
    fireEvent.click(screen.getByRole('button', { name: 'Remove option 1 from question 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add question' }));
    type('Question 2 text', 'Second');
    fireEvent.click(screen.getByRole('button', { name: 'Remove question 2' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save as draft' }));

    await screen.findByText('Quiz saved as a draft.');
    expect(post.mock.calls[0][1].questions).toEqual([
      { prompt: '', options: ['b', 'c', 'd'], correctOption: 2 },
    ]);
  });

  it('TC-QM-04 shows the server validation message and keeps the form open', async () => {
    await openPage([]);
    vi.spyOn(api, 'post').mockRejectedValue({
      response: { status: 422, data: { error: 'Question 1: The correct option is required' } },
    });

    fireEvent.click(screen.getByRole('button', { name: 'New quiz' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save as draft' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Question 1: The correct option is required'
    );
    expect(screen.getByRole('button', { name: 'Save as draft' })).toBeEnabled();
  });

  it('cancels the form without saving', async () => {
    await openPage([]);
    const post = vi.spyOn(api, 'post');

    fireEvent.click(screen.getByRole('button', { name: 'New quiz' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByRole('button', { name: 'New quiz' })).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it('TC-QM-06 edits a draft with its questions and saves the changes', async () => {
    await openPage();
    api.get.mockResolvedValueOnce({ data: { quiz: fullDraft } });
    const patch = vi.spyOn(api, 'patch').mockResolvedValue({ data: { quiz: fullDraft } });

    fireEvent.click(screen.getByRole('button', { name: 'Edit JavaScript Basics' }));
    expect(await screen.findByLabelText('Title')).toHaveValue('JavaScript Basics');
    expect(screen.getByLabelText('Question 1: option 2 is correct')).toBeChecked();
    type('Title', 'JavaScript Basics 2');
    fireEvent.click(screen.getByRole('button', { name: 'Save as draft' }));

    expect(await screen.findByText('Changes saved.')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/manage/quizzes/q1');
    expect(patch).toHaveBeenCalledWith(
      '/quizzes/q1',
      expect.objectContaining({ title: 'JavaScript Basics 2', durationSeconds: 600 })
    );
  });

  it('shows an error if a quiz cannot be opened for editing', async () => {
    await openPage();
    api.get.mockRejectedValueOnce({ response: { data: { error: 'Quiz not found' } } });

    fireEvent.click(screen.getByRole('button', { name: 'Edit JavaScript Basics' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Quiz not found');
  });

  it('TC-QM-09 publishes a draft and unpublishes a published quiz after confirmation', async () => {
    await openPage();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: {} });

    fireEvent.click(screen.getByRole('button', { name: 'Publish JavaScript Basics' }));
    expect(await screen.findByText('"JavaScript Basics" is now published.')).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/quizzes/q1/publish');

    fireEvent.click(screen.getByRole('button', { name: 'Unpublish Data Structures' }));
    expect(await screen.findByText('"Data Structures" is back to draft.')).toBeInTheDocument();
    expect(post).toHaveBeenCalledWith('/quizzes/q2/unpublish');
  });

  it('TC-QM-10 shows why a quiz cannot be published', async () => {
    await openPage();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(api, 'post').mockRejectedValue({
      response: { status: 422, data: { error: 'Cannot publish this quiz: missing questions' } },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Publish JavaScript Basics' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('missing questions');
  });

  it('TC-QM-06 deletes a draft only after confirmation', async () => {
    await openPage();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValue(true);
    const del = vi.spyOn(api, 'delete').mockResolvedValue({});

    fireEvent.click(screen.getByRole('button', { name: 'Delete JavaScript Basics' }));
    expect(del).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete JavaScript Basics' }));
    expect(await screen.findByText('"JavaScript Basics" was deleted.')).toBeInTheDocument();
    expect(del).toHaveBeenCalledWith('/quizzes/q1');
    expect(confirm).toHaveBeenCalledTimes(2);
  });

  it('does nothing when publishing or unpublishing is cancelled', async () => {
    await openPage();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const post = vi.spyOn(api, 'post');

    fireEvent.click(screen.getByRole('button', { name: 'Publish JavaScript Basics' }));
    fireEvent.click(screen.getByRole('button', { name: 'Unpublish Data Structures' }));

    expect(post).not.toHaveBeenCalled();
  });

  it('shows a generic message when an action fails without a server message', async () => {
    await openPage();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(api, 'delete').mockRejectedValue(new Error('Network Error'));

    fireEvent.click(screen.getByRole('button', { name: 'Delete JavaScript Basics' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('offers edit, publish and delete only for drafts, and unpublish only for published quizzes', async () => {
    await openPage();
    const [draftItem, publishedItem] = screen.getAllByRole('listitem');

    expect(
      within(draftItem)
        .getAllByRole('button')
        .map((b) => b.textContent)
    ).toEqual(['Edit', 'Publish', 'Delete']);
    expect(
      within(publishedItem)
        .getAllByRole('button')
        .map((b) => b.textContent)
    ).toEqual(['Unpublish']);
    expect(draftItem).toHaveTextContent('10 minutes');
  });
});
