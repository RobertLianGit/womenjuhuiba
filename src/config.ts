/**
 * API 配置
 * 等腾讯云 SCF 函数 URL 配置好后，填入以下地址
 */
export const API = {
  user: 'https://service-xxxxx.gz.ap-tencentcen.com/party-user/',
  activity: 'https://service-xxxxx.gz.ap-tencentcen.com/party-activity/',
  intention: 'https://service-xxxxx.gz.ap-tencentcen.com/party-intention/',
  vote: 'https://service-xxxxx.gz.ap-tencentcen.com/party-vote/',
  settle: 'https://service-xxxxx.gz.ap-tencentcen.com/party-settle/',
}

/**
 * COS 数据存储地址（用于直接访问数据文件，可选）
 */
export const COS_DATA_BASE = 'https://party-data-xxxxx.cos.ap-guangzhou.myqcloud.com/data/'
