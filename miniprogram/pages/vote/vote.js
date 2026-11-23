const api = require('../../utils/api');
const party = require('../../utils/party');
const meta = require('../../utils/meta');

function pad(n) {
    return n < 10 ? '0' + n : '' + n;
}

Page({
    data: {
        id: '',
        loading: true,
        errorMsg: '',
        organizer: false,

        title: '',
        phase: '',
        setupMode: false,
        closed: false,
        open: false,
        published: false,

        question: '',
        voteType: 'single',
        maxVotes: 2,
        deadlineText: '',
        proposals: [],
        voters: 0,
        totalMembers: 0,

        picked: [],
        savedIds: [],
        dirty: false,
        submitting: false,
        saveError: '',
        savedFlash: false,

        // 设置投票
        setup: {
            question: '',
            type: 'single',
            max: 2,
            deadlineDate: '',
            deadlineTime: '22:00',
            options: [
                { k: 1, location: '', activityType: '' },
                { k: 2, location: '', activityType: '' },
            ],
            nextKey: 3,
        },
        publishing: false,
        setupError: '',
        responses: [],

        // 添加建议
        showPropose: false,
        propose: { location: '', activityType: '' },
        proposing: false,
        proposeError: '',

        closing: false,
    },

    async onLoad(options) {
        await getApp().ensureIdentity();
        const id = options && options.id ? String(options.id) : '';
        this.setData({ id });
        if (!id) {
            this.setData({ loading: false, errorMsg: '缺少活动 id' });
            return;
        }
        await this.load();
    },

    onShow() {
        if (this.data.id && !this.data.loading) {
            this.load(true);
            this.startPolling();
        }
    },

    onHide() {
        this.stopPolling();
    },

    onUnload() {
        this.stopPolling();
    },

    async onPullDownRefresh() {
        await this.load(true);
        wx.stopPullDownRefresh();
    },

    startPolling() {
        this.stopPolling();
        this.timer = setInterval(() => this.load(true), 10000);
    },

    stopPolling() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    },

    async load(silent) {
        if (!silent) this.setData({ loading: true, errorMsg: '' });

        const res = await api.getActivity(this.data.id);
        if (res.error) {
            this.setData({ loading: false, errorMsg: res.error });
            return;
        }
        const a = res.data;
        if (!a) {
            this.setData({ loading: false, errorMsg: '活动不存在' });
            return;
        }
        if (a.my_status !== 'approved') {
            this.setData({ loading: false, errorMsg: '你还不是这个活动的成员' });
            return;
        }

        const organizer = a.my_role === 'organizer';
        const vote = a.vote || {};
        const proposals = (vote.proposals || []).slice();
        proposals.sort((x, y) => y.votes - x.votes);
        const maxVotes = proposals.length ? proposals[0].votes : 0;

        const savedIds = String(vote.my_ids || '').split(',').filter(Boolean);
        const published = vote.status === 'open' || vote.status === 'closed';
        const open = vote.status === 'open' && !this.deadlinePassed(vote.deadline);

        // 没动过选择时跟着服务端走，动过就保留用户当前选择
        const picked = this.data.dirty ? this.data.picked : savedIds.slice();

        this.setData({
            loading: false,
            organizer,
            title: a.title,
            phase: a.phase,
            setupMode: organizer && vote.status === 'none',
            published,
            open,
            closed: !open && published,
            question: vote.question || '',
            voteType: vote.type || 'single',
            maxVotes: vote.max || 1,
            deadlineText: vote.deadline ? meta.formatDate(vote.deadline) : '',
            voters: vote.voters || 0,
            proposals: proposals.map((p, index) => ({
                id: p.id,
                rank: index + 1,
                location: p.location,
                activityType: p.activity_type || '',
                userName: organizer ? (p.user_name || '') : '',
                votes: p.votes || 0,
                pct: maxVotes > 0 ? Math.round((p.votes / maxVotes) * 100) : 0,
            })),
            savedIds,
            picked,
            dirty: this.data.dirty && this.sameSet(picked, savedIds) === false,
            responses: organizer ? (a.responses || []).map((row) => ({
                userName: row.user_name,
                place: row.place_wish || '',
                response: row.response,
            })) : [],
            importOptions: (function () {
                const seen = {};
                const list = [];
                (organizer ? (a.responses || []) : []).forEach((row) => {
                    const place = String(row.place_wish || '').trim().slice(0, 60);
                    if (!place || seen[place]) return;
                    seen[place] = true;
                    list.push(place);
                });
                return list;
            })(),
        });

        this.applyPicked();
    },

    deadlinePassed(value) {
        if (!value) return false;
        const ts = new Date(value).getTime();
        return !isNaN(ts) && ts < Date.now();
    },

    sameSet(a, b) {
        if (a.length !== b.length) return false;
        const sa = a.slice().sort().join(',');
        const sb = b.slice().sort().join(',');
        return sa === sb;
    },

    applyPicked() {
        const picked = this.data.picked;
        const proposals = this.data.proposals.map((p) => Object.assign({}, p, {
            picked: picked.indexOf(p.id) !== -1,
        }));
        this.setData({ proposals });
    },

    // ===== 选票 =====
    toggleProposal(event) {
        if (!this.data.open) return;
        const id = event.currentTarget.dataset.id;
        const picked = this.data.picked.slice();
        const index = picked.indexOf(id);
        const multi = this.data.voteType === 'multi';

        if (index !== -1) {
            picked.splice(index, 1);
        } else if (!multi) {
            picked.length = 0;
            picked.push(id);
        } else {
            if (picked.length >= this.data.maxVotes) {
                meta.toast('最多选 ' + this.data.maxVotes + ' 项');
                return;
            }
            picked.push(id);
        }

        this.setData({ picked, dirty: !this.sameSet(picked, this.data.savedIds), saveError: '' });
        this.applyPicked();
    },

    async submitVote() {
        if (this.data.submitting) return;
        if (!this.data.picked.length) {
            this.setData({ saveError: '先选一个再提交' });
            return;
        }
        this.setData({ submitting: true, saveError: '' });
        const res = await api.submitVote(this.data.id, this.data.picked);
        if (res.error) {
            this.setData({ submitting: false, saveError: res.error });
            return;
        }
        this.setData({ submitting: false, dirty: false, savedFlash: true });
        await this.load(true);
        this.setData({ submitting: false, dirty: false, savedFlash: true });
        wx.showToast({ title: '投票已保存', icon: 'success', duration: 1500 });
        setTimeout(() => this.setData({ savedFlash: false }), 2600);
    },

    // ===== 设置投票 =====
    onQuestionInput(event) {
        this.setData({ 'setup.question': event.detail.value, setupError: '' });
    },

    setType(event) {
        const type = event.currentTarget.dataset.type;
        this.setData({ 'setup.type': type, setupError: '' });
    },

    onMaxInput(event) {
        this.setData({ 'setup.max': parseInt(event.detail.value, 10) || 2 });
    },

    onDeadlineDate(event) {
        this.setData({ 'setup.deadlineDate': event.detail.value });
    },

    onDeadlineTime(event) {
        this.setData({ 'setup.deadlineTime': event.detail.value });
    },

    onOptionInput(event) {
        const index = Number(event.currentTarget.dataset.index);
        const value = event.detail.value;
        const options = this.data.setup.options.slice();
        options[index] = Object.assign({}, options[index], { location: value });
        this.setData({ 'setup.options': options, setupError: '' });
    },

    addOption() {
        const options = this.data.setup.options.slice();
        const nextKey = this.data.setup.nextKey || options.length + 1;
        options.push({ k: nextKey, location: '', activityType: '' });
        this.setData({ 'setup.options': options, 'setup.nextKey': nextKey + 1 });
    },

    removeOption(event) {
        const index = Number(event.currentTarget.dataset.index);
        const options = this.data.setup.options.slice();
        if (options.length <= 2) {
            meta.toast('至少留两个选项');
            return;
        }
        options.splice(index, 1);
        this.setData({ 'setup.options': options });
    },

    importResponse(event) {
        const place = event.currentTarget.dataset.place;
        if (!place) return;
        const options = this.data.setup.options.slice();
        if (options.some((o) => String(o.location || '').trim() === place)) {
            meta.toast('这个已经在选项里了');
            return;
        }
        const nextKey = this.data.setup.nextKey || options.length + 1;
        const emptyIndex = options.findIndex((o) => !String(o.location || '').trim());
        if (emptyIndex !== -1) options[emptyIndex] = { k: options[emptyIndex].k || nextKey, location: place, activityType: '' };
        else options.push({ k: nextKey, location: place, activityType: '' });
        this.setData({ 'setup.options': options, 'setup.nextKey': nextKey + 1, setupError: '' });
    },

    buildDeadline() {
        const date = this.data.setup.deadlineDate;
        if (!date) return null;
        const time = this.data.setup.deadlineTime || '23:59';
        return date + 'T' + time + ':00+08:00';
    },

    async publishVote() {
        if (this.data.publishing) return;
        const setup = this.data.setup;
        const options = setup.options
            .map((o) => ({ location: String(o.location || '').trim(), activity_type: String(o.activityType || '').trim() }))
            .filter((o) => o.location);

        if (!String(setup.question || '').trim()) {
            this.setData({ setupError: '写一句这次投票要决定什么' });
            return;
        }
        if (options.length < 2) {
            this.setData({ setupError: '至少要有 2 个选项才能投票；只有一个就直接公布安排' });
            return;
        }

        this.setData({ publishing: true, setupError: '' });
        const res = await api.publishVote({
            activityId: this.data.id,
            question: String(setup.question || '').trim(),
            voteType: setup.type,
            maxVotes: setup.type === 'multi' ? Math.max(2, setup.max) : 1,
            deadline: this.buildDeadline(),
            options,
        });
        if (res.error) {
            this.setData({ publishing: false, setupError: res.error });
            return;
        }
        this.setData({ publishing: false, setupMode: false });
        await this.load(true);
        wx.showToast({ title: '投票已发布', icon: 'success' });
    },

    async closeVote() {
        const confirm = await new Promise((resolve) => {
            wx.showModal({
                title: '结束投票',
                content: '结束后不能再投票，已经投的票会保留。',
                success: (r) => resolve(r.confirm),
                fail: () => resolve(false),
            });
        });
        if (!confirm) return;
        this.setData({ closing: true });
        const res = await api.closeVote(this.data.id);
        this.setData({ closing: false });
        if (res.error) {
            meta.toast(res.error);
            return;
        }
        await this.load(true);
    },

    goArrange() {
        wx.navigateTo({ url: '/pages/arrange/arrange?id=' + this.data.id });
    },

    // ===== 添加建议 =====
    openPropose() {
        this.setData({ showPropose: true, propose: { location: '', activityType: '' }, proposeError: '' });
    },

    closePropose() {
        this.setData({ showPropose: false });
    },

    onProposeInput(event) {
        const field = event.currentTarget.dataset.field;
        this.setData({ ['propose.' + field]: event.detail.value, proposeError: '' });
    },

    async submitPropose() {
        const location = String(this.data.propose.location || '').trim();
        if (!location) {
            this.setData({ proposeError: '填一下地点或方案' });
            return;
        }
        this.setData({ proposing: true, proposeError: '' });
        const res = await api.propose(this.data.id, location, this.data.propose.activityType);
        if (res.error) {
            this.setData({ proposing: false, proposeError: res.error });
            return;
        }
        this.setData({ proposing: false, showPropose: false });
        await this.load(true);
        wx.showToast({ title: '建议已加入选项', icon: 'none' });
    },

    backToActivity() {
        wx.navigateBack({ delta: 1 });
    },
});
