// 数据层：活动、成员、回应、投票、报名都走服务端函数，客户端不直接写业务表。
// 统一把服务端错误码翻成朋友能看懂的话。

const { cloud } = require('./cloud');
const party = require('./party');

const NETWORK_ERROR = '网络不太好，请检查后再试一次';

const ERROR_TEXT = {
    TITLE_REQUIRED: '请填写活动名称',
    TIME_REQUIRED: '请填写聚会时间',
    IDENTITY_REQUIRED: '身份还在准备，请稍后再试',
    ACTIVITY_NOT_FOUND: '这个活动不存在或已被删除',
    NOT_MEMBER: '你还不是这个活动的成员',
    NOT_ORGANIZER: '只有发起人能操作',
    PHASE_LOCKED: '现在不是这一步，下拉刷新看看最新进展',
    NO_ARRANGEMENT: '时间地点还没公布',
    BAD_RESPONSE: '选项不对，刷新后再试',
    BAD_PHASE: '阶段不对',
    VOTE_NOT_READY: '先把投票选项准备好再开始',
    ARRANGE_REQUIRED: '先公布时间和地点，才能开放报名',
    NO_OPTIONS: '还没有投票选项',
    NOT_ENOUGH_OPTIONS: '至少要有 2 个选项才能投票',
    VOTE_LOCKED: '已经有人投票了，选项不能再改',
    VOTE_CLOSED: '投票已经结束了',
    NO_SELECTION: '先选一个再提交',
    TOO_MANY: '选多了，看看规则',
    BAD_OPTION: '选项已失效，刷新后再选',
    ID_REQUIRED: '缺少 id',
    UNKNOWN_ACTION: '这个操作不支持',
};

function fail(message) {
    return { data: null, error: message || NETWORK_ERROR };
}

function codeText(code) {
    return ERROR_TEXT[code] || '';
}

async function call(builder) {
    try {
        const res = await builder;
        if (res && res.error) return fail(res.error.message || NETWORK_ERROR);
        return { data: res ? res.data : null, error: null };
    } catch (e) {
        return fail(NETWORK_ERROR);
    }
}

/** 调服务端函数，把 ok:false 的 error 码翻成人话 */
async function rpc(name, args) {
    const res = await call(cloud.database.rpc(name, args || {}));
    if (res.error) return res;
    const data = res.data;
    if (!data || data.ok !== true) {
        const code = data && data.error;
        return fail(codeText(code) || '操作没成功，请再试一次');
    }
    return { data, error: null };
}

// ===== 活动 =====

async function createActivity(input) {
    const id = party.newId();
    const inviteToken = party.newId();
    const res = await rpc('party_create', {
        p_id: id,
        p_title: input.title,
        p_description: input.description || null,
        p_mode: input.mode === 'fixed' ? 'fixed' : 'flow',
        p_time_text: input.timeText || null,
        p_place: input.place || null,
        p_cost_note: input.costNote || null,
        p_extra_note: input.extraNote || null,
        p_creator_id: party.getUserId(),
        p_creator_name: input.creatorName || party.getUserName(),
        p_invite_token: inviteToken,
    });
    if (res.error) return res;
    return { data: { id, inviteToken, phase: res.data.phase }, error: null };
}

/** 读取活动全貌：安排、我的回应、投票、名单、统计 */
async function getActivity(id) {
    if (!id) return fail('缺少活动 id');
    const res = await rpc('party_read', { p_mode: 'id', p_key: id, p_user_id: party.getUserId() });
    if (res.error) return res;
    const item = res.data.item;
    if (item) party.cacheRole(id, item.my_role, item.my_status);
    return { data: item || null, error: null };
}

async function getMyActivities() {
    const res = await rpc('party_read', { p_mode: 'my', p_key: null, p_user_id: party.getUserId() });
    if (res.error) return res;
    const items = res.data.items || [];
    items.forEach((item) => party.cacheRole(item.id, item.my_role, item.my_status));
    return { data: items, error: null };
}

async function joinActivity(activityId, inviteToken) {
    const userId = party.getUserId();
    if (!userId) return fail('身份还在准备，请稍后再试');
    const res = await rpc('party_join', {
        p_activity_id: activityId,
        p_user_id: userId,
        p_user_name: party.getUserName() || null,
        p_avatar_url: party.getAvatar() || null,
        p_invite_token: inviteToken || null,
    });
    if (res.error) return res;
    party.cacheRole(activityId, res.data.role, res.data.status);
    return { data: res.data, error: null };
}

// ===== 成员与审批 =====

async function getMembers(activityId) {
    const res = await rpc('party_members', { p_activity_id: activityId, p_user_id: party.getUserId() });
    if (res.error) return res;
    return {
        data: {
            isOrganizer: res.data.is_organizer === true,
            members: res.data.members || [],
            pending: res.data.pending || [],
        },
        error: null,
    };
}

async function reviewMember(activityId, memberId, action) {
    return rpc('party_review', {
        p_activity_id: activityId,
        p_organizer_id: party.getUserId(),
        p_member_id: memberId,
        p_action: action,
    });
}

async function getInviteToken(activityId) {
    const res = await rpc('party_invite_token', {
        p_activity_id: activityId,
        p_organizer_id: party.getUserId(),
    });
    if (res.error) return res;
    return { data: res.data.token, error: null };
}

async function admin(activityId, action, payload) {
    return rpc('party_admin', {
        p_id: activityId,
        p_action: action,
        p_organizer_id: party.getUserId(),
        p_payload: payload || {},
    });
}

// ===== 我的回应 =====

/** 初步回应：interested / maybe / no */
async function saveIntent(input) {
    return rpc('party_intent', {
        p_activity_id: input.activityId,
        p_user_id: party.getUserId(),
        p_user_name: party.getUserName() || null,
        p_response: input.response,
        p_available_time: input.availableTime || null,
        p_place_wish: input.placeWish || null,
        p_notes: input.notes || null,
    });
}

/** 确认参加：going / maybe / no，一次写入含同行人、环节 */
async function saveRegistration(input) {
    return rpc('party_register', {
        p_activity_id: input.activityId,
        p_user_id: party.getUserId(),
        p_user_name: party.getUserName() || null,
        p_response: input.response,
        p_people: input.people || 1,
        p_scene_ids: input.sceneIds || null,
        p_notes: input.notes || null,
    });
}

async function cancelRegistration(activityId) {
    return rpc('party_cancel_registration', {
        p_activity_id: activityId,
        p_user_id: party.getUserId(),
    });
}

/** 只是从我的列表里隐藏，不影响报名 */
async function setHidden(activityId, hidden) {
    return rpc('party_hide', {
        p_activity_id: activityId,
        p_user_id: party.getUserId(),
        p_hidden: hidden !== false,
    });
}

// ===== 组织者 =====

async function publishArrange(input) {
    return rpc('party_arrange', {
        p_activity_id: input.activityId,
        p_organizer_id: party.getUserId(),
        p_time_text: input.timeText,
        p_place: input.place || null,
        p_cost_note: input.costNote || null,
        p_extra_note: input.extraNote || null,
    });
}

async function publishVote(input) {
    return rpc('party_vote_publish', {
        p_activity_id: input.activityId,
        p_organizer_id: party.getUserId(),
        p_question: input.question,
        p_vote_type: input.voteType || 'single',
        p_max_votes: input.maxVotes || 1,
        p_deadline: input.deadline || null,
        p_options: input.options || [],
    });
}

async function closeVote(activityId) {
    return rpc('party_vote_close', {
        p_activity_id: activityId,
        p_organizer_id: party.getUserId(),
    });
}

async function submitVote(activityId, ids) {
    return rpc('party_vote_submit', {
        p_activity_id: activityId,
        p_user_id: party.getUserId(),
        p_user_name: party.getUserName() || null,
        p_ids: (ids || []).join(','),
    });
}

async function propose(activityId, location, activityType) {
    return rpc('party_propose', {
        p_activity_id: activityId,
        p_user_id: party.getUserId(),
        p_user_name: party.getUserName() || null,
        p_location: location,
        p_activity_type: activityType || null,
    });
}

async function setPhase(activityId, phase) {
    return rpc('party_phase', {
        p_activity_id: activityId,
        p_organizer_id: party.getUserId(),
        p_phase: phase,
    });
}

/** 只是记一笔「我转过了」，不代表系统真的收到了钱 */
async function markPaid(activityId, paid) {
    return rpc('party_mark_paid', {
        p_activity_id: activityId,
        p_user_id: party.getUserId(),
        p_paid: paid !== false,
    });
}

// ===== 账单（直读，写走 party_admin）=====

async function listBills(activityId) {
    return call(
        cloud.database
            .from('bills')
            .select('*')
            .eq('activity_id', activityId)
            .order('created_at', { ascending: true })
    );
}

async function listRegistrations(activityId) {
    return call(cloud.database.from('registrations').select('*').eq('activity_id', activityId));
}

module.exports = {
    createActivity,
    getActivity,
    getMyActivities,
    joinActivity,
    getMembers,
    reviewMember,
    getInviteToken,
    admin,
    saveIntent,
    saveRegistration,
    cancelRegistration,
    setHidden,
    publishArrange,
    publishVote,
    closeVote,
    submitVote,
    propose,
    setPhase,
    markPaid,
    listBills,
    listRegistrations,
    codeText,
};
