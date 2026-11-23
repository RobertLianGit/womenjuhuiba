const api = require('../../utils/api');
const party = require('../../utils/party');
const meta = require('../../utils/meta');

Page({
    data: {
        id: '',
        loading: true,
        errorMsg: '',
        organizer: false,

        title: '',
        phase: '',
        version: 0,
        staleCount: 0,
        confirmedCount: 0,

        form: {
            timeText: '',
            place: '',
            costNote: '',
            extraNote: '',
        },
        saving: false,
        saveError: '',
        published: false,
        changedCount: 0,

        scenes: [],
        showScene: false,
        sceneForm: { id: '', name: '', timeRange: '', location: '' },
        sceneSaving: false,
        sceneError: '',
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

    async load() {
        this.setData({ loading: true, errorMsg: '' });
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
        if (!organizer) {
            this.setData({ loading: false, errorMsg: '只有发起人能改安排' });
            return;
        }

        this.setData({
            loading: false,
            organizer,
            title: a.title,
            phase: a.phase,
            version: a.arrangement_version || 0,
            staleCount: (a.counts && a.counts.stale) || 0,
            confirmedCount: (a.counts && a.counts.confirmed) || 0,
            form: {
                timeText: a.time_text || '',
                place: a.place || '',
                costNote: a.cost_note || '',
                extraNote: a.extra_note || '',
            },
            scenes: a.scenes || [],
        });
    },

    onInput(event) {
        const field = event.currentTarget.dataset.field;
        this.setData({ ['form.' + field]: event.detail.value, saveError: '' });
    },

    async publish() {
        if (this.data.saving) return;
        const form = this.data.form;
        if (!String(form.timeText || '').trim()) {
            this.setData({ saveError: '时间一定要填，朋友要按这个安排来' });
            return;
        }

        this.setData({ saving: true, saveError: '' });
        const res = await api.publishArrange({
            activityId: this.data.id,
            timeText: String(form.timeText || '').trim(),
            place: String(form.place || '').trim(),
            costNote: String(form.costNote || '').trim(),
            extraNote: String(form.extraNote || '').trim(),
        });
        if (res.error) {
            this.setData({ saving: false, saveError: res.error });
            return;
        }

        const changed = res.data.changed === true;
        await this.load();
        this.setData({
            saving: false,
            published: true,
            changedCount: changed ? this.data.staleCount : 0,
        });

        if (changed) {
            wx.showModal({
                title: '安排已更新',
                content: this.data.staleCount > 0
                    ? '有 ' + this.data.staleCount + ' 人需要重新确认。他们下次打开活动会看到变化对比。'
                    : '这次改动会让已确认的人重新确认一次。',
                showCancel: false,
                confirmText: '知道了',
            });
        } else {
            wx.showToast({ title: '已公布', icon: 'success' });
        }
    },

    // ===== 环节 =====
    addScene() {
        this.setData({
            showScene: true,
            sceneError: '',
            sceneForm: { id: '', name: '', timeRange: '', location: '' },
        });
    },

    editScene(event) {
        const id = event.currentTarget.dataset.id;
        const scene = this.data.scenes.filter((s) => s.id === id)[0];
        if (!scene) return;
        this.setData({
            showScene: true,
            sceneError: '',
            sceneForm: {
                id: scene.id,
                name: scene.name || '',
                timeRange: scene.time_range || '',
                location: scene.location || '',
            },
        });
    },

    closeScene() {
        this.setData({ showScene: false });
    },

    onSceneInput(event) {
        const field = event.currentTarget.dataset.field;
        this.setData({ ['sceneForm.' + field]: event.detail.value, sceneError: '' });
    },

    async saveScene() {
        const form = this.data.sceneForm;
        const name = String(form.name || '').trim();
        if (!name) {
            this.setData({ sceneError: '给这个环节起个名字，比如「晚饭」' });
            return;
        }
        this.setData({ sceneSaving: true, sceneError: '' });
        const res = await api.admin(this.data.id, 'scene_save', {
            id: form.id || party.newId(),
            name,
            time_range: String(form.timeRange || '').trim() || null,
            location: String(form.location || '').trim() || null,
            sort_order: this.data.scenes.length,
        });
        this.setData({ sceneSaving: false });
        if (res.error) {
            this.setData({ sceneError: res.error });
            return;
        }
        this.setData({ showScene: false });
        await this.load();
    },

    async deleteScene(event) {
        const id = event.currentTarget.dataset.id;
        const confirm = await new Promise((resolve) => {
            wx.showModal({
                title: '删掉这个环节',
                content: '已经选了它的人会变成全程参加。',
                success: (r) => resolve(r.confirm),
                fail: () => resolve(false),
            });
        });
        if (!confirm) return;
        const res = await api.admin(this.data.id, 'scene_delete', { id });
        if (res.error) {
            meta.toast(res.error);
            return;
        }
        await this.load();
    },

    goActivity() {
        wx.navigateBack({ delta: 1 });
    },

    onShareAppMessage() {
        const form = this.data.form;
        const when = [form.timeText, form.place].filter(Boolean).join('，');
        return {
            title: (this.data.title || '聚会') + '｜安排定了：' + when + '，点进来告诉我你来不来',
            path: '/pages/activity/activity?id=' + this.data.id,
        };
    },
});
