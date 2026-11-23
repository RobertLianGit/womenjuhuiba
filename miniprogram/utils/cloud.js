const { createMiniProgramWorkBuddyCloud } = require('@tencent-ai/workbuddy-cloud-sdk/miniprogram');
const { createDiagnosticWx } = require('./workbuddy-cloud-diagnostics');

// publicConfig 来自云服务开通结果；endpoint 与 publishableKey 均为公开值，不含任何密钥
const publicConfig = {
    endpoint: 'https://mp-api.app.workbuddy.host',
    publishableKey: 'wbpk_dyoOq4mGFEf1O17gfo8ha7_bDoLXITYgFQR1F7sqOU5GmuD8RUoUGf4',
};

const cloud = createMiniProgramWorkBuddyCloud({
    endpoint: publicConfig.endpoint,
    publishableKey: publicConfig.publishableKey,
    wx: createDiagnosticWx(wx),
});

module.exports = { cloud, publicConfig };
