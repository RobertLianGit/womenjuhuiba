// 用户身份：优先用微信原生登录（wx.login → 云端换 uid），拿不到时降级为本机身份。
// 活动权限（发起人 / 成员 / 待审批）由服务端按 user_id 判定，不再有口令。

const { cloud } = require('./cloud');

const KEY_USER_ID = 'party_uid';
const KEY_USER_NAME = 'party_nick';
const KEY_AVATAR = 'party_avatar';
const KEY_WECHAT = 'party_wechat';
const KEY_ROLE_PREFIX = 'party_role_';

// touristappid 是微信开发者工具的游客模式，拿不到可用身份，直接走本机身份
const TOURIST_APPID = 'touristappid';

let identity = null;
let inflight = null;
// 最近一次微信登录失败的原因，供界面「点一下重试」时直接告诉用户卡在哪
let lastWechatError = '';

function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/** 生成 32 位无横线 id，作为各表主键 */
function newId() {
    return uuid().replace(/-/g, '');
}

function getAppId() {
    try {
        const info = wx.getAccountInfoSync && wx.getAccountInfoSync();
        return (info && info.miniProgram && info.miniProgram.appId) || '';
    } catch (e) {
        return '';
    }
}

function getUserId() {
    if (identity && identity.userId) return identity.userId;
    return wx.getStorageSync(KEY_USER_ID) || '';
}

function getUserName() {
    if (identity && identity.name) return identity.name;
    return wx.getStorageSync(KEY_USER_NAME) || '';
}

function getAvatar() {
    if (identity && identity.avatar) return identity.avatar;
    return wx.getStorageSync(KEY_AVATAR) || '';
}

function isWechatUser() {
    if (identity) return identity.wechat === true;
    return wx.getStorageSync(KEY_WECHAT) === true;
}

function setUserName(name) {
    const value = String(name || '').trim();
    wx.setStorageSync(KEY_USER_NAME, value);
    if (identity) identity.name = value;
}

function setAvatar(url) {
    const value = String(url || '').trim();
    wx.setStorageSync(KEY_AVATAR, value);
    if (identity) identity.avatar = value;
}

function commit(userId, wechat, name, avatar) {
    wx.setStorageSync(KEY_USER_ID, userId);
    wx.setStorageSync(KEY_WECHAT, wechat === true);
    identity = {
        userId: userId,
        wechat: wechat === true,
        name: name || '',
        avatar: avatar || '',
    };
    return identity;
}

function localIdentity() {
    let id = wx.getStorageSync(KEY_USER_ID);
    if (!id || id.indexOf('local_') !== 0) {
        id = 'local_' + newId();
    }
    return commit(id, false, getUserName(), getAvatar());
}

function restoreSession() {
    return new Promise((resolve) => {
        if (!cloud || !cloud.auth || typeof cloud.auth.getSession !== 'function') {
            resolve(null);
            return;
        }
        let done = false;
        const finish = (value) => {
            if (done) return;
            done = true;
            resolve(value);
        };
        // 会话恢复失败不应该卡住首屏
        setTimeout(() => finish(null), 4000);
        try {
            Promise.resolve(cloud.auth.getSession())
                .then((res) => {
                    if (res && !res.error && res.data && res.data.user && res.data.user.id) {
                        finish({
                            userId: res.data.user.id,
                            name: res.data.user.name || '',
                            avatar: res.data.user.avatarUrl || '',
                        });
                        return;
                    }
                    finish(null);
                })
                .catch(() => finish(null));
        } catch (e) {
            finish(null);
        }
    });
}

function wxLogin() {
    return new Promise((resolve, reject) => {
        wx.login({
            success(res) {
                if (res && res.code) resolve(res.code);
                else reject(new Error('wx.login 未返回 code'));
            },
            fail(err) {
                reject(new Error((err && err.errMsg) || 'wx.login 失败'));
            },
        });
    });
}

async function exchangeWechat() {
    const appid = getAppId();
    if (!appid || appid === TOURIST_APPID) {
        lastWechatError = '工程里没有真实的 AppID';
        return null;
    }
    try {
        const code = await wxLogin();
        const res = await cloud.auth.signInWithWechat(code, appid);
        if (res && !res.error && res.data && res.data.user && res.data.user.id) {
            lastWechatError = '';
            return res.data.user;
        }
        const err = res && res.error;
        lastWechatError = (err && (err.description || err.message)) || 'empty session';
        console.warn('[party] 微信登录未接通', JSON.stringify({
            stage: 'signInWithWechat',
            message: lastWechatError,
        }));
        return null;
    } catch (e) {
        lastWechatError = (e && e.message) || 'unknown';
        console.warn('[party] 微信登录失败', JSON.stringify({
            stage: 'exchangeWechat',
            message: lastWechatError,
        }));
        return null;
    }
}

async function runIdentify() {
    const cachedName = getUserName();
    const cachedAvatar = getAvatar();

    const existed = await restoreSession();
    if (existed) {
        return commit(existed.userId, true, existed.name || cachedName, existed.avatar || cachedAvatar);
    }

    const wxUser = await exchangeWechat();
    if (wxUser) {
        // 微信只给 uid，昵称头像仍然由用户自己填
        return commit(wxUser.id, true, wxUser.name || cachedName, wxUser.avatarUrl || cachedAvatar);
    }

    return localIdentity();
}

/** 取得当前身份：静默登录，不需要用户点按钮，可重复调用 */
function identify(force) {
    if (identity && !force) return Promise.resolve(identity);
    if (inflight && !force) return inflight;
    inflight = runIdentify()
        .then((r) => {
            inflight = null;
            return r;
        })
        .catch(() => {
            inflight = null;
            return localIdentity();
        });
    return inflight;
}

/** 同步确认身份是否已就绪，避免首次渲染时 user_id 为空 */
function isReady() {
    return !!getUserId();
}

/** 最近一次微信登录失败原因，空字符串表示没出错 */
function getWechatError() {
    return lastWechatError;
}

// ===== 当前用户在该活动中的角色缓存（按活动 id，供子页面同步判断）=====
function cacheRole(activityId, role, status) {
    if (!activityId) return;
    wx.setStorageSync(KEY_ROLE_PREFIX + activityId, { role: role || 'guest', status: status || 'none' });
}

function getRole(activityId) {
    if (!activityId) return { role: 'guest', status: 'none' };
    const raw = wx.getStorageSync(KEY_ROLE_PREFIX + activityId);
    if (raw && raw.role) return raw;
    return { role: 'guest', status: 'none' };
}

function isOrganizer(activityId) {
    return getRole(activityId).role === 'organizer';
}

function isApproved(activityId) {
    return getRole(activityId).status === 'approved';
}

module.exports = {
    newId,
    identify,
    isReady,
    getUserId,
    getUserName,
    setUserName,
    getAvatar,
    setAvatar,
    isWechatUser,
    getWechatError,
    cacheRole,
    getRole,
    isOrganizer,
    isApproved,
    getAppId,
};
