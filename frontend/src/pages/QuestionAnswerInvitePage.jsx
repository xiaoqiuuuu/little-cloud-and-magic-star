import { useEffect, useState } from 'react';
import {
  EyeInvisibleOutlined,
  EyeOutlined,
  LinkOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { App } from 'antd';
import { useLocation } from 'react-router-dom';

import api from '../api';
import AudioPreview from '../components/AudioPreview';
import ImagePreview from '../components/ImagePreview';
import VideoPreview from '../components/VideoPreview';
import { getResourceType } from '../components/admin/questionForm';
import { getQuestionTagMeta } from '../constants/questionTags';
import {
  CharacterButton,
  CharacterCard,
  CharacterEmptyState,
  useCloudUI,
} from '../ui';
import './QuestionAnswerInvitePage.css';


const PUBLIC_REQUEST_CONFIG = {
  hideLoading: true,
  hideErrorMessage: true,
  skipAuthRedirect: true,
  skipAuthRefresh: true,
};


function ResourceCard({ url, index }) {
  const type = getResourceType(url);
  if (type === 'image') {
    return <ImagePreview src={url} alt={`题目图片 ${index + 1}`} className="question-answer-invite-resource__media" themedClose />;
  }
  if (type === 'video') {
    return <VideoPreview src={url} className="question-answer-invite-resource__media" themedClose />;
  }
  if (type === 'audio') {
    return <AudioPreview src={url} className="question-answer-invite-resource__audio" themedClose />;
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <LinkOutlined /> 打开题目资源
    </a>
  );
}


function getParticipantId(token) {
  const storageKey = `question-answer-participant:${token}`;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) return stored;
    const generated = window.crypto?.randomUUID?.()
      || `participant-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(storageKey, generated);
    return generated;
  } catch {
    return `participant-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}


export default function QuestionAnswerInvitePage() {
  const location = useLocation();
  const token = location.hash.replace(/^#/, '');
  const { message } = App.useApp();
  const { characterPack } = useCloudUI();
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [answerVisible, setAnswerVisible] = useState(false);
  const [participantId, setParticipantId] = useState('');
  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const requestConfig = {
    ...PUBLIC_REQUEST_CONFIG,
    headers: { 'X-Question-Answer-Invite-Token': token },
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setInvalidLink(false);
    setQuestion(null);
    setAnswer(null);
    setAnswerVisible(false);
    setParticipantId('');
    if (!token) {
      setInvalidLink(true);
      setLoading(false);
      return undefined;
    }
    setParticipantId(getParticipantId(token));
    api.get('/question-answer-invites', requestConfig)
      .then((response) => {
        if (!cancelled) setQuestion(response.data);
      })
      .catch(() => {
        if (!cancelled) setInvalidLink(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const toggleAnswer = async () => {
    if (answer !== null) {
      setAnswerVisible((visible) => !visible);
      return;
    }
    setRevealing(true);
    try {
      const response = await api.post(
        '/question-answer-invites/reveal',
        {},
        {
          ...requestConfig,
          headers: {
            ...requestConfig.headers,
            'X-Question-Answer-Participant-Id': participantId,
          },
        },
      );
      setAnswer(response.data.answer);
      setAnswerVisible(true);
    } catch (error) {
      if (error.response?.status === 404) {
        setInvalidLink(true);
      } else {
        message.error('答案获取失败，请稍后重试');
      }
    } finally {
      setRevealing(false);
    }
  };

  const tagMeta = question ? getQuestionTagMeta(question.tag) : null;

  return (
    <main className="question-answer-invite-page">
      <header className="question-answer-invite-brand">
        <img src={characterPack.assets.buttonAvatar} alt="" />
        <div>
          <strong>肥音卤果</strong>
          <span>邀请答题</span>
        </div>
      </header>

      {loading ? (
        <div className="question-answer-invite-state">
          <LoadingOutlined spin />
          <span>正在打开题目…</span>
        </div>
      ) : invalidLink || !question ? (
        <CharacterEmptyState
          title="这个邀请链接已经失效"
          description="请向邀请人获取新链接。"
        />
      ) : (
        <div className="question-answer-invite-content">
          <div className="question-answer-invite-kicker">
            <span>#{question.question_id}</span>
            <span>{tagMeta.shortLabel}</span>
            <span>{question.invited_by} 邀请</span>
          </div>

          <CharacterCard layout="watermark" className="question-answer-invite-card">
            <span className="question-answer-invite-card__label">题目</span>
            <h1>{question.question}</h1>
          </CharacterCard>

          {question.resources.length > 0 && (
            <section className="question-answer-invite-resources" aria-label="题目资源">
              <h2>题目资源</h2>
              <div>
                {question.resources.map((url, index) => (
                  <div className="question-answer-invite-resource" key={`${url}-${index}`}>
                    <ResourceCard url={url} index={index} />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="question-answer-invite-reveal">
            <CharacterButton
              block
              size="large"
              onClick={toggleAnswer}
              loading={revealing}
            >
              {answerVisible ? <><EyeInvisibleOutlined /> 收起答案</> : <><EyeOutlined /> 揭晓答案</>}
            </CharacterButton>
            {answerVisible && answer !== null && (
              <div className="question-answer-invite-answer" role="status">
                <span>正确答案</span>
                <strong>{answer}</strong>
              </div>
            )}
          </section>

        </div>
      )}
    </main>
  );
}
