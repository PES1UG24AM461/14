# Deviations from the submitted documents

Record every place where the implementation differs from the submitted SRS, SAD or STP, with the reason.
These are explained during the final demo (Mini-Project Deliverables Part-2, item 2i).

| Date        | Backlog item | Document and section | What changed                                                                         | Reason                                                                 |
| ----------- | ------------ | -------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| 27 Oct 2026 | CI (PR #30)  | STP TC-CI-02         | CI runs on pushes to `main` and on pull requests, not on every feature-branch push   | Avoids running every check twice for branches that have a pull request |
| 27 Oct 2026 | OQS-07       | SAD 4.3              | Added `GET /api/manage/quizzes/:quizId` (owner/admin only, includes correct options) | The Quiz Management page needs one quiz with its questions to edit it  |
| 27 Oct 2026 | OQS-07       | SAD 4.4              | Quiz duration limited to 60 s – 4 h; questions have 2–6 options                      | Limits not specified in the SAD; prevent unusable quizzes              |
