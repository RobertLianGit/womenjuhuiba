const api = require('../../utils/api');
const party = require('../../utils/party');
const meta = require('../../utils/meta');
const decide = require('../../utils/decide');

const RESPONSE_TEXT = { going: '确认参加', maybe: '待定', no: '不参加' };

Page({
    data: {
        id: '',
        invite: '',
        loading: true,
        errorMsg: '',
        notFound: false,
        gate: 'loading',

        a: null,
        organizer: false,
        card: null,
        stats: [],

        formVisible: false,
        isIntent: false,
        editing: false,
        pick: '',
        saved: '',
        dirty: false,
        people: 1,
        sceneIds: [],
        scenes: [],
        notes: '',
        availableTime: '',
        placeWish: '',
        extraOpen: false,
        submitLabel: '提交',
        saving: false,
        saveError: '',
        savedFlash: '',

        roster: [],
        rosterTitle: '确认参加的人',
        rosterEmpty: '',
        rosterOpen: false,
        responses: [],
        responsesOpen: false,

        members: [],
        pending: [],
        memberCount: 0,
        pendingCount: 0,
        showMembers: false,
        reviewing: false,

        showManage: false,
        shareInvite: '',
        joining: false,
        showName: false,
        nameInput: '',
        nextStep: null,
        closedPanel: false,
    },

    async onLoad(options) {
        const id = options && options.id ? String(options.id) : '';
        const invite = options && options.inv ? String(options.inv) : '';
        this.setData({ id, invite });
        if (!id) {
            this.setData({ loading: false, gate: 'error', errorMsg: '缺少活动 id' });
            return;
        }
        await getApp().ensureIdentity();
        await this.load();
    },

    onShow() {
        // 阶段可能已经变了，回来就刷新一次（正选着东西时不动表单）
        if (this.data.id && !this.data.loading && this.data.gate === 'member') {
            this.load(true);
        }
    },

    async onPullDownRefresh() {
        await this.load(true);
        wx.stopPullDownRefresh();
    },

    async load(silent) {
        if (!silent) this.setData({ loading: true, errorMsg: '' });

        let res = await api.getActivity(this.data.id);
        if (res.error) {
            this.setData({ loading: false, gate: 'error', errorMsg: res.error });
            return;
        }
        if (!res.data) {
            this.setData({ loading: false, gate: 'error', notFound: true, errorMsg: '这个活动不存在或已被删除' });
            return;
        }

        // 发起人亲自发出的邀请：点开直接进，不再申请
        if (res.data.my_status === 'none' && this.data.invite && !this.triedInvite) {
            this.triedInvite = true;
            const joined = await api.joinActivity(this.data.id, this.data.invite);
            if (!joined.error && joined.data && joined.data.status === 'approved') {
                res = await api.getActivity(this.data.id);
                if (!res.data) {
                    this.setData({ loading: false, gate: 'error', errorMsg: '读取活动失败' });
                    return;
                }
            }
        }

        this.render(res.data);
    },

    render(item) {
        const myStatus = item.my_status || 'none';
        let gate = 'guest';
        if (myStatus === 'approved') gate = 'member';
        else if (myStatus === 'pending') gate = 'pending';
        else if (myStatus === 'rejected') gate = 'rejected';

        const phase = meta.phaseOf(item.phase);
        const counts = item.counts || {};
        const organizer = item.my_role === 'organizer' && gate === 'member';

        const view = {
            id: item.id,
            title: item.title,
            description: item.description || '',
            creatorName: item.creator_name || '',
            phase: item.phase || 'collect',
            phaseLabel: phase.label,
            phaseBg: phase.bg,
            phaseFg: phase.fg,
            timeText: item.time_text || '',
            place: item.place || '',
            costNote: item.cost_note || '',
            extraNote: item.extra_note || '',
            hasArrange: (item.arrangement_version || 0) > 0,
            voteQuestion: (item.vote && item.vote.question) || '',
            voteStatus: (item.vote && item.vote.status) || 'none',
        };

        const card = decide.resolve(item);
        const isIntent = card.kind === 'intent' || card.kind === 'intent-done';
        const formKind = card.kind === 'intent' || card.kind === 'signup' || card.kind === 'reconfirm';

        let submitLabel = '提交';
        if (card.kind === 'intent') submitLabel = '提交回应';
        else if (card.kind === 'signup') submitLabel = '提交报名';
        else if (card.kind === 'reconfirm') submitLabel = '重新确认参加';
        else if (isIntent) submitLabel = '保存回应';
        else submitLabel = '保存';

        const kindChanged = !this.data.card || this.data.card.kind !== card.kind;
        // 正在填表时刷新，不能把已经选好的内容冲掉
        const defaults = kindChanged || !this.data.dirty ? this.buildDefaults(item, card) : null;
        const sceneIds = defaults ? defaults.sceneIds : this.data.sceneIds;
        const editing = defaults ? defaults.editing : this.data.editing;

        const patch = {
            loading: false,
            gate,
            a: view,
            organizer,
            card,
            isIntent,
            submitLabel,
            formVisible: formKind || (editing && card.options.length > 0),
            stats: this.buildStats(item),
            roster: organizer
                ? (view.phase === 'collect' || view.phase === 'vote' ? this.buildMemberRoster() : this.buildRoster(item))
                : this.buildMyRoster(item),
            rosterTitle: organizer
                ? (view.phase === 'signup' || view.phase === 'closed' ? '确认参加的人' : '已加入的人')
                : '我的报名',
            rosterEmpty: organizer ? '还没有人确认参加' : '你还没有报名',
            responses: organizer ? (item.responses || []).map((row, index) => ({
                key: 'r' + index,
                userName: row.user_name,
                responseText: decide.INTENT_TEXT[row.response] || '未表态',
                detail: [row.available_time ? '方便：' + row.available_time : '', row.place_wish ? '想去：' + row.place_wish : '', row.notes || '']
                    .filter(Boolean)
                    .join(' · '),
                isMine: row.is_me === true,
            })) : [],
            scenes: (item.scenes || []).map((s) => ({
                id: s.id,
                name: s.name,
                meta: [s.time_range, s.location].filter(Boolean).join(' · '),
                checked: sceneIds.indexOf(s.id) !== -1,
            })),
            nextStep: organizer ? this.buildNextStep(item, card) : null,
            closedPanel: (item.phase || '') === 'closed',
            pendingCount: counts.pending || 0,
        };

        if (defaults) Object.assign(patch, defaults);

        this.setData(patch);

        if (gate === 'member') {
            this.loadMembers();
            if (organizer && !this.data.shareInvite) this.loadInvite();
        }
    },

    buildDefaults(item, card) {
        const reg = item.my_reg || null;
        const intent = item.my_intent || null;
        const sceneIds = reg && reg.scene_ids ? String(reg.scene_ids).split(',').filter(Boolean) : [];
        const keepEditing = !!this.data.card && this.data.card.kind === card.kind && this.data.editing;
        return {
            pick: card.saved || '',
            saved: card.saved || '',
            dirty: false,
            people: (reg && reg.people_count) || 1,
            sceneIds,
            notes: (reg && reg.notes) || (intent && intent.notes) || '',
            availableTime: (intent && intent.available_time) || '',
            placeWish: (intent && intent.place_wish) || '',
            editing: keepEditing,
            extraOpen: false,
            saveError: '',
        };
    },

    buildStats(item) {
        const c = item.counts || {};
        const phase = item.phase || 'collect';
        if (phase === 'signup' || phase === 'closed') {
            return [
                { num: c.confirmed || 0, label: '已确认参加' },
                { num: c.confirmed_people || 0, label: '实际来的人' },
                { num: c.stale || 0, label: '等重新确认' },
            ];
        }
        if (phase === 'vote') {
            return [
                { num: c.responded || 0, label: '已回应' },
                { num: c.voted || 0, label: '已投票' },
                { num: c.maybe || 0, label: '看安排再定' },
            ];
        }
        return [
            { num: c.responded || 0, label: '已回应' },
            { num: c.interested || 0, label: '有兴趣' },
            { num: c.maybe || 0, label: '看安排再定' },
        ];
    },

    buildRoster(item) {
        const organizer = item.my_role === 'organizer';
        const list = item.roster || [];
        return list
            .filter((row) => (organizer ? true : row.response === 'going' && row.current))
            .map((row) => this.mapRosterRow(item, row));
    },

    /** 参与者只看自己那一条：完整名单只给组织者 */
    buildMyRoster(item) {
        return (item.roster || []).map((row) => this.mapRosterRow(item, row));
    },

    mapRosterRow(item, row) {
        const names = String(row.scene_ids || '')
            .split(',')
            .filter(Boolean)
            .map((id) => {
                const hit = (item.scenes || []).filter((s) => s.id === id)[0];
                return hit ? hit.name : '';
            })
            .filter(Boolean);
        return {
            id: row.id,
            userName: row.user_name || '朋友',
            initial: String(row.user_name || '朋').slice(0, 1),
            response: row.response,
            responseText: RESPONSE_TEXT[row.response] || '',
            stale: row.response === 'going' && !row.current,
            peopleText: row.response === 'going' ? row.people + ' 人' : '',
            sceneText: names.join('、'),
            notes: row.notes || '',
            isMe: row.is_me === true,
        };
    },

    /** 还没到报名阶段时，名单就是「谁在这个活动里」 */
    buildMemberRoster() {
        return (this.data.members || []).map((m) => ({
            id: m.id,
            userName: m.user_name || '朋友',
            initial: String(m.user_name || '朋').slice(0, 1),
            response: 'member',
            responseText: m.role === 'organizer' ? '发起人' : '已加入',
            stale: false,
            peopleText: '',
            sceneText: '',
            notes: '',
            isMe: false,
        }));
    },

    buildNextStep(item, card) {
        const phase = item.phase || 'collect';
        const vote = item.vote || {};
        if (phase === 'collect') {
            return {
                primary: '公布时间和地点',
                primaryAction: 'arrange',
                secondary: '让大家投票选',
                secondaryAction: 'vote',
                tip: '想直接定下来就公布安排；拿不准就发起投票。',
            };
        }
        if (phase === 'vote') {
            if (vote.status === 'open') {
                return {
                    primary: '结束投票，公布安排',
                    primaryAction: 'arrange',
                    secondary: '看投票情况',
                    secondaryAction: 'vote',
                    tip: '投票有 ' + (vote.voters || 0) + ' 人参与，随时可以先定下来。',
                };
            }
            return {
                primary: '公布最终安排',
                primaryAction: 'arrange',
                secondary: '重新开一次投票',
                secondaryAction: 'vote',
                tip: '安排公布后，大家就能确认参加了。',
            };
        }
        if (phase === 'signup') {
            return {
                primary: '分享邀请给朋友',
                primaryAction: 'share',
                secondary: '修改安排',
                secondaryAction: 'arrange',
                tip: (item.counts && item.counts.confirmed ? item.counts.confirmed : 0) + ' 户已确认，' +
                    (item.counts && item.counts.confirmed_people ? item.counts.confirmed_people : 0) + ' 人要来。',
                showSecondary: true,
            };
        }
        return {
            primary: '去结算',
            primaryAction: 'settle',
            secondary: '再看名单',
            secondaryAction: 'roster',
            tip: '活动结束了，需要分摊费用的话再记一笔。',
        };
    },

    // ===== 表单交互 =====
    pickOption(event) {
        const value = event.currentTarget.dataset.value;
        this.setData({
            pick: value,
            dirty: value !== this.data.saved,
            saveError: '',
        });
    },

    toggleExtra() {
        this.setData({ extraOpen: !this.data.extraOpen });
    },

    onInput(event) {
        const field = event.currentTarget.dataset.field;
        this.setData({ [field]: event.detail.value, dirty: true });
    },

    stepPeople(event) {
        const delta = Number(event.currentTarget.dataset.delta) || 0;
        const next = Math.max(1, Math.min(20, this.data.people + delta));
        this.setData({ people: next, dirty: true });
    },

    toggleScene(event) {
        const id = event.currentTarget.dataset.id;
        const sceneIds = this.data.sceneIds.slice();
        const index = sceneIds.indexOf(id);
        if (index === -1) sceneIds.push(id);
        else sceneIds.splice(index, 1);
        const scenes = this.data.scenes.map((s) => ({ id: s.id, name: s.name, meta: s.meta, checked: sceneIds.indexOf(s.id) !== -1 }));
        this.setData({ sceneIds, scenes, dirty: true });
    },

    editAgain() {
        const card = this.data.card;
        this.setData({
            editing: true,
            formVisible: true,
            extraOpen: card.kind === 'confirmed' || card.kind === 'intent-done',
        });
    },

    async submitTask() {
        if (this.data.saving) return;
        const pick = this.data.pick;
        if (!pick) {
            this.setData({ saveError: '先选一个，再点下面的按钮' });
            return;
        }
        if (!party.getUserName()) {
            this.pendingSubmit = true;
            this.setData({ showName: true, nameInput: '' });
            return;
        }

        this.setData({ saving: true, saveError: '' });
        const id = this.data.id;
        let res;
        if (this.data.isIntent) {
            res = await api.saveIntent({
                activityId: id,
                response: pick,
                availableTime: this.data.availableTime,
                placeWish: this.data.placeWish,
                notes: this.data.notes,
            });
        } else {
            const sceneIds = this.data.sceneIds.join(',');
            res = await api.saveRegistration({
                activityId: id,
                response: pick,
                people: this.data.people,
                sceneIds,
                notes: this.data.notes,
            });
        }

        if (res.error) {
            // 失败时保留已经选好的内容，只提示，不清空
            this.setData({ saving: false, saveError: res.error });
            return;
        }

        this.pendingSubmit = false;
        await this.load(true);
        this.setData({ saving: false, savedFlash: '已保存', dirty: false, editing: false });
        wx.showToast({ title: '已保存', icon: 'success', duration: 1500 });
        setTimeout(() => this.setData({ savedFlash: '' }), 2600);
    },

    async cancelMy() {
        const confirm = await new Promise((resolve) => {
            wx.showModal({
                title: '取消报名',
                content: '取消后名单里不会再有你，之后还能重新报名。',
                confirmText: '取消报名',
                confirmColor: '#D7263D',
                success: (r) => resolve(r.confirm),
                fail: () => resolve(false),
            });
        });
        if (!confirm) return;

        this.setData({ saving: true, saveError: '' });
        const res = await api.cancelRegistration(this.data.id);
        if (res.error) {
            this.setData({ saving: false, saveError: res.error });
            return;
        }
        await this.load(true);
        this.setData({ saving: false });
        wx.showToast({ title: '已取消报名', icon: 'none' });
    },

    // ===== 跳转 =====
    goVote() {
        wx.navigateTo({ url: '/pages/vote/vote?id=' + this.data.id });
    },

    goArrange() {
        wx.navigateTo({ url: '/pages/arrange/arrange?id=' + this.data.id });
    },

    goSettle() {
        wx.navigateTo({ url: '/pages/settle/settle?id=' + this.data.id });
    },

    runNext() {
        const step = this.data.nextStep;
        if (!step) return;
        if (step.primaryAction === 'arrange') this.goArrange();
        else if (step.primaryAction === 'vote') this.goVote();
        else if (step.primaryAction === 'settle') this.goSettle();
        else if (step.primaryAction === 'roster') this.setData({ rosterOpen: true });
    },

    runSecondary() {
        const step = this.data.nextStep;
        if (!step) return;
        if (step.secondaryAction === 'arrange') this.goArrange();
        else if (step.secondaryAction === 'vote') this.goVote();
        else if (step.secondaryAction === 'roster') this.setData({ rosterOpen: true });
    },

    toggleRoster() {
        this.setData({ rosterOpen: !this.data.rosterOpen });
    },

    toggleResponses() {
        this.setData({ responsesOpen: !this.data.responsesOpen });
    },

    // ===== 成员 =====
    async loadMembers() {
        const res = await api.getMembers(this.data.id);
        if (res.error) return;
        const withInitial = (list) => (list || []).map((item) => Object.assign({}, item, {
            initial: String(item.user_name || '朋').slice(0, 1),
        }));
        const members = withInitial(res.data.members);
        const patch = {
            members,
            pending: withInitial(res.data.pending),
            memberCount: (res.data.members || []).length,
            pendingCount: (res.data.pending || []).length,
        };
        const phase = this.data.a && this.data.a.phase;
        // 名单只给组织者，参与者自己的那条由 render 单独给出
        if (this.data.organizer && (phase === 'collect' || phase === 'vote')) {
            patch.roster = members.map((m) => ({
                id: m.id,
                userName: m.user_name || '朋友',
                initial: m.initial,
                response: 'member',
                responseText: m.role === 'organizer' ? '发起人' : '已加入',
                stale: false,
                peopleText: '',
                sceneText: '',
                notes: '',
                isMe: false,
            }));
        }
        this.setData(patch);
    },

    async loadInvite() {
        const token = await api.getInviteToken(this.data.id);
        if (!token.error) this.setData({ shareInvite: token.data || '' });
    },

    openMembers() {
        this.setData({ showMembers: true });
        this.loadMembers();
    },

    closeMembers() {
        this.setData({ showMembers: false });
    },

    async review(event) {
        const memberId = event.currentTarget.dataset.id;
        const action = event.currentTarget.dataset.action;
        if (!memberId || !action || this.data.reviewing) return;
        this.setData({ reviewing: true });
        const res = await api.reviewMember(this.data.id, memberId, action);
        this.setData({ reviewing: false });
        if (res.error) {
            meta.toast(res.error);
            return;
        }
        meta.toast(action === 'approve' ? '已通过' : action === 'remove' ? '已移出' : '已拒绝');
        this.loadMembers();
        this.load(true);
    },

    // ===== 申请加入 =====
    async applyJoin() {
        if (!party.getUserName()) {
            this.pendingJoin = true;
            this.setData({ showName: true, nameInput: '' });
            return;
        }
        this.setData({ joining: true });
        const res = await api.joinActivity(this.data.id, null);
        this.setData({ joining: false });
        if (res.error) {
            meta.toast(res.error);
            return;
        }
        await this.load(true);
        if (this.data.gate === 'pending') meta.toast('申请已发出，等发起人通过');
    },

    // ===== 昵称 =====
    openName() {
        this.setData({ showName: true, nameInput: party.getUserName() });
    },

    closeName() {
        this.setData({ showName: false });
    },

    onNameInput(event) {
        this.setData({ nameInput: event.detail.value });
    },

    onChooseAvatar(event) {
        const url = event.detail && event.detail.avatarUrl;
        if (url) party.setAvatar(url);
    },

    async saveName() {
        const name = String(this.data.nameInput || '').trim();
        if (!name) {
            meta.toast('先填个称呼，朋友才知道是谁');
            return;
        }
        party.setUserName(name);
        this.setData({ showName: false });
        if (this.data.gate === 'member') {
            await api.joinActivity(this.data.id, null);
            await this.load(true);
            if (this.pendingSubmit) {
                this.pendingSubmit = false;
                this.submitTask();
            }
        } else if (this.pendingJoin) {
            this.pendingJoin = false;
            this.applyJoin();
        }
    },

    // ===== 管理设置 =====
    openManage() {
        this.setData({ showManage: true });
    },

    closeManage() {
        this.setData({ showManage: false });
    },

    async hideMine() {
        const confirm = await new Promise((resolve) => {
            wx.showModal({
                title: '从我的列表隐藏',
                content: '只是你自己看不到，报名和名单都不变。朋友的页面照常显示。',
                confirmText: '隐藏',
                success: (r) => resolve(r.confirm),
                fail: () => resolve(false),
            });
        });
        if (!confirm) return;
        const res = await api.setHidden(this.data.id, true);
        if (res.error) {
            meta.toast(res.error);
            return;
        }
        this.setData({ showManage: false });
        meta.toast('已隐藏，报名不受影响');
        setTimeout(() => wx.reLaunch({ url: '/pages/index/index' }), 800);
    },

    async archive() {
        const confirm = await new Promise((resolve) => {
            wx.showModal({
                title: '归档活动',
                content: '归档后不出现在列表里，数据和报名都还在。',
                success: (r) => resolve(r.confirm),
                fail: () => resolve(false),
            });
        });
        if (!confirm) return;
        const res = await api.admin(this.data.id, 'archive', {});
        if (res.error) {
            meta.toast(res.error);
            return;
        }
        meta.toast('已归档');
        setTimeout(() => wx.reLaunch({ url: '/pages/index/index' }), 800);
    },

    async removeActivity() {
        const confirm = await new Promise((resolve) => {
            wx.showModal({
                title: '删除活动',
                content: '删除后活动、回应、投票、报名和账单都会消失，无法恢复。',
                confirmText: '删除',
                confirmColor: '#D7263D',
                success: (r) => resolve(r.confirm),
                fail: () => resolve(false),
            });
        });
        if (!confirm) return;
        const res = await api.admin(this.data.id, 'delete', {});
        if (res.error) {
            meta.toast(res.error);
            return;
        }
        meta.toast('已删除');
        setTimeout(() => wx.reLaunch({ url: '/pages/index/index' }), 800);
    },

    async finishActivity() {
        const confirm = await new Promise((resolve) => {
            wx.showModal({
                title: '结束活动',
                content: '结束后会关掉报名，已确认的名单会保留。',
                success: (r) => resolve(r.confirm),
                fail: () => resolve(false),
            });
        });
        if (!confirm) return;
        const res = await api.setPhase(this.data.id, 'closed');
        if (res.error) {
            meta.toast(res.error);
            return;
        }
        this.setData({ showManage: false });
        this.load(true);
    },

    // ===== 其他 =====
    refresh() {
        this.load(true);
    },

    copyInvite() {
        const a = this.data.a;
        if (!a) return;
        const when = a.timeText ? a.timeText + (a.place ? '，' + a.place : '') : '时间地点还在商量';
        const text = '【' + a.title + '】' + when + '。点开小程序看看，' + (a.phase === 'signup' ? '顺便告诉我你来不来。' : '有兴趣就回我一声。');
        meta.copy(text, '邀请文案已复制');
    },

    backHome() {
        wx.reLaunch({ url: '/pages/index/index' });
    },

    onShareAppMessage() {
        const a = this.data.a;
        return {
            title: meta.shareTitle(a),
            path: meta.sharePath(this.data.id, this.data.shareInvite),
        };
    },

    onShareTimeline() {
        return { title: meta.shareTitle(this.data.a) };
    },
});
