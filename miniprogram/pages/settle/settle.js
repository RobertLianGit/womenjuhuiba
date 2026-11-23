const api = require('../../utils/api');
const party = require('../../utils/party');
const meta = require('../../utils/meta');

function money(value) {
    const num = Number(value) || 0;
    return num.toFixed(2);
}

Page({
    data: {
        id: '',
        loading: true,
        errorMsg: '',
        organizer: false,

        title: '',
        phaseLabel: '',
        bills: [],
        totalText: '0.00',
        perPersonText: '0.00',
        peopleCount: 0,
        paidCount: 0,
        allSettled: false,

        isParticipant: false,
        myPeople: 0,
        myShareText: '0.00',
        myPayTo: [],
        myReceiveText: '0.00',
        myPaid: false,
        marking: false,

        showBill: false,
        billSaving: false,
        billError: '',
        billForm: { id: '', title: '', amount: '', payerName: '' },

        finishing: false,
        message: '',
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
        if (this.data.id && !this.data.loading) this.load();
    },

    async onPullDownRefresh() {
        await this.load();
        wx.stopPullDownRefresh();
    },

    async load() {
        this.setData({ loading: true, errorMsg: '' });

        const [actRes, billRes, regRes] = await Promise.all([
            api.getActivity(this.data.id),
            api.listBills(this.data.id),
            api.listRegistrations(this.data.id),
        ]);
        if (actRes.error) {
            this.setData({ loading: false, errorMsg: actRes.error });
            return;
        }
        const a = actRes.data;
        if (!a) {
            this.setData({ loading: false, errorMsg: '活动不存在' });
            return;
        }
        if (a.my_status !== 'approved') {
            this.setData({ loading: false, errorMsg: '你还不是这个活动的成员' });
            return;
        }

        const bills = billRes.data || [];
        const version = a.arrangement_version || 0;
        // 只算「按最新安排确认过」的人，旧确认不当作新认可
        const rows = (regRes.data || []).filter((r) => r.response === 'going' && r.confirmed_version === version);
        const mine = rows.filter((r) => r.user_id === party.getUserId())[0];
        const peopleCount = rows.reduce((sum, r) => sum + (r.people_count || 1), 0);
        const myPeople = mine ? mine.people_count || 1 : 0;

        let total = 0;
        const payers = {};
        bills.forEach((row) => {
            const amount = Number(row.total_amount) || 0;
            total += amount;
            const name = row.payer_name || '未填写';
            payers[name] = (payers[name] || 0) + amount;
        });

        const perPerson = peopleCount > 0 ? total / peopleCount : 0;
        const myShare = perPerson * myPeople;
        const myName = party.getUserName();

        const myPayTo = Object.keys(payers)
            .filter((name) => name !== myName)
            .map((name) => ({ name, amountText: money(total > 0 ? (myShare * payers[name]) / total : 0) }))
            .filter((item) => Number(item.amountText) > 0);

        const myPrepaid = payers[myName] || 0;

        this.setData({
            loading: false,
            organizer: a.my_role === 'organizer',
            title: a.title,
            phaseLabel: meta.phaseOf(a.phase).label,
            bills: bills.map((row) => ({
                id: row.id,
                title: row.title || '未命名账单',
                amountText: money(row.total_amount),
                payerName: row.payer_name || '未填写',
                settled: row.is_settled === true,
            })),
            totalText: money(total),
            perPersonText: money(perPerson),
            peopleCount,
            paidCount: rows.filter((r) => r.paid === true).length,
            allSettled: bills.length > 0 && bills.every((row) => row.is_settled === true),
            isParticipant: !!mine,
            myPeople,
            myShareText: money(myShare),
            myPayTo,
            myReceiveText: money(myPrepaid - myShare > 0 ? myPrepaid - myShare : 0),
            myPaid: mine ? mine.paid === true : false,
        });
    },

    // ===== 账单 =====
    addBill() {
        this.setData({
            showBill: true,
            billError: '',
            billForm: { id: '', title: '', amount: '', payerName: party.getUserName() },
        });
    },

    editBill(event) {
        const ds = event.currentTarget.dataset;
        this.setData({
            showBill: true,
            billError: '',
            billForm: { id: ds.id, title: ds.title || '', amount: ds.amount || '', payerName: ds.payer || '' },
        });
    },

    closeBill() {
        this.setData({ showBill: false });
    },

    onBillInput(event) {
        const field = event.currentTarget.dataset.field;
        this.setData({ ['billForm.' + field]: event.detail.value, billError: '' });
    },

    async saveBill() {
        const form = this.data.billForm;
        const title = String(form.title || '').trim();
        const amount = Number(form.amount);
        if (!title) {
            this.setData({ billError: '给这笔账起个名字' });
            return;
        }
        if (isNaN(amount) || amount <= 0) {
            this.setData({ billError: '金额要大于 0' });
            return;
        }
        this.setData({ billSaving: true, billError: '' });
        const res = await api.admin(this.data.id, 'bill_save', {
            id: form.id || party.newId(),
            title,
            total_amount: amount,
            payer_name: String(form.payerName || '').trim() || null,
        });
        if (res.error) {
            this.setData({ billSaving: false, billError: res.error });
            return;
        }
        this.setData({ billSaving: false, showBill: false });
        await this.load();
    },

    async deleteBill(event) {
        const id = event.currentTarget.dataset.id;
        const confirm = await new Promise((resolve) => {
            wx.showModal({
                title: '删除账单',
                content: '删除后总额和人均都会重算。',
                success: (r) => resolve(r.confirm),
                fail: () => resolve(false),
            });
        });
        if (!confirm) return;
        const res = await api.admin(this.data.id, 'bill_delete', { id });
        if (res.error) {
            meta.toast(res.error);
            return;
        }
        await this.load();
    },

    async markPaid() {
        if (this.data.marking) return;
        const next = !this.data.myPaid;
        this.setData({ marking: true });
        const res = await api.markPaid(this.data.id, next);
        this.setData({ marking: false });
        if (res.error) {
            meta.toast(res.error);
            return;
        }
        await this.load();
        wx.showToast({ title: next ? '已记下：你转过了' : '已改回未转', icon: 'none' });
    },

    async settleAll() {
        const confirm = await new Promise((resolve) => {
            wx.showModal({
                title: '完成结算',
                content: '会把这批账单标记为已结清，并结束这场活动。',
                success: (r) => resolve(r.confirm),
                fail: () => resolve(false),
            });
        });
        if (!confirm) return;

        this.setData({ finishing: true, message: '' });
        for (let i = 0; i < this.data.bills.length; i += 1) {
            if (this.data.bills[i].settled) continue;
            await api.admin(this.data.id, 'bill_settle', { id: this.data.bills[i].id });
        }
        const res = await api.setPhase(this.data.id, 'closed');
        this.setData({ finishing: false });
        if (res.error) {
            this.setData({ message: res.error });
            return;
        }
        this.setData({ message: '已结算，人均 ' + this.data.perPersonText + ' 元' });
        await this.load();
    },

    copySummary() {
        let text = '【' + (this.data.title || '') + '】结账\n';
        text += '总支出：' + this.data.totalText + ' 元\n';
        text += '参加人数：' + this.data.peopleCount + ' 人\n';
        text += '人均：' + this.data.perPersonText + ' 元\n';
        if (this.data.myPayTo.length) {
            text += '你要转：\n';
            this.data.myPayTo.forEach((item) => {
                text += '- ' + item.name + ' ' + item.amountText + ' 元\n';
            });
        }
        meta.copy(text, '结算信息已复制');
    },

    goActivity() {
        wx.navigateBack({ delta: 1 });
    },
});
