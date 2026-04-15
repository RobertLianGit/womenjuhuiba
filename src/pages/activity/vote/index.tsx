import { View, Text, Button } from '@tarojs/components'
import { useState } from 'react'
import { useDidShow } from '@tarojs/taro'
import { request } from '../../../utils/api'
import { API } from '../../../config'
import { getUUID } from '../../../utils/uuid'
import { useUser } from '../../../hooks/useUser'
import './index.scss'

export default () => {
  const { user } = useUser()
  const [activityId, setActivityId] = useState('')
  const [wantsList, setWantsList] = useState<string[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [voted, setVoted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useDidShow(() => {
    const pages = getCurrentPages()
    const current = pages[pages.length - 1] as any
    const { id } = current.options || {}
    if (id) {
      setActivityId(id)
      loadData(id)
    }
  })

  const loadData = async (id: string) => {
    setLoading(true)
    // 获取意愿汇总作为投票选项
    const res = await request<any[]>(API.intention, { action: 'list', activity_id: id })
    if (res.success) {
      const wants = res.data?.map((i) => i.wants).filter(Boolean) || []
      setWantsList(wants)

      // 检查是否已投票
      const voteRes = await request<any[]>(API.vote, { action: 'list', activity_id: id })
      const uuid = getUUID()
      const myVote = voteRes.data?.find((v) => v.user_id === uuid)
      if (myVote) {
        setSelected(myVote.voted_proposal_ids || [])
        setVoted(true)
      }
    }
    setLoading(false)
  }

  const toggleSelect = (item: string) => {
    if (voted) return
    if (selected.includes(item)) {
      setSelected(selected.filter((s) => s !== item))
    } else {
      setSelected([...selected, item])
    }
  }

  const handleSubmit = async () => {
    if (selected.length === 0) return
    setSubmitting(true)

    const uuid = getUUID()
    await request(API.vote, {
      action: 'submit',
      activity_id: activityId,
      user_id: uuid,
      voted_proposal_ids: selected,
    })

    setVoted(true)
    setSubmitting(false)
  }

  if (!activityId) return null

  if (loading) {
    return <View className="vote-page"><View className="loading">加载中...</View></View>
  }

  return (
    <View className="vote-page">
      <View className="header">
        <Text className="title">🗳️ 投票</Text>
        <Text className="subtitle">选择你喜欢的方案（可多选）</Text>
      </View>

      {wantsList.length === 0 ? (
        <View className="empty-card">
          <Text className="empty-text">暂无投票选项</Text>
          <Text className="empty-sub">发起者还未设置投票方案</Text>
        </View>
      ) : (
        <View className="options">
          {wantsList.map((item) => (
            <View
              key={item}
              className={`option ${selected.includes(item) ? 'selected' : ''}`}
              onClick={() => toggleSelect(item)}
            >
              <View className="option-check">
                {selected.includes(item) ? '✓' : ''}
              </View>
              <Text className="option-text">{item}</Text>
            </View>
          ))}
        </View>
      )}

      {wantsList.length > 0 && !voted && (
        <View className="footer">
          <Button
            className="btn-primary"
            onClick={handleSubmit}
            loading={submitting}
            disabled={selected.length === 0}
          >
            提交投票
          </Button>
        </View>
      )}

      {voted && (
        <View className="voted-msg">
          ✅ 你已投票，感谢参与！
        </View>
      )}
    </View>
  )
}
