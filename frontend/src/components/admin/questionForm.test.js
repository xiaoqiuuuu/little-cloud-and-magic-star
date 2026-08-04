import test from 'node:test';
import assert from 'node:assert/strict';

import {
  appendResourceUrls,
  clearQuestionDraft,
  createEmptyQuestionForm,
  getResourceType,
  loadQuestionDraft,
  parseResourceUrls,
  removeResourceUrl,
  saveQuestionDraft,
} from './questionForm.js';

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test('resource helpers trim, de-duplicate, append, and remove URLs', () => {
  const resources = ' https://cdn.test/a.jpg \n\nhttps://cdn.test/b.mp4';
  assert.deepEqual(parseResourceUrls(resources), [
    'https://cdn.test/a.jpg',
    'https://cdn.test/b.mp4',
  ]);
  assert.equal(
    appendResourceUrls(resources, ['https://cdn.test/a.jpg', 'https://cdn.test/c.mp3']),
    'https://cdn.test/a.jpg\nhttps://cdn.test/b.mp4\nhttps://cdn.test/c.mp3',
  );
  assert.equal(
    removeResourceUrl(resources, 0),
    'https://cdn.test/b.mp4',
  );
});

test('resource type detection ignores URL query strings and fragments', () => {
  assert.equal(getResourceType('/uploads/photo.AVIF?version=2'), 'image');
  assert.equal(getResourceType('https://cdn.test/clip.mp4#preview'), 'video');
  assert.equal(getResourceType('https://cdn.test/audio.opus'), 'audio');
  assert.equal(getResourceType('https://example.com/resource'), 'link');
});

test('question drafts persist only meaningful new-question content', () => {
  const storage = createStorage();
  const key = 'question-draft:7';

  saveQuestionDraft(storage, key, createEmptyQuestionForm());
  assert.equal(loadQuestionDraft(storage, key), null);

  saveQuestionDraft(storage, key, {
    ...createEmptyQuestionForm(),
    question: '  一道未完成的题目  ',
  });
  assert.equal(loadQuestionDraft(storage, key)?.question, '  一道未完成的题目  ');

  clearQuestionDraft(storage, key);
  assert.equal(loadQuestionDraft(storage, key), null);
});

test('invalid draft JSON is discarded safely', () => {
  const storage = createStorage();
  storage.setItem('broken', '{not-json');
  assert.equal(loadQuestionDraft(storage, 'broken'), null);
  assert.equal(storage.getItem('broken'), null);
});
