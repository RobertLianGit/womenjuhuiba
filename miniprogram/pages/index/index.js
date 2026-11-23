const api = require('../../utils/api');
const party = require('../../utils/party');
const meta = require('../../utils/meta');
const decide = require('../../utils/decide');

const EMPTY_FORM = {
    title: '',
    description: '',
    timeText: '',
    place: '',
    costNote: '',
    extraNote: '',
};

Page({
    data: {
        tab: 'created',
        loading: true,
        errorMsg: '',
        identity: { name: '', initial: '', avatar: '', wechat: false },
        idHint: '',
        nickNeeded: false,

        createdList: [],
        joinedList: [],

        showCreate: false,
        mode: '',
        creating: false,
        createError: '',
        form: Object.assign({}, EMPTY_FORM),

        showProfile: false,
        profileName: '',
        profileAvatar: '',
        profileFromCreate: false,

        result: null,
    },

    async onShow() {
        await getApp().ensureIdentity();
        this.syncIdentity();
        this.loadLists();
    },

    async onPullDownRefresh() {
        await this.loadLists();
        wx.stopPullDownRefresh();
    },

    syncIdentity() {
        const name = party.getUserName();
        const wechat = party.isWechatUser();
        this.setData({
            identity: {
                name: name,
                initial: name ? name.slice(0, 1) : '',
                avatar: party.getAvatar(),
                wechat: wechat,
            },
            idHint: wechat ? '' : party.getWechatError(),
            nickNeeded: !name,
        });
    },

    /** 点身份标签重新核验一次：真机上用来自查微信登录到底通没通 */
    async recheckIdentity() {
        if (this.rechecking) return;
        this.rechecking = true;
        this.setData({ idHint: '' });
        meta.toast('正在重新核验…');
        await getApp().ensureIdentity(true);
        this.rechecking = false;
        this.syncIdentity();
        if (party.isWechatUser()) {
            meta.toast('已用微信身份登录');
            this.loadLists();
        } else {
            meta.toast('还是本机身份，原因列在身份栏下面');
        }
    },

    async loadLists() {
        this.setData({ errorMsg: '' });
        const res = await api.getMyActivities();
        if (res.error) {
            this.setData({ loading: false, errorMsg: res.error });
            return;
        }
        const items = res.data || [];
        const created = [];
        const joined = [];
        items.forEach((item) => {
            const view = this.decorate(item);
            if (item.my_role === 'organizer') created.push(view);
            else joined.push(view);
        });
        this.setData({ loading: false, createdList: created, joinedList: joined });
    },

    decorate(item) {
        const phase = meta.phaseOf(item.phase);
        const line = decide.listLine(item);
        const needMe = line.indexOf('待确认') !== -1 || line.indexOf('待回应') !== -1 || line.indexOf('有变') !== -1;
        return {
            id: item.id,
            title: item.title,
            creatorName: item.creator_name,
            timeText: item.time_text || '',
            place: item.place || '',
            phaseLabel: phase.label,
            phaseBg: phase.bg,
            phaseFg: phase.fg,
            line,
            needMe,
        };
    },

    switchTab(event) {
        this.setData({ tab: event.currentTarget.dataset.tab });
    },

    goActivity(event) {
        const id = event.currentTarget.dataset.id;
        wx.navigateTo({ url: '/pages/activity/activity?id=' + id });
    },

    retry() {
        this.loadLists();
    },

    // ===== 称呼与头像 =====
    openProfile(e) {
        const fromCreate = !!(e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.from === 'create');
        this.setData({
            showProfile: true,
            profileFromCreate: fromCreate,
            profileName: party.getUserName(),
            profileAvatar: party.getAvatar(),
        });
    },

    closeProfile() {
        this.setData({ showProfile: false });
    },

    onChooseAvatar(event) {
        const url = event.detail && event.detail.avatarUrl;
        if (url) this.setData({ profileAvatar: url });
    },

    onProfileNameInput(event) {
        this.setData({ profileName: event.detail.value });
    },

    saveProfile() {
        const name = String(this.data.profileName || '').trim();
        if (!name) {
            meta.toast('先填个称呼，朋友才知道是谁');
            return;
        }
        party.setUserName(name);
        if (this.data.profileAvatar) party.setAvatar(this.data.profileAvatar);
        const fromCreate = this.data.profileFromCreate;
        this.setData({ showProfile: false, profileFromCreate: false });
        this.syncIdentity();
        if (fromCreate) this.openCreate();
    },

    // ===== 创建 =====
    openCreate() {
        if (!party.getUserName()) {
            this.openProfile({ currentTarget: { dataset: { from: 'create' } } });
            return;
        }
        this.setData({
            showCreate: true,
            mode: '',
            createError: '',
            form: Object.assign({}, EMPTY_FORM),
        });
    },

    closeCreate() {
        this.setData({ showCreate: false });
    },

    chooseMode(event) {
        const mode = event.currentTarget.dataset.mode;
        this.setData({ mode, createError: '' });
    },

    onFormInput(event) {
        const field = event.currentTarget.dataset.field;
        this.setData({ ['form.' + field]: event.detail.value, createError: '' });
    },

    async submitCreate() {
        const form = this.data.form;
        const mode = this.data.mode;
        const title = String(form.title || '').trim();

        if (!mode) {
            this.setData({ createError: '先选一种：安排定了，还是先问问大家' });
            return;
        }
        if (!title) {
            this.setData({ createError: mode === 'fixed' ? '请填写活动名称' : '请填写这次想约什么' });
            return;
        }
        if (mode === 'fixed' && !String(form.timeText || '').trim()) {
            this.setData({ createError: '定了时间才能让大家确认，先填个时间' });
            return;
        }

        this.setData({ creating: true, createError: '' });
        const res = await api.createActivity({
            title,
            description: String(form.description || '').trim(),
            mode,
            timeText: String(form.timeText || '').trim(),
            place: String(form.place || '').trim(),
            costNote: String(form.costNote || '').trim(),
            extraNote: String(form.extraNote || '').trim(),
            creatorName: party.getUserName(),
        });
        if (res.error) {
            this.setData({ creating: false, createError: res.error });
            return;
        }

        this.setData({
            creating: false,
            showCreate: false,
            result: {
                id: res.data.id,
                title,
                mode,
                phase: res.data.phase,
                inviteToken: res.data.inviteToken,
                creatorName: party.getUserName(),
                timeText: String(form.timeText || '').trim(),
                place: String(form.place || '').trim(),
            },
        });
        this.loadLists();
    },

    closeResult() {
        this.setData({ result: null });
    },

    copyShareInfo() {
        const r = this.data.result;
        if (!r) return;
        const when = r.timeText ? r.timeText + (r.place ? '，' + r.place : '') : '时间地点还没定';
        const text = r.mode === 'fixed'
            ? '【' + r.title + '】' + when + '，' + r.creatorName + ' 叫你来。点开链接告诉我你来不来。'
            : '【' + r.title + '】' + r.creatorName + ' 想约大家聚聚，点开链接告诉我你有没有兴趣。';
        meta.copy(text, '邀请文案已复制');
    },

    enterCreated() {
        const r = this.data.result;
        if (!r) return;
        const id = r.id;
        this.setData({ result: null });
        wx.navigateTo({ url: '/pages/activity/activity?id=' + id });
    },

    onShareAppMessage() {
        const r = this.data.result;
        if (r) {
            return {
                title: r.mode === 'fixed'
                    ? r.title + '｜' + (r.timeText || '时间定了') + '，点进来告诉我你来不来'
                    : r.title + '｜周末想约大家聚聚，点进来告诉我有没有兴趣',
                path: meta.sharePath(r.id, r.inviteToken),
            };
        }
        return {
            title: '报名助手 LBB · 把来不来的人数统计清楚',
            path: '/pages/index/index',
        };
    },
});
