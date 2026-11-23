// 阶段标签、分享文案与通用交互

const PHASE_META = {
    collect: { label: '先问意愿', bg: '#FF4DB8', fg: '#0A0A0A', short: '等大家表态' },
    vote: { label: '选方案', bg: '#3B82F6', fg: '#FFFFFF', short: '投票中' },
    signup: { label: '确认参加', bg: '#22C55E', fg: '#FFFFFF', short: '可以报名了' },
    closed: { label: '已结束', bg: '#0A0A0A', fg: '#FFFFFF', short: '已结束' },
};

function phaseOf(phase) {
    return PHASE_META[phase] || PHASE_META.collect;
}

function pad(n) {
    return n < 10 ? '0' + n : '' + n;
}

function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.getMonth() + 1 + '月' + date.getDate() + '日 ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

function formatDay(value) {
    const text = formatDate(value);
    return text ? text.split(' ')[0] : '';
}

function toast(title) {
    wx.showToast({ title: title || '', icon: 'none', duration: 2000 });
}

function copy(text, tip) {
    wx.setClipboardData({
        data: String(text || ''),
        success() {
            wx.showToast({ title: tip || '已复制', icon: 'none' });
        },
    });
}

/** 分享标题跟着当前任务走，让朋友在聊天里就知道要做什么 */
function shareTitle(activity) {
    if (!activity) return '报名助手 LBB';
    const name = activity.title || '聚会';
    if (activity.phase === 'signup') {
        const when = activity.time_text ? activity.time_text + '，' : '';
        return name + '｜' + when + '点进来告诉我你来不来';
    }
    if (activity.phase === 'vote') {
        return name + '｜时间和地点在投票，点进来选一个';
    }
    if (activity.phase === 'closed') {
        return name + '｜这次聚会的记录';
    }
    return name + '｜周末想约大家聚聚，点进来告诉我有没有兴趣';
}

function sharePath(activityId, inviteToken) {
    const base = '/pages/activity/activity?id=' + activityId;
    return inviteToken ? base + '&inv=' + inviteToken : base;
}

module.exports = {
    PHASE_META,
    phaseOf,
    formatDate,
    formatDay,
    toast,
    copy,
    shareTitle,
    sharePath,
};
