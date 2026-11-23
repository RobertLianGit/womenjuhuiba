const party = require('./utils/party');

App({
    globalData: {
        appName: '报名助手 LBB',
    },

    onLaunch() {
        // 静默取身份：有缓存会话就直接用，否则 wx.login 换 openid，都失败才降级本机身份
        this.identityReady = party.identify();
    },

    onShow() {
        if (!this.identityReady) {
            this.identityReady = party.identify();
        }
    },

    /** 页面在拿数据前等这一步，确保 user_id 已经就绪 */
    ensureIdentity(force) {
        if (force) {
            this.identityReady = party.identify(true);
        } else if (!this.identityReady) {
            this.identityReady = party.identify();
        }
        return this.identityReady;
    },
});
