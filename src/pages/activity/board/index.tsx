import { View, Text, Input, Button } from '@tarojs/components'
import { useState } from 'react'
import { useDidShow } from '@tarojs/taro'
import { request } from '../../../utils/api'
import { API } from '../../../config'
import Empty from '../../../components/Empty'
import './index.scss'

export default () => {
  const [activityId, setActivityId] = useState('')
  const [participants, setParticipants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [addName, setAddName] = useState('')
  const [addCount, setAddCount] = useState(1)

  useDidShow(() => {
    const pages = getCurrentPages()
    const current = pages[pages.length - 1] as any
    const { id } = current.options || {}
    if (id) {
      setActivityId(id)
      loadParticipants(id)
    }
  })

  const loadParticipants = async (id: string) => {
    setLoading(true)
    const res = await request<any[]>(API.activity, { action: 'get_participants', activity_id: id })
    if (res.success) {
      setParticipants(res.data || [])
    }
    setLoading(false)
  }

  const addParticipant = async () => {
    if (!addName.trim()) return
    await request(API.activity, {
      action: 'add_participant',
      activity_id: activityId,
      display_name: addName.trim(),
      people_count: addCount,
      is_temp: true,
    })
    setAddName('')
    setAddCount(1)
    loadParticipants(activityId)
  }

  const removeParticipant = async (id: string) => {
    await request(API.activity, { action: 'remove_participant', activity_id: activityId, participant_id: id })
    loadParticipants(activityId)
  }

  const copyList = () => {
    const text = participants.map((p) => `${p.display_name} (${p.people_count || 1}人)${p.is_temp ? ' [临]' : ''}`).join('\n')
    navigator.clipboard?.writeText(text)
  }

  if (!activityId) return null

  // 按分段分组
  const grouped: Record<string, any[]> = {}
  for (const p of participants) {
    const key = p.scene_name || '未分段'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(p)
  }

  const totalPeople = participants.reduce((sum, p) => sum + (p.people_count || 1), 0)

  return (
    <View className="board-page">
      {/* 概览 */}
      <View className="overview">
        <View className="stat">
          <Text className="stat-num">{participants.length}</Text>
          <Text className="stat-label">报名人数</Text>
        </View>
        <View className="stat">
          <Text className="stat-num">{totalPeople}</Text>
          <Text className="stat-label">总人数</Text>
        </View>
        <Button className="btn-copy-list" onClick={copyList}>复制名单</Button>
      </View>

      {/* 分段看板 */}
      {loading ? (
        <View className="loading">加载中...</View>
      ) : participants.length === 0 ? (
        <Empty text="暂无报名数据" emoji="📋" />
      ) : (
        Object.entries(grouped).map(([scene, people]) => (
          <View key={scene} className="scene-section">
            <Text className="scene-title">📍 {scene}</Text>
            {people.map((p) => (
              <View key={p.id} className="person-row">
                <View className="person-info">
                  <Text className="name">{p.display_name}</Text>
                  <Text className="count">{p.people_count || 1}人</Text>
                  {p.is_temp && <Text className="temp-tag">临</Text>}
                  {p.notes && <Text className="notes">{p.notes}</Text>}
                </View>
                <Text className="remove" onClick={() => removeParticipant(p.id)}>×</Text>
              </View>
            ))}
          </View>
        ))
      )}

      {/* 手动添加 */}
      <View className="add-section">
        <Text className="section-title">➕ 手动添加参与者</Text>
        <View className="add-row">
          <Input
            className="input"
            placeholder="名字"
            value={addName}
            onInput={(e: any) => setAddName(e.detail.value)}
          />
          <View className="count-ctrl">
            <Button size="mini" onClick={() => setAddCount(Math.max(1, addCount - 1))}>-</Button>
            <Text>{addCount}</Text>
            <Button size="mini" onClick={() => setAddCount(addCount + 1)}>+</Button>
          </View>
          <Button size="mini" className="btn-add" onClick={addParticipant}>添加</Button>
        </View>
      </View>
    </View>
  )
}
