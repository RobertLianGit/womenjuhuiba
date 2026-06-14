'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { isOrganizer, setPassphrase, getPassphrase, getUserId, markActivityAccessed, isActivityAccessed, setAccessCode, getAccessCode } from '@/lib/party';
import {
  ClipboardCheck, Vote, FileText, UserPlus, LayoutDashboard, Receipt,
  Share2, Copy, Check, ArrowRight, ArrowLeft, Crown, Calendar, ChevronRight,
  Send, CheckCircle2, UserCheck, KeyRound, Lock, Image as ImageIcon, Download,
  Archive, Trash2, AlertTriangle
} from 'lucide-react';
import QRCode from 'qrcode';

interface Activity {
  id: string;
  title: string;
  description: string;
  rough_time: string;
  creator_name: string;
  creator_id: string;
  status: string;
  passphrase?: string;
  access_code: string;
  access_token?: string;
  archived?: boolean;
}

const STATUS_MAP: Record<string, { label: string; bg: string; rotate: string; desc: string }> = {
  collecting: { label: '意愿收集中', bg: 'bg-primary text-[#0A0A0A]', rotate: '-rotate-2', desc: '大家正在填写参与意愿' },
  voting:     { label: '投票中', bg: 'bg-accent-blue text-white', rotate: 'rotate-1', desc: '正在投票决定去哪里' },
  plan:       { label: '方案确认中', bg: 'bg-warning text-[#0A0A0A]', rotate: 'rotate-2', desc: '组织者正在确认活动方案' },
  registering:{ label: '报名中', bg: 'bg-success text-white', rotate: '-rotate-1', desc: '选择参与的分段报名' },
  started:    { label: '进行中', bg: 'bg-accent-blue text-white', rotate: '-rotate-2', desc: '活动正在进行' },
  settling:   { label: '结算中', bg: 'bg-warning text-[#0A0A0A]', rotate: 'rotate-1', desc: '正在记账分摊费用' },
  settled:    { label: '已结算', bg: 'bg-muted text-muted-foreground', rotate: '', desc: '活动费用已结清' },
};

const STATUS_ORDER = ['collecting', 'voting', 'plan', 'registering', 'started', 'settling', 'settled'];

const PREV_STATUS: Record<string, string> = {
  voting: 'collecting',
  plan: 'voting',
  registering: 'plan',
  started: 'registering',
  settling: 'started',
};

const ACTION_MAP: Record<string, { label: string; next: string }> = {
  collecting: { label: '开始投票', next: 'voting' },
  voting:     { label: '确认方案', next: 'plan' },
  plan:       { label: '开启报名', next: 'registering' },
  registering:{ label: '活动开始', next: 'started' },
  started:    { label: '开始结算', next: 'settling' },
  settling:   { label: '完成结算', next: 'settled' },
};

const PARTICIPANT_ACTION: Record<string, { label: string; href: string; icon: typeof ClipboardCheck; color: string }> = {
  collecting: { label: '填写意愿', href: '/intention', icon: Send, color: 'bg-primary text-[#0A0A0A]' },
  voting:     { label: '去投票', href: '/vote', icon: Vote, color: 'bg-accent-blue text-white' },
  plan:       { label: '查看方案', href: '/plan', icon: FileText, color: 'bg-warning text-[#0A0A0A]' },
  registering:{ label: '去报名', href: '/register', icon: UserCheck, color: 'bg-success text-white' },
  started:    { label: '查看活动', href: '/register', icon: CheckCircle2, color: 'bg-accent-blue text-white' },
  settling:   { label: '查看账单', href: '/settle', icon: Receipt, color: 'bg-warning text-[#0A0A0A]' },
  settled:    { label: '查看结算', href: '/settle', icon: Receipt, color: 'bg-muted text-muted-foreground' },
};

const ORGANIZER_ENTRIES = [
  { key: 'collecting', label: '意愿收集', icon: ClipboardCheck, desc: '收集大家的意愿和想法', minStatus: 0 },
  { key: 'voting', label: '投票去哪', icon: Vote, desc: '投票决定去哪里', minStatus: 1 },
  { key: 'plan', label: '方案确认', icon: FileText, desc: '确认活动方案和分段', minStatus: 2 },
  { key: 'registering', label: '分段报名', icon: UserPlus, desc: '按段报名参加', minStatus: 3 },
  { key: 'dashboard', label: '组织者看板', icon: LayoutDashboard, desc: '管理参与人员', minStatus: 3 },
  { key: 'settle', label: '记账结算', icon: Receipt, desc: '分摊费用和转账', minStatus: 5 },
];

export default function ActivityPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><p className="text-xl font-bold">加载中...</p></div>}>
      <ActivityPage />
    </Suspense>
  );
}

function ActivityPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') || '';
  const token = searchParams.get('token') || '';
  const [activity, setActivity] = useState<Activity | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showPassphraseModal, setShowPassphraseModal] = useState(false);
  const [passphraseInput, setPassphraseInput] = useState('');
  const [passphraseError, setPassphraseError] = useState('');
  const [stats, setStats] = useState({ intentionCount: 0, voteCount: 0, registrationCount: 0 });

  // Access code verification
  const [accessGranted, setAccessGranted] = useState(false);
  const [accessCodeInput, setAccessCodeInput] = useState('');
  const [accessError, setAccessError] = useState('');

  // Archive / Delete
  const [showArchiveDialog, setShowArchiveDialog] = useState<'archive' | 'delete' | 'participant_delete' | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  // Fetch activity by id or token
  useEffect(() => {
    if (!id && !token) return;
    const url = token ? `/api/activities?access_token=${token}` : `/api/activities?id=${id}`;
    fetch(url)
      .then(r => r.json())
      .then(res => {
        const data = res.data || null;
        setActivity(data);
        setLoading(false);
        if (data) {
          const isOrg = isOrganizer(data.id);
          const isAccessed = isActivityAccessed(data.id);
          if (isOrg || isAccessed || token) {
            // Token-based access = auto-grant
            if (token) {
              markActivityAccessed(data.id);
            }
            setAccessGranted(true);
          }
        }
      })
      .catch(() => setLoading(false));
  }, [id, token]);

  // Fetch progress stats
  useEffect(() => {
    if (!id || !accessGranted) return;
    Promise.all([
      fetch(`/api/intentions?activity_id=${id}`).then(r => r.json()),
      fetch(`/api/vote-records?activity_id=${id}`).then(r => r.json()),
      fetch(`/api/registrations?activity_id=${id}`).then(r => r.json()),
    ]).then(([intRes, voteRes, regRes]) => {
      setStats({
        intentionCount: (intRes.data || []).length,
        voteCount: (voteRes.data || []).length,
        registrationCount: (regRes.data || []).length,
      });
    }).catch(() => {});
  }, [id, accessGranted]);

  const isCreator = activity ? isOrganizer(activity.id) : false;
  const currentIdx = activity ? STATUS_ORDER.indexOf(activity.status) : -1;

  const handleAccessVerify = async () => {
    if (!activity || !accessCodeInput.trim()) return;
    try {
      const res = await fetch(`/api/activities?access_code=${encodeURIComponent(accessCodeInput.trim())}`);
      const data = await res.json();
      if (data.data && data.data.id === activity.id) {
        setAccessCode(activity.id, accessCodeInput.trim());
        markActivityAccessed(activity.id);
        setAccessGranted(true);
        setAccessCodeInput('');
        setAccessError('');
      } else {
        setAccessError('活动口令不正确，请确认后重试');
      }
    } catch {
      setAccessError('网络错误，请重试');
    }
  };

  const handleNextStatus = async () => {
    if (!activity) return;
    const action = ACTION_MAP[activity.status];
    if (!action) return;
    const passphrase = getPassphrase(activity.id);
    const res = await fetch(`/api/activities/${activity.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: action.next, passphrase }),
    });
    const result = await res.json();
    if (result.data) setActivity(result.data);
  };

  const handleCopyLink = () => {
    const url = activity?.access_token
      ? `${window.location.origin}/activity?token=${activity.access_token}`
      : `${window.location.origin}/activity?id=${id}`;
    const accessCode = getAccessCode(id);
    const text = activity
      ? `🎉 聚会活动：${activity.title}\n👤 发起人：${activity.creator_name}\n\n📎 点击链接直接加入：\n${url}${!activity.access_token && accessCode ? `\n\n没有链接？输入活动口令：${accessCode}` : ''}`
      : url;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [generatingImage, setGeneratingImage] = useState(false);

  const [shareImageVisible, setShareImageVisible] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState('');

  const handleArchive = async () => {
    if (!activity) return;
    const passphrase = getPassphrase(activity.id);
    try {
      const res = await fetch(`/api/activities/${activity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive', passphrase, archived: true }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      // Re-fetch activity to update state
      const fresh = await fetch(`/api/activities?id=${activity.id}`);
      const freshData = await fresh.json();
      if (freshData.data) setActivity(freshData.data);
      else window.location.href = '/';
    } catch { alert('归档失败'); }
  };

  const handleUnarchive = async () => {
    if (!activity) return;
    const passphrase = getPassphrase(activity.id);
    try {
      const res = await fetch(`/api/activities/${activity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unarchive', passphrase, archived: false }),
      });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      const fresh = await fetch(`/api/activities?id=${activity.id}`);
      const freshData = await fresh.json();
      if (freshData.data) setActivity(freshData.data);
    } catch { alert('操作失败'); }
  };

  const handleHide = async () => {
    if (!activity) return;
    const uid = getUserId();
    if (!uid) return;
    try {
      const res = await fetch(`/api/activities/${activity.id}?mode=participant&user_id=${encodeURIComponent(uid)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      window.location.href = '/';
    } catch { alert('操作失败'); }
  };

  const handleDelete = async () => {
    if (!activity) return;
    const passphrase = getPassphrase(activity.id);
    try {
      const res = await fetch(`/api/activities/${activity.id}?mode=organizer&passphrase=${encodeURIComponent(passphrase)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.error) { alert(data.error); return; }
      window.location.href = '/';
    } catch { alert('删除失败'); }
  };

  const handleArchiveOrDelete = async () => {
    if (!showArchiveDialog || !activity) return;
    if (showArchiveDialog === 'archive') {
      if (activity.archived) {
        await handleUnarchive();
      } else {
        await handleArchive();
      }
    } else if (showArchiveDialog === 'delete') {
      await handleDelete();
    } else if (showArchiveDialog === 'participant_delete') {
      await handleHide();
    }
    setShowArchiveDialog(null);
    setDeleteConfirmInput('');
  };

  const handleGenerateShareImage = async () => {
    if (!activity) return;
    setGeneratingImage(true);
    try {
      const url = activity?.access_token
        ? `${window.location.origin}/activity?token=${activity.access_token}`
        : `${window.location.origin}/activity?id=${id}`;
      const accessCode = getAccessCode(id);
      const qrDataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2, color: { dark: '#0A0A0A', light: '#FFFFFF' } });

      const canvas = document.createElement('canvas');
      canvas.width = 750;
      canvas.height = 1100;
      const ctx = canvas.getContext('2d')!;

      // 背景
      ctx.fillStyle = '#FF4DB8';
      ctx.fillRect(0, 0, 750, 16);
      ctx.fillStyle = '#FAFAF5';
      ctx.fillRect(0, 16, 750, 1068);
      ctx.fillStyle = '#FF4DB8';
      ctx.fillRect(0, 1084, 750, 16);

      // 标题区
      ctx.fillStyle = '#0A0A0A';
      ctx.font = 'bold 48px "PingFang SC", "Microsoft YaHei", sans-serif';
      const titleLines = wrapText(ctx, activity.title, 630);
      let titleY = 100;
      titleLines.forEach((line) => {
        ctx.fillText(line, 60, titleY);
        titleY += 58;
      });

      // 分割线
      ctx.fillStyle = '#0A0A0A';
      ctx.fillRect(60, titleY + 10, 630, 4);

      // 信息区
      ctx.font = '30px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillStyle = '#333333';
      let yPos = titleY + 70;

      if (activity.rough_time) {
        ctx.fillStyle = '#FF4DB8';
        ctx.font = '30px "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillText('时间', 60, yPos);
        ctx.fillStyle = '#333333';
        ctx.fillText(activity.rough_time, 140, yPos);
        yPos += 55;
      }
      if (activity.description) {
        ctx.fillStyle = '#FF4DB8';
        ctx.font = '30px "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillText('内容', 60, yPos);
        ctx.fillStyle = '#333333';
        ctx.font = '28px "PingFang SC", "Microsoft YaHei", sans-serif';
        const descLines = wrapText(ctx, activity.description, 540);
        descLines.forEach((line, i) => {
          ctx.fillText(line, 140, yPos + i * 42);
        });
        yPos += descLines.length * 42 + 20;
      }

      ctx.fillStyle = '#FF4DB8';
      ctx.font = '30px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText('发起', 60, yPos);
      ctx.fillStyle = '#333333';
      ctx.fillText(activity.creator_name || '匿名', 140, yPos);
      yPos += 55;

      if (accessCode) {
        ctx.fillStyle = '#FF4DB8';
        ctx.font = '30px "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.fillText('口令', 60, yPos);
        ctx.fillStyle = '#333333';
        ctx.fillText(accessCode, 140, yPos);
        yPos += 55;
      }

      // 二维码区 - 居中放置
      const qrImg = new Image();
      qrImg.src = qrDataUrl;
      await new Promise<void>((resolve) => { qrImg.onload = () => resolve(); });
      const qrSize = 260;
      const qrX = (750 - qrSize) / 2;
      const qrY = Math.max(yPos + 30, 700);
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      // 底部提示
      ctx.fillStyle = '#999999';
      ctx.font = '24px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('扫码查看活动详情 · 长按保存图片', 375, qrY + qrSize + 40);
      ctx.textAlign = 'left';

      // 品牌名
      ctx.fillStyle = '#FF4DB8';
      ctx.font = 'bold 22px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('我们聚会吧', 375, qrY + qrSize + 80);
      ctx.textAlign = 'left';

      // 弹出预览
      const dataUrl = canvas.toDataURL('image/png');
      setShareImageUrl(dataUrl);
      setShareImageVisible(true);
    } catch (e) {
      console.error('生成分享图片失败', e);
    } finally {
      setGeneratingImage(false);
    }
  };

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const lines: string[] = [];
    let currentLine = '';
    for (const char of text) {
      const testLine = currentLine + char;
      if (ctx.measureText(testLine).width > maxWidth) {
        lines.push(currentLine);
        currentLine = char;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.slice(0, 4); // 最多4行
  };

  const handlePrevStatus = async () => {
    if (!activity) return;
    const prev = PREV_STATUS[activity.status];
    if (!prev) return;
    const passphrase = getPassphrase(activity.id);
    const res = await fetch(`/api/activities/${activity.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: prev, passphrase }),
    });
    const result = await res.json();
    if (result.data) setActivity(result.data);
  };

  const handleVerifyPassphrase = () => {
    if (!activity || !passphraseInput.trim()) return;
    fetch(`/api/activities/${activity.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: activity.status, passphrase: passphraseInput.trim() }),
    })
      .then(r => r.json())
      .then(result => {
        if (result.error) {
          setPassphraseError('口令验证失败，请检查后重试');
        } else {
          setPassphrase(activity.id, passphraseInput.trim());
          setShowPassphraseModal(false);
          setPassphraseInput('');
          setPassphraseError('');
          setActivity({ ...activity });
        }
      })
      .catch(() => {
        setPassphraseError('验证失败，请稍后重试');
      });
  };

  const pageHref = (key: string) => {
    const map: Record<string, string> = {
      collecting: `/intention?activity_id=${id}`,
      voting: `/vote?activity_id=${id}`,
      plan: `/plan?activity_id=${id}`,
      registering: `/register?activity_id=${id}`,
      dashboard: `/dashboard?activity_id=${id}`,
      settle: `/settle?activity_id=${id}`,
    };
    return map[key] || '#';
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">加载中...</div>;
  if (!activity) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">活动不存在</div>;

  // ===== ACCESS CODE GATE =====
  if (!accessGranted) {
    return (
      <div className="min-h-screen bg-background text-foreground font-sans">
        <Navbar />
        <main className="max-w-md mx-auto px-6 py-20">
          <div className="bg-card border-2 border-outline p-8 text-center" style={{ boxShadow: '8px 8px 0 #0A0A0A' }}>
            <div className="bg-accent-blue p-3 border-2 border-outline inline-block mb-4" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">这是一个私密活动</h1>
            <p className="text-muted-foreground mb-6">请输入活动口令以查看和参与</p>
            <div className="mb-4">
              <input
                className="w-full border-2 border-outline bg-muted px-4 py-3 text-lg font-bold font-mono tracking-wider text-center focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                value={accessCodeInput}
                onChange={e => { setAccessCodeInput(e.target.value); setAccessError(''); }}
                placeholder="输入活动口令"
                onKeyDown={e => e.key === 'Enter' && handleAccessVerify()}
              />
              {accessError && <p className="text-sm text-error mt-2 font-bold">{accessError}</p>}
            </div>
            <button
              onClick={handleAccessVerify}
              disabled={!accessCodeInput.trim()}
              className="bg-accent-blue text-white border-2 border-outline px-8 py-3 font-bold text-lg hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_#0A0A0A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0_#0A0A0A] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full"
              style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
            >
              进入活动
            </button>
          </div>
        </main>
      </div>
    );
  }

  const st = STATUS_MAP[activity.status] || STATUS_MAP.collecting;
  const action = ACTION_MAP[activity.status];
  const participantAction = PARTICIPANT_ACTION[activity.status];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Title + Status */}
        <section className="mb-6">
          <div className="flex items-start gap-4 mb-4">
            <h1 className="text-4xl font-bold">{activity.title}</h1>
            <span className={`inline-block ${st.bg} border-2 border-outline px-3 py-1.5 text-sm font-bold ${st.rotate} shrink-0`}>
              {st.label}
            </span>
          </div>
          <div className="bg-card border-2 border-outline p-5" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
            <p className="text-base mb-3">{activity.description}</p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />{activity.rough_time}</span>
              <span className="flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-primary" />
                组织者：<strong className="text-foreground">{activity.creator_name}</strong>
                {isCreator && <span className="text-primary text-xs ml-1">（你）</span>}
              </span>
            </div>
          </div>
        </section>

        {/* ===== PARTICIPANT VIEW ===== */}
        {!isCreator && (
          <>
            {/* Current Phase Action Card */}
            <section className="mb-6">
              <div className="bg-card border-2 border-outline p-6 relative" style={{ boxShadow: '6px 6px 0 #0A0A0A' }}>
                <div className="mb-4">
                  <p className="text-sm font-bold text-muted-foreground mb-1">当前阶段</p>
                  <p className="text-lg font-bold">{st.label}</p>
                  <p className="text-sm text-muted-foreground">{st.desc}</p>
                </div>
                {participantAction && (
                  <Link
                    href={`${participantAction.href}?activity_id=${id}`}
                    className={`inline-flex items-center gap-3 ${participantAction.color} border-2 border-outline px-8 py-4 text-lg font-bold hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_#0A0A0A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0_#0A0A0A] transition-all cursor-pointer`}
                    style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
                  >
                    {(() => { const Icon = participantAction.icon; return <Icon className="w-5 h-5" />; })()}
                    {participantAction.label}
                    <ChevronRight className="w-5 h-5" />
                  </Link>
                )}
              </div>
            </section>

            {/* Progress Stats */}
            <section className="mb-6">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-card border-2 border-outline p-4 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                  <div className="text-2xl font-bold text-primary">{stats.intentionCount}</div>
                  <div className="text-xs font-medium text-muted-foreground mt-1">已表态</div>
                </div>
                <div className="bg-card border-2 border-outline p-4 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                  <div className="text-2xl font-bold text-accent-blue">{stats.voteCount}</div>
                  <div className="text-xs font-medium text-muted-foreground mt-1">已投票</div>
                </div>
                <div className="bg-card border-2 border-outline p-4 text-center" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                  <div className="text-2xl font-bold text-success">{stats.registrationCount}</div>
                  <div className="text-xs font-medium text-muted-foreground mt-1">已报名</div>
                </div>
              </div>
            </section>

            {/* Verify Organizer Identity */}
            <section className="mb-8">
              <button
                onClick={() => setShowPassphraseModal(true)}
                className="bg-card border-2 border-outline px-5 py-3 font-bold text-sm flex items-center gap-2 hover:bg-muted transition-colors cursor-pointer"
                style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
              >
                <Lock className="w-4 h-4 text-muted-foreground" />
                验证管理口令
              </button>
            </section>

            {/* Share Link */}
            <section>
              <div className="bg-card border-2 border-outline p-5 flex items-center gap-4" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                <Share2 className="w-5 h-5 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground truncate flex-1">{activity?.access_token ? `${typeof window !== 'undefined' ? window.location.origin : ''}/activity?token=${activity.access_token}` : `${typeof window !== 'undefined' ? window.location.origin : ''}/activity?id=${id}`}</span>
                <button
                  onClick={handleCopyLink}
                  className="bg-accent-blue text-white border-2 border-outline px-4 py-2 text-sm font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? '已复制' : '复制链接'}
                </button>
                <button
                  onClick={handleGenerateShareImage}
                  disabled={generatingImage}
                  className="bg-primary text-[#0A0A0A] border-2 border-outline px-4 py-2 text-sm font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
                >
                  {generatingImage ? '生成中...' : <><ImageIcon className="w-4 h-4" /> 生成海报</>}
                </button>
              </div>
            </section>

            {/* Participant: Hide / Remove */}
            <section className="mt-6 pt-6 border-t-2 border-outline/30">
              <h2 className="text-base font-bold mb-3 text-muted-foreground">管理</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                {!activity.archived && (
                  <div className="flex flex-col">
                    <button
                      onClick={handleHide}
                      className="bg-muted border-2 border-outline px-4 py-3 text-sm font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer flex items-center gap-2"
                      style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
                    >
                      <Archive className="w-4 h-4" />
                      从我的列表中隐藏
                    </button>
                    <p className="text-xs text-muted-foreground mt-1.5">只是自己看不到，其他人不受影响</p>
                  </div>
                )}
                <div className="flex flex-col">
                  <button
                    onClick={() => setShowArchiveDialog('participant_delete')}
                    className="bg-white border-2 border-red-500 text-red-600 px-4 py-3 text-sm font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer flex items-center gap-2"
                    style={{ boxShadow: '3px 3px 0 #991b1b' }}
                  >
                    <Trash2 className="w-4 h-4" />
                    不再参与此活动
                  </button>
                  <p className="text-xs text-muted-foreground mt-1.5">同上，仅自己不可见，可随时通过口令重新加入</p>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ===== ORGANIZER VIEW ===== */}
        {isCreator && (
          <>
            {/* Phase Progress Bar + Stats */}
            <section className="mb-6">
              <div className="bg-card border-2 border-outline p-5" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-muted-foreground">活动进度</p>
                  <span className={`inline-block ${st.bg} border-2 border-outline px-2.5 py-1 text-xs font-bold ${st.rotate}`}>
                    {st.label}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {STATUS_ORDER.slice(0, -1).map((s, idx) => {
                    const isActive = idx === currentIdx;
                    const isDone = idx < currentIdx;
                    return (
                      <div key={s} className="flex items-center flex-1">
                        <div className={`h-3 flex-1 border-2 border-outline ${isDone ? 'bg-success' : isActive ? 'bg-primary' : 'bg-muted'}`} />
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-1.5 text-[10px] font-medium text-muted-foreground">
                  <span>意愿</span><span>投票</span><span>方案</span><span>报名</span><span>进行</span><span>结算</span>
                </div>
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t-2 border-outline/15">
                  <div className="text-center">
                    <div className="text-xl font-bold text-primary">{stats.intentionCount}</div>
                    <div className="text-[11px] font-medium text-muted-foreground">已表态</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-accent-blue">{stats.voteCount}</div>
                    <div className="text-[11px] font-medium text-muted-foreground">已投票</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-success">{stats.registrationCount}</div>
                    <div className="text-[11px] font-medium text-muted-foreground">已报名</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Action Buttons — Organizer Only */}
            {(action || PREV_STATUS[activity.status]) && (
              <section className="mb-6 flex flex-wrap gap-3">
                {PREV_STATUS[activity.status] && (
                  <button
                    onClick={handlePrevStatus}
                    className="bg-white text-foreground border-2 border-outline px-6 py-3 font-bold text-lg hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_#0A0A0A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0_#0A0A0A] transition-all cursor-pointer flex items-center gap-2"
                    style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
                  >
                    <ArrowLeft className="w-5 h-5" /> 回退到{STATUS_MAP[PREV_STATUS[activity.status]]?.label || '上一阶段'}
                  </button>
                )}
                {action && (
                  <button
                    onClick={handleNextStatus}
                    className="bg-primary text-[#0A0A0A] border-2 border-outline px-6 py-3 font-bold text-lg hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[4px_4px_0_#0A0A0A] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0_#0A0A0A] transition-all cursor-pointer flex items-center gap-2"
                    style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
                  >
                    {action.label} <ArrowRight className="w-5 h-5" />
                  </button>
                )}
              </section>
            )}

            {/* Entry Cards */}
            <section className="mb-8">
              <h2 className="text-xl font-bold mb-4">功能入口</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {ORGANIZER_ENTRIES.map(entry => {
                  const open = currentIdx >= entry.minStatus;
                  const isCurrentPhase = entry.key === activity.status;
                  const Icon = entry.icon;
                  return open ? (
                    <Link
                      key={entry.key}
                      href={pageHref(entry.key)}
                      className={`bg-card border-2 border-outline p-5 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#0A0A0A] transition-all cursor-pointer group relative ${isCurrentPhase ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                      style={{ boxShadow: '4px 4px 0 #0A0A0A' }}
                    >
                      {isCurrentPhase && (
                        <span className="absolute top-2 right-2 bg-primary text-[#0A0A0A] text-[10px] font-bold px-1.5 py-0.5 border border-outline">当前</span>
                      )}
                      <Icon className="w-8 h-8 mb-3 text-primary group-hover:text-accent-blue" />
                      <h3 className="font-bold text-base mb-1">{entry.label}</h3>
                      <p className="text-sm text-muted-foreground">{entry.desc}</p>
                    </Link>
                  ) : (
                    <div
                      key={entry.key}
                      className="bg-card border-2 border-outline p-5 opacity-40 cursor-not-allowed"
                    >
                      <Icon className="w-8 h-8 mb-3 text-muted-foreground" />
                      <h3 className="font-bold text-base mb-1">{entry.label}</h3>
                      <p className="text-sm text-muted-foreground">尚未开放</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Share Link */}
            <section>
              <div className="bg-card border-2 border-outline p-5 flex items-center gap-4" style={{ boxShadow: '4px 4px 0 #0A0A0A' }}>
                <Share2 className="w-5 h-5 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground truncate flex-1">{activity?.access_token ? `${typeof window !== 'undefined' ? window.location.origin : ''}/activity?token=${activity.access_token}` : `${typeof window !== 'undefined' ? window.location.origin : ''}/activity?id=${id}`}</span>
                <button
                  onClick={handleCopyLink}
                  className="bg-accent-blue text-white border-2 border-outline px-4 py-2 text-sm font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? '已复制' : '复制链接'}
                </button>
                <button
                  onClick={handleGenerateShareImage}
                  disabled={generatingImage}
                  className="bg-primary text-[#0A0A0A] border-2 border-outline px-4 py-2 text-sm font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                  style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
                >
                  {generatingImage ? '生成中...' : <><ImageIcon className="w-4 h-4" /> 生成海报</>}
                </button>
              </div>
            </section>

            {/* Archive & Delete */}
            <section className="mt-6 pt-6 border-t-2 border-outline/30">
              <h2 className="text-base font-bold mb-3 text-muted-foreground">管理活动</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex flex-col">
                  <button
                    onClick={() => setShowArchiveDialog('archive')}
                    className="bg-muted border-2 border-outline px-4 py-3 text-sm font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer flex items-center gap-2"
                    style={{ boxShadow: '3px 3px 0 #0A0A0A' }}
                  >
                    <Archive className="w-4 h-4" />
                    {activity.archived ? '取消归档' : '归档活动'}
                  </button>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {activity.archived ? '取消后活动回到首页列表' : '活动从首页移到「历史活动」，数据都还在'}
                  </p>
                </div>
                <div className="flex flex-col">
                  <button
                    onClick={() => setShowArchiveDialog('delete')}
                    className="bg-white border-2 border-red-500 text-red-600 px-4 py-3 text-sm font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer flex items-center gap-2"
                    style={{ boxShadow: '3px 3px 0 #991b1b' }}
                  >
                    <Trash2 className="w-4 h-4" />
                    删除活动
                  </button>
                  <p className="text-xs text-muted-foreground mt-1.5">永久删除，所有数据清空，所有人不可恢复</p>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* Archive/Delete Confirmation Dialog */}
      {showArchiveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card border-2 border-outline w-full max-w-md p-6" style={{ boxShadow: '8px 8px 0 #0A0A0A' }}>
            <h2 className="text-xl font-bold mb-4">
              {showArchiveDialog === 'archive' ? (activity.archived ? '取消归档' : '归档活动')
                : showArchiveDialog === 'participant_delete' ? '不再参与此活动' : '删除活动'}
            </h2>
            {showArchiveDialog === 'archive' ? (
              <p className="text-sm text-muted-foreground mb-6">
                {activity.archived
                  ? '取消归档后，活动将重新显示在首页活动列表中。'
                  : '归档后活动将从首页消失，但在"历史活动"中仍可查看。'}
              </p>
            ) : showArchiveDialog === 'participant_delete' ? (
              <p className="text-sm text-muted-foreground mb-6">
                此操作将从你的列表中隐藏此活动，其他参与者不受影响。
              </p>
            ) : (
              <>
                <div className="bg-red-50 border-2 border-red-300 p-4 mb-4">
                  <p className="text-red-700 font-bold text-sm mb-2">⚠️ 警告：删除操作不可撤销！</p>
                  <p className="text-red-600 text-sm">删除后，所有参与者都将无法看到此活动，包括所有意愿、投票、报名和记账数据。作为管理者，你同时也是参与者，删除后你自己也无法恢复。</p>
                </div>
                <p className="text-sm text-muted-foreground mb-4">请输入活动标题 <strong>"{activity.title}"</strong> 确认删除：</p>
                <input
                  className="w-full border-2 border-outline bg-muted px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-red-500/30 mb-4"
                  value={deleteConfirmInput}
                  onChange={e => setDeleteConfirmInput(e.target.value)}
                  placeholder="输入活动标题确认"
                />
              </>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowArchiveDialog(null); setDeleteConfirmInput(''); }}
                className="border-2 border-outline px-4 py-2 text-sm font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleArchiveOrDelete}
                disabled={showArchiveDialog === 'delete' && deleteConfirmInput !== activity.title}
                className={`px-4 py-2 text-sm font-bold text-white border-2 border-outline hover:translate-x-[1px] hover:translate-y-[1px] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  showArchiveDialog === 'delete' ? 'bg-red-600' : 'bg-accent-blue'
                }`}
                style={{ boxShadow: showArchiveDialog === 'delete' ? '3px 3px 0 #991b1b' : '3px 3px 0 #0A0A0A' }}
              >
                {showArchiveDialog === 'archive' ? (activity.archived ? '取消归档' : '确认归档')
                  : showArchiveDialog === 'participant_delete' ? '确认隐藏' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Passphrase Verification Modal */}
      {showPassphraseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card border-2 border-outline w-full max-w-md p-8" style={{ boxShadow: '8px 8px 0 #0A0A0A' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-primary p-2 border-2 border-outline" style={{ boxShadow: '3px 3px 0 #0A0A0A' }}>
                <KeyRound className="w-5 h-5 text-[#0A0A0A]" />
              </div>
              <h2 className="text-xl font-bold">验证管理口令</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              输入活动管理口令以获取组织者权限（状态流转、添加分段、记账等）
            </p>
            <div className="mb-4">
              <input
                className="w-full border-2 border-outline bg-muted px-4 py-3 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono tracking-wider"
                value={passphraseInput}
                onChange={e => { setPassphraseInput(e.target.value); setPassphraseError(''); }}
                placeholder="请输入管理口令"
                onKeyDown={e => { if (e.key === 'Enter') handleVerifyPassphrase(); }}
              />
              {passphraseError && (
                <p className="text-sm text-error mt-2 font-medium">{passphraseError}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleVerifyPassphrase}
                disabled={!passphraseInput.trim()}
                className="bg-primary text-[#0A0A0A] border-2 border-outline px-6 py-3 font-bold hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[4px_4px_0_#0A0A0A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[2px_2px_0_#0A0A0A] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ boxShadow: '6px 6px 0 #0A0A0A' }}
              >
                验证
              </button>
              <button
                onClick={() => { setShowPassphraseModal(false); setPassphraseInput(''); setPassphraseError(''); }}
                className="bg-card border-2 border-outline px-6 py-3 font-bold hover:bg-muted transition-colors cursor-pointer"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 分享图片预览弹窗 */}
      {shareImageVisible && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShareImageVisible(false)}>
          <div className="bg-card border-2 border-outline max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b-2 border-outline flex justify-between items-center">
              <h3 className="font-bold text-lg">分享活动海报</h3>
              <button onClick={() => setShareImageVisible(false)} className="text-lg font-bold cursor-pointer">✕</button>
            </div>
            <div className="p-4 flex justify-center">
              {shareImageUrl && (
                <img src={shareImageUrl} alt="活动海报" className="w-full rounded" />
              )}
            </div>
            <div className="p-4 border-t-2 border-outline text-center">
              <p className="text-sm text-muted-foreground mb-3">长按图片保存，发送到微信群</p>
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = shareImageUrl;
                  link.download = `${activity.title}-活动海报.png`;
                  link.click();
                }}
                className="bg-primary text-[#0A0A0A] border-2 border-outline px-6 py-2 font-bold hover:bg-primary/80 transition-colors cursor-pointer"
              >
                下载图片
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
