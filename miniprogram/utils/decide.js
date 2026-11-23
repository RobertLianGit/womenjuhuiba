// 把「我的处境」算成一张任务卡：每次打开活动，只显示眼下最该做的一件事。
// 纯函数，不依赖小程序 API，方便单独跑用例。

const INTENT_OPTIONS = [
    { value: 'interested', label: '有兴趣', desc: '时间差不多就来' },
    { value: 'maybe', label: '看安排再定', desc: '等时间地点出来再说' },
    { value: 'no', label: '这次不参加', desc: '下次再约' },
];

const SIGNUP_OPTIONS = [
    { value: 'going', label: '确认参加', desc: '我会来' },
    { value: 'maybe', label: '暂时待定', desc: '还不确定，先留个位' },
    { value: 'no', label: '这次不参加', desc: '这次来不了' },
];

const INTENT_TEXT = {
    interested: '有兴趣',
    maybe: '看安排再定',
    no: '这次不参加',
};

const REG_TEXT = {
    going: '确认参加',
    maybe: '暂时待定',
    no: '这次不参加',
};

function pad(n) {
    return n < 10 ? '0' + n : '' + n;
}

function formatTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';
    return date.getMonth() + 1 + '月' + date.getDate() + '日 ' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

/** 安排发生了变化时，列出「原来 → 现在」 */
function diffArrangement(a) {
    const prev = a.arrangement_prev;
    if (!prev) return [];
    const out = [];
    const pairs = [
        { key: 'time_text', label: '时间', empty: '待定' },
        { key: 'place', label: '地点', empty: '待定' },
        { key: 'cost_note', label: '费用', empty: '没有写' },
    ];
    pairs.forEach((pair) => {
        const before = prev[pair.key] || '';
        const after = a[pair.key] || '';
        if (before !== after) {
            out.push({
                label: pair.label,
                from: before || pair.empty,
                to: after || pair.empty,
            });
        }
    });
    return out;
}

function voteDeadlinePassed(vote, now) {
    if (!vote || !vote.deadline) return false;
    const ts = new Date(vote.deadline).getTime();
    return !isNaN(ts) && ts < now;
}

function sceneNames(a, ids) {
    const list = a.scenes || [];
    const picked = String(ids || '').split(',').filter(Boolean);
    if (!picked.length) return '';
    return picked
        .map((id) => {
            const hit = list.filter((item) => item.id === id)[0];
            return hit ? hit.name : '';
        })
        .filter(Boolean)
        .join('、');
}

/** 本次需要填表时，用哪种选项组 */
function formOf(kind) {
    if (kind === 'intent' || kind === 'intent-done') {
        return { options: INTENT_OPTIONS, withPeople: false, withScenes: false, extraLabel: '方便的时间 / 想去哪 / 其他建议' };
    }
    return { options: SIGNUP_OPTIONS, withPeople: true, withScenes: true, extraLabel: '忌口、同行的人、其他备注' };
}

/**
 * @param {object} a party_read 返回的 item（或列表行）
 * @param {number} nowTs 当前时间戳
 */
function resolve(a, nowTs) {
    const now = nowTs || Date.now();
    const phase = a.phase || 'collect';
    const intent = a.my_intent;
    const reg = a.my_reg;
    const vote = a.vote || {};
    const version = a.arrangement_version || 0;

    const card = {
        kind: 'none',
        ask: '',
        hint: '',
        options: [],
        saved: '',
        resultTitle: '',
        resultLines: [],
        notice: '',
        changes: [],
        canEdit: false,
        canCancel: false,
        withPeople: false,
        withScenes: false,
        extraLabel: '',
    };

    if (phase === 'closed') {
        card.kind = 'closed';
        card.ask = '这次聚会结束了';
        card.hint = '下面留着当时的安排和名单，需要的话还能翻账。';
        return card;
    }

    if (phase === 'signup') {
        if (!reg || !reg.response) {
            card.kind = 'signup';
            card.ask = '安排定好了，你来吗？';
            card.hint = '选一个，然后点下面的按钮保存。';
            const form = formOf('signup');
            Object.assign(card, form);
            card.options = SIGNUP_OPTIONS;
            return card;
        }

        if (reg.response === 'going') {
            const stale = (reg.confirmed_version || 0) < version;
            if (stale) {
                card.kind = 'reconfirm';
                card.ask = '安排有变化，请重新确认';
                card.hint = '之前的确认是按旧安排做的，这次需要你再点一次。';
                card.notice = '已确认的人都会看到这条变化。';
                card.changes = diffArrangement(a);
                card.canEdit = true;
                const form = formOf('signup');
                Object.assign(card, form);
                card.options = SIGNUP_OPTIONS;
                card.saved = 'going';
                return card;
            }
            card.kind = 'confirmed';
            card.ask = '你已确认参加';
            card.resultTitle = '你已确认参加';
            card.resultLines = ['参加人数：' + (reg.people_count || 1) + ' 人'];
            const names = sceneNames(a, reg.scene_ids);
            if (names) card.resultLines.push('参加环节：' + names);
            if (reg.notes) card.resultLines.push('备注：' + reg.notes);
            card.hint = '安排有变化时，会在这里提醒你重新确认。';
            card.canEdit = true;
            card.canCancel = true;
            card.saved = 'going';
            return card;
        }

        if (reg.response === 'maybe') {
            card.kind = 'reg-maybe';
            card.ask = '你选了暂时待定';
            card.resultTitle = '你选了暂时待定';
            card.resultLines = ['组织者会看到你在犹豫。', '定了之后回来点「确认参加」就行。'];
            card.canEdit = true;
            card.canCancel = true;
            card.saved = 'maybe';
            const form = formOf('signup');
            Object.assign(card, form);
            card.options = SIGNUP_OPTIONS;
            return card;
        }

        card.kind = 'reg-no';
        card.ask = '你选了这次不参加';
        card.resultTitle = '你选了这次不参加';
        card.resultLines = ['名单里不会出现你。', '想改主意随时回来。'];
        card.canEdit = true;
        card.canCancel = false;
        card.saved = 'no';
        const form = formOf('signup');
        Object.assign(card, form);
        card.options = SIGNUP_OPTIONS;
        return card;
    }

    if (phase === 'vote') {
        const voted = !!(vote.my_ids && String(vote.my_ids).length);
        const open = vote.status === 'open' && !voteDeadlinePassed(vote, now);

        if (vote.status === 'none') {
            card.kind = 'vote-wait';
            card.ask = '组织者正在准备选项';
            card.hint = '选项齐了会开放投票，到时候进来选一下就行。';
            return card;
        }

        if (!open) {
            card.kind = voted ? 'voted' : 'vote-closed';
            card.ask = voted ? '投票已结束' : '投票已经结束';
            card.hint = voted
                ? '你投的已经记下了，等组织者公布最终安排。'
                : '这次没赶上投票，等组织者公布安排。';
            card.saved = voted ? 'voted' : '';
            card.resultLines = voted ? ['等组织者公布安排。'] : [];
            return card;
        }

        if (voted) {
            const names = String(vote.my_ids)
                .split(',')
                .filter(Boolean)
                .map((id) => {
                    const hit = (vote.proposals || []).filter((p) => p.id === id)[0];
                    return hit ? hit.location : '';
                })
                .filter(Boolean);
            card.kind = 'voted';
            card.ask = '你已完成投票';
            card.resultTitle = '你已完成投票';
            card.resultLines = names.length ? ['你选了：' + names.join('、')] : [];
            card.hint = '还能改，等组织者公布安排。';
            card.canEdit = true;
            card.saved = 'voted';
            return card;
        }

        card.kind = 'vote';
        card.ask = vote.question || '去哪？大家投一下';
        const rule = vote.type === 'multi' ? '多选，最多 ' + (vote.max || 2) + ' 项' : '单选，只能选 1 个';
        const deadline = vote.deadline ? ' · 截止 ' + formatTime(vote.deadline) : '';
        card.hint = rule + deadline + ' · 在投票页选完点提交才算数';
        card.saved = '';
        return card;
    }

    // phase === 'collect'
    if (intent && intent.response) {
        card.kind = 'intent-done';
        card.ask = '已收到你的回应：' + (INTENT_TEXT[intent.response] || '');
        card.resultTitle = '已收到你的回应：' + (INTENT_TEXT[intent.response] || '');
        card.resultLines = ['时间地点还没确定，暂时不用再操作。'];
        const extras = [];
        if (intent.available_time) extras.push('方便的时间：' + intent.available_time);
        if (intent.place_wish) extras.push('想去：' + intent.place_wish);
        if (intent.notes) extras.push('补充：' + intent.notes);
        card.resultLines = card.resultLines.concat(extras);
        card.hint = '组织者公布安排后，这里会变成「确认参加」。';
        card.canEdit = true;
        card.saved = intent.response;
        const form = formOf('intent');
        Object.assign(card, form);
        card.options = INTENT_OPTIONS;
        return card;
    }

    card.kind = 'intent';
    card.ask = '这次聚会，你有兴趣吗？';
    card.hint = '先表个态，不用填很多。';
    const form = formOf('intent');
    Object.assign(card, form);
    card.options = INTENT_OPTIONS;
    return card;
}

/** 列表页的一句话状态 */
function listLine(item) {
    const phase = item.phase || 'collect';
    const myReg = item.my_reg;
    const myIntent = item.my_intent;
    if (phase === 'closed') return '已结束';
    if (phase === 'signup') {
        if (myReg === 'going') {
            const stale = (item.my_version || 0) < (item.arrangement_version || 0);
            return stale ? '安排有变，待确认' : '已确认参加';
        }
        if (myReg === 'maybe') return '暂时待定';
        if (myReg === 'no') return '这次不参加';
        return '待确认参加';
    }
    if (phase === 'vote') return '投票中';
    if (myIntent) return '已回应';
    return '待回应';
}

module.exports = {
    resolve,
    listLine,
    diffArrangement,
    formatTime,
    INTENT_TEXT,
    REG_TEXT,
    INTENT_OPTIONS,
    SIGNUP_OPTIONS,
};
