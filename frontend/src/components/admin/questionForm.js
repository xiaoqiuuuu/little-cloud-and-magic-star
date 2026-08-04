import { DEFAULT_QUESTION_TAG } from '../../constants/questionTags.js';

export const MAX_RESOURCE_FILE_SIZE = 10 * 1024 * 1024;

export function createEmptyQuestionForm() {
  return {
    question: '',
    answer: '',
    resources: '',
    tag: DEFAULT_QUESTION_TAG,
    contributor_ids: [],
  };
}

export function normalizeQuestionForm(value = {}) {
  return {
    question: typeof value.question === 'string' ? value.question : '',
    answer: typeof value.answer === 'string' ? value.answer : '',
    resources: typeof value.resources === 'string' ? value.resources : '',
    tag: typeof value.tag === 'string' && value.tag.trim()
      ? value.tag
      : DEFAULT_QUESTION_TAG,
    contributor_ids: Array.isArray(value.contributor_ids)
      ? value.contributor_ids
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
      : [],
  };
}

export function parseResourceUrls(resources = '') {
  return String(resources)
    .split(/\r?\n/)
    .map((url) => url.trim())
    .filter(Boolean);
}

export function serializeResourceUrls(urls = []) {
  return [...new Set(urls.map((url) => String(url).trim()).filter(Boolean))].join('\n');
}

export function appendResourceUrls(resources, urls) {
  return serializeResourceUrls([...parseResourceUrls(resources), ...urls]);
}

export function removeResourceUrl(resources, index) {
  const urls = parseResourceUrls(resources);
  urls.splice(index, 1);
  return serializeResourceUrls(urls);
}

export function getResourceType(url = '') {
  const path = String(url).split(/[?#]/, 1)[0].toLowerCase();
  const extension = path.includes('.') ? path.split('.').pop() : '';

  if (/^(jpg|jpeg|png|gif|webp|bmp|svg|avif)$/.test(extension)) return 'image';
  if (/^(mp4|webm|ogg|mov|avi|mkv|m4v)$/.test(extension)) return 'video';
  if (/^(mp3|wav|aac|flac|m4a|ogg|opus)$/.test(extension)) return 'audio';
  return 'link';
}

export function isSafeResourceUrl(url = '') {
  const value = String(url).trim();
  return value.startsWith('/uploads/')
    || value.startsWith('https://')
    || value.startsWith('http://');
}

export function hasQuestionDraftContent(formData) {
  const normalized = normalizeQuestionForm(formData);
  return Boolean(
    normalized.question.trim()
    || normalized.answer.trim()
    || normalized.resources.trim()
    || normalized.tag !== DEFAULT_QUESTION_TAG
  );
}

export function loadQuestionDraft(storage, key) {
  if (!storage || !key) return null;

  try {
    const saved = storage.getItem(key);
    if (!saved) return null;
    const formData = normalizeQuestionForm(JSON.parse(saved));
    return hasQuestionDraftContent(formData) ? formData : null;
  } catch {
    storage.removeItem(key);
    return null;
  }
}

export function saveQuestionDraft(storage, key, formData) {
  if (!storage || !key) return;

  try {
    if (hasQuestionDraftContent(formData)) {
      storage.setItem(key, JSON.stringify(normalizeQuestionForm(formData)));
    } else {
      storage.removeItem(key);
    }
  } catch {
    // Storage may be unavailable in private browsing or restricted webviews.
  }
}

export function clearQuestionDraft(storage, key) {
  if (!storage || !key) return;
  try {
    storage.removeItem(key);
  } catch {
    // Ignore storage failures; they should not block question creation.
  }
}
