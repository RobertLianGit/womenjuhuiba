import { View, Text, Button, ScrollView } from '@tarojs/components'
import { useState, useEffect } from 'react'
import { useRouter, useDidShow } from '@tarojs/taro'
import { request } from '../../../utils/api'
import { API } from '../../../config'
import { getUUID } from '../../../utils/uuid'
import StatusBadge from '../../../components/StatusBadge'
import { useUser } from '../../../hooks/useUser'
import './index.scss'

export default () => {
  const router = useRouter()
  const { user } = useUser()
  const [activity, setActivity] = useState<any>(null)
  const [role, setRole] = useState<'creator' | 'participant' | null>(null)
  const [loading, setLoading] = useState(true)

  useDidShow(() => {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1] as any
    const { id } = currentPage.options || {}
    if (id) loadActivity(id)
  })

  const loadActivity = async (id: string) => {
    setLoading(true)
    const res = await request<any>(API.activity, { action: 'get', id })
    if (res.success && res.data) {
      setActivity(res.data)
      const uuid = getUUID()
      setRole(res.data.creator_id === uuid ? 'creator' : 'participant')
    }
    setLoading(false)
  }

  if (loading || !activity) {
    return <View className="detail-page"><View className="loading-center">加载中...</View></View>
  }

  const { id, title, description, status, invite_token, scenes, plan_content } = activity

  const renderCreatorActions = () => {
    switch (status) {
      case 'created':
        return (
          <View className="action-card">
            <Text className="action-title">🎯 发起意愿收集</Text>
            <Text className="action-desc">让朋友们表达参与意愿，收集想去哪、人数等信息</Text>
            <Button
              className="btn-primary"
              onClick={() => router.navigateTo({ url: `/pages/activity/intention/index?id=${id}` })}
            >
              发起意愿收集
            </Button>
          </View>
        )

      case 'intention':
        return (
          <>
            <View className="action-card">
              <Text className="action-title">📊 意愿汇总</Text>
              <Text className="action-desc">查看已表态人数和汇总结果</Text>
              <Button
                className="btn-secondary"
                onClick={() => router.navigateTo({ url: `/pages/activity/intention-summary/index?id=${id}` })}
              >
                查看汇总
              </Button>
            </View>
            <View className="action-card">
              <Text className="action-title">🗳️ 发起投票（可选）</Text>
              <Text className="action-desc">汇总意愿后，可以跳过投票直接确认方案，或发起投票让朋友选择</Text>
              <Button
                className="btn-primary"
                onClick={() => router.navigateTo({ url: `/pages/activity/vote/index?id=${id}` })}
              >
                发起投票
              </Button>
              <Button
                className="btn-link"
                onClick={() => router.navigateTo({ url: `/pages/activity/plan/index?id=${id}` })}
              >
                跳过投票，直接确认方案 →
              </Button>
            </View>
          </>
        )

      case 'voting':
        return (
          <>
            <View className="action-card">
              <Text className="action-title">📊 投票结果</Text>
              <Text className="action-desc">等待朋友投票，结束后确认最终方案</Text>
              <Button
                className="btn-secondary"
                onClick={() => router.navigateTo({ url: `/pages/activity/vote/index?id=${id}` })}
              >
                查看投票
              </Button>
            </View>
            <View className="action-card">
              <Text className="action-title">📝 确认方案</Text>
              <Button
                className="btn-primary"
                onClick={() => router.navigateTo({ url: `/pages/activity/plan/index?id=${id}` })}
              >
                进入方案确认
              </Button>
            </View>
          </>
        )

      case 'plan_confirmed':
        return (
          <>
            {plan_content && (
              <View className="plan-preview">
                <Text className="plan-title">📋 活动方案</Text>
                <Text className="plan-content">{plan_content}</Text>
              </View>
            )}
            <View className="action-card">
              <Text className="action-title">📝 开启报名</Text>
              <Text className="action-desc">确认方案后，开启报名让朋友正式报名</Text>
              <Button
                className="btn-primary"
                onClick={async () => {
                  await request(API.activity, { action: 'update', id, status: 'registering' })
                  loadActivity(id)
                }}
              >
                开启报名
              </Button>
            </View>
          </>
        )

      case 'registering':
        return (
          <>
            <View className="action-card">
              <Text className="action-title">📋 活动方案</Text>
              <Text className="action-desc">{plan_content || '暂无方案内容'}</Text>
              <Button
                className="btn-secondary"
                onClick={() => router.navigateTo({ url: `/pages/activity/plan/index?id=${id}` })}
              >
                查看/编辑方案
              </Button>
            </View>
            <View className="action-card">
              <Text className="action-title">📊 实时看板</Text>
              <Text className="action-desc">查看报名情况，手动管理参与人</Text>
              <Button
                className="btn-primary"
                onClick={() => router.navigateTo({ url: `/pages/activity/board/index?id=${id}` })}
              >
                查看看板
              </Button>
            </View>
            <View className="action-card">
              <Text className="action-title">💰 记账结算</Text>
              <Text className="action-desc">活动结束后，结算费用分摊</Text>
              <Button
                className="btn-primary"
                onClick={() => router.navigateTo({ url: `/pages/activity/settle/index?id=${id}` })}
              >
                去结算
              </Button>
            </View>
          </>
        )

      case 'ongoing':
        return (
          <View className="action-card">
            <Text className="action-title">💰 记账结算</Text>
            <Button
              className="btn-primary"
              onClick={() => router.navigateTo({ url: `/pages/activity/settle/index?id=${id}` })}
            >
              去结算
            </Button>
          </View>
        )

      case 'settled':
        return (
          <View className="action-card">
            <Text className="action-title">✅ 已结算</Text>
            <Text className="action-desc">活动已完成结算</Text>
            <Button
              className="btn-secondary"
              onClick={() => router.navigateTo({ url: `/pages/activity/settle/index?id=${id}` })}
            >
              查看结算结果
            </Button>
          </View>
        )

      default:
        return null
    }
  }

  const renderParticipantActions = () => {
    switch (status) {
      case 'created':
        return (
          <View className="action-card">
            <Text className="action-title">⏳ 等待发起者开启意愿收集</Text>
            <Text className="action-desc">发起者尚未开始意愿收集，请稍后再来看看</Text>
          </View>
        )

      case 'intention':
        return (
          <View className="action-card">
            <Text className="action-title">🎯 填写你的意愿</Text>
            <Text className="action-desc">告诉发起者你想不想参加、想去哪</Text>
            <Button
              className="btn-primary"
              onClick={() => router.navigateTo({ url: `/pages/activity/intention/index?id=${id}` })}
            >
              去填写
            </Button>
          </View>
        )

      case 'voting':
        return (
          <View className="action-card">
            <Text className="action-title">🗳️ 去投票</Text>
            <Text className="action-desc">参与投票，选择你喜欢的方案</Text>
            <Button
              className="btn-primary"
              onClick={() => router.navigateTo({ url: `/pages/activity/vote/index?id=${id}` })}
            >
              去投票
            </Button>
          </View>
        )

      case 'plan_confirmed':
      case 'registering':
        return (
          <>
            <View className="action-card">
              <Text className="action-title">📋 查看活动方案</Text>
              <Text className="plan-content">{plan_content || '暂无方案内容'}</Text>
            </View>
            {status === 'registering' && (
              <View className="action-card">
                <Text className="action-title">📝 正式报名</Text>
                <Text className="action-desc">选择你要参与哪几段</Text>
                <Button
                  className="btn-primary"
                  onClick={() => router.navigateTo({ url: `/pages/activity/register/index?id=${id}` })}
                >
                  去报名
                </Button>
              </View>
            )}
          </>
        )

      default:
        return (
          <View className="action-card">
            <Text className="action-title">暂无需要操作的内容</Text>
          </View>
        )
    }
  }

  return (
    <ScrollView className="detail-page" scrollY>
      {/* 活动基本信息 */}
      <View className="activity-header">
        <View className="header-top">
          <Text className="title">{title}</Text>
          <StatusBadge status={status} />
        </View>
        {description && <Text className="desc">{description}</Text>}
      </View>

      {/* 分享邀请 */}
      <View className="share-card">
        <Text className="share-title">🔗 邀请链接</Text>
        <Text className="invite-token">邀请码：{invite_token}</Text>
        <Button
          className="btn-copy"
          onClick={() => {
            const url = `${window.location.origin}${window.location.pathname}#/pages/join/index?activityId=${id}&token=${invite_token}`
            navigator.clipboard?.writeText(url)
          }}
        >
          复制邀请链接
        </Button>
      </View>

      {/* 分段信息 */}
      {scenes && scenes.length > 0 && (
        <View className="scenes-card">
          <Text className="scenes-title">📅 活动分段</Text>
          <View className="scenes-list">
            {scenes.map((scene: string) => (
              <View key={scene} className="scene-tag">{scene}</View>
            ))}
          </View>
        </View>
      )}

      {/* 动态操作区 */}
      <View className="actions">
        {role === 'creator' ? renderCreatorActions() : renderParticipantActions()}
      </View>
    </ScrollView>
  )
}
