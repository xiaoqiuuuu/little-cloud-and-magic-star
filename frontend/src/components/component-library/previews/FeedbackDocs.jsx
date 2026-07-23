import { useState } from 'react';
import { Alert, Button, CharacterEmptyState, EmptyState, Input, Modal } from '../../../ui';


function FeedbackDocs() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <article className="cl-docs">
      <header className="cl-docs-header">
        <div><div className="cl-kicker">FEEDBACK · STATES</div><h1>反馈与弹窗</h1></div>
        <div className="cl-docs-meta"><span className="cl-status-badge">● Ready</span><span>v0.2.0</span></div>
      </header>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">01</span><h2>Alert</h2></div><p>支持 info、success、warning、error 和可关闭状态。</p></div>
        <div className="cl-alert-demo-stack">
          <Alert type="info" title="提示信息" />
          <Alert type="success" title="操作成功" />
          <Alert type="warning" title="请确认" action={<Button size="small" variant="secondary">查看</Button>} />
          <Alert type="error" title="操作失败" closable />
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">02</span><h2>EmptyState</h2></div><p>基础空状态不依赖人物素材，适合后台工具和通用页面。</p></div>
        <div className="cl-empty-demo-grid">
          <EmptyState title="暂无数据" action={<Button size="small">新建</Button>} />
          <EmptyState icon="⌕" title="没有搜索结果" action={<Button size="small" variant="secondary">清除筛选</Button>} />
        </div>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">03</span><h2>Modal</h2></div><p>支持遮罩与 Escape 关闭、焦点约束、滚动锁定和四种宽度。</p></div>
        <div className="cl-modal-demo">
          <div>
            <strong>Modal</strong>
          </div>
          <Button onClick={() => setModalOpen(true)}>打开弹窗</Button>
        </div>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="弹窗标题"
          footer={(
            <>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
              <Button onClick={() => setModalOpen(false)}>确认</Button>
            </>
          )}
        >
          <Input label="名称" placeholder="请输入名称" autoFocus />
        </Modal>
      </section>

      <section className="cl-section">
        <div className="cl-section-heading"><div><span className="cl-section-index">04</span><h2>人物空状态</h2></div><p>全局角色变化时只替换插画与角色强调色。</p></div>
        <CharacterEmptyState title="暂无数据" action={<Button size="small">新建</Button>} />
      </section>
    </article>
  );
}


export default FeedbackDocs;
